// Harita servisleri: anahtar deposu, karo vekili, Google telif bilgisi, yer araması.
//
// - Google ve Esri anahtarları Windows Kimlik Bilgisi Yöneticisi'nde saklanır; proje dosyasına
//   ve web görünümüne yazılmaz. Tek istisna Street View: Maps Embed API anahtarı gömme
//   adresinde ister (Google'ın bu servis için öngördüğü kullanım).
// - Bütün harita karoları `karo://` protokolüyle bu modülden geçer: anahtar burada eklenir,
//   sunuculara gerçek uygulama kimliği gönderilir, katman ve karo koordinatı doğrulanır.
// - Yalnızca resmi servisler: Google Map Tiles API, Esri ArcGIS Location Platform (World
//   Imagery), OpenStreetMap standart karoları (toplu indirme yok), Google Places API (New),
//   Nominatim (saniyede en fazla bir istek).

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::http::{header, Response, StatusCode};
use tauri::{AppHandle, Manager, Runtime, State};

const ANAHTAR_SERVISI: &str = "Paratoner Risk Analizi";
pub const KULLANICI_AJANI: &str = concat!(
    "ParatonerRiskAnalizi/",
    env!("CARGO_PKG_VERSION"),
    " (+https://github.com/bugragungoz/paratoner-risk-analizi)"
);
const GOOGLE_KARO: &str = "https://tile.googleapis.com";
const GOOGLE_YER: &str = "https://places.googleapis.com/v1";
const ESRI_GORUNTU: &str = "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile";
const OSM_KARO: &str = "https://tile.openstreetmap.org";
const NOMINATIM: &str = "https://nominatim.openstreetmap.org/search";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Saglayici {
    Google,
    Esri,
}

impl Saglayici {
    fn kayit_adi(self) -> &'static str {
        match self {
            Saglayici::Google => "google-maps-platform",
            Saglayici::Esri => "arcgis-location-platform",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Katman {
    GoogleUydu,
    GoogleHibrit,
    GoogleYol,
    EsriUydu,
    Osm,
}

impl Katman {
    pub fn adindan(ad: &str) -> Option<Katman> {
        Some(match ad {
            "google_uydu" => Katman::GoogleUydu,
            "google_hibrit" => Katman::GoogleHibrit,
            "google_yol" => Katman::GoogleYol,
            "esri_uydu" => Katman::EsriUydu,
            "osm" => Katman::Osm,
            _ => return None,
        })
    }

    fn azami_zoom(self) -> u32 {
        match self {
            Katman::Osm => 19,
            _ => 22,
        }
    }

    fn saglayici(self) -> Option<Saglayici> {
        match self {
            Katman::GoogleUydu | Katman::GoogleHibrit | Katman::GoogleYol => Some(Saglayici::Google),
            Katman::EsriUydu => Some(Saglayici::Esri),
            Katman::Osm => None,
        }
    }

    /// Google Map Tiles API oturum isteğinin gövdesi.
    fn google_oturum_govdesi(self) -> Option<Value> {
        match self {
            Katman::GoogleUydu => Some(json!({ "mapType": "satellite", "language": "tr-TR", "region": "TR" })),
            // Uydu + yol ve etiketler: Maps JavaScript API'deki "hibrit" haritanın karşılığı.
            Katman::GoogleHibrit => Some(json!({ "mapType": "satellite", "language": "tr-TR", "region": "TR", "layerTypes": ["layerRoadmap"], "overlay": false })),
            Katman::GoogleYol => Some(json!({ "mapType": "roadmap", "language": "tr-TR", "region": "TR" })),
            _ => None,
        }
    }
}

/// `karo://` isteğinin yolu: /{katman}/{z}/{x}/{y}
#[derive(Debug, PartialEq, Eq)]
pub struct KaroIstegi {
    pub katman: Katman,
    pub z: u32,
    pub x: u32,
    pub y: u32,
}

pub fn karo_yolunu_coz(yol: &str) -> Result<KaroIstegi, &'static str> {
    let parcalar: Vec<&str> = yol.trim_matches('/').split('/').collect();
    let [katman, z, x, y] = parcalar.as_slice() else {
        return Err("Karo adresi geçersiz.");
    };
    let katman = Katman::adindan(katman).ok_or("Bilinmeyen harita katmanı.")?;
    let sayi = |s: &str| s.parse::<u32>().map_err(|_| "Karo koordinatı geçersiz.");
    let (z, x, y) = (sayi(z)?, sayi(x)?, sayi(y)?);
    if z > katman.azami_zoom() {
        return Err("Yakınlaştırma düzeyi bu katman için desteklenmiyor.");
    }
    let sinir = 1u64 << z;
    if u64::from(x) >= sinir || u64::from(y) >= sinir {
        return Err("Karo koordinatı aralık dışında.");
    }
    Ok(KaroIstegi { katman, z, x, y })
}

/// Anahtar biçimi: Google ve Esri anahtarları yalnızca bu karakterlerden oluşur.
pub fn anahtar_bicimi_gecerli(anahtar: &str) -> bool {
    (20..=600).contains(&anahtar.len()) && anahtar.chars().all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c))
}

/// Karo sunucusunun adresi (anahtar ve Google oturumu eklenmiş).
pub fn kaynak_adresi(k: &KaroIstegi, anahtar: Option<&str>, oturum: Option<&str>) -> Result<String, &'static str> {
    Ok(match k.katman {
        Katman::Osm => format!("{OSM_KARO}/{}/{}/{}.png", k.z, k.x, k.y),
        Katman::EsriUydu => format!("{ESRI_GORUNTU}/{}/{}/{}?token={}", k.z, k.y, k.x, anahtar.ok_or("Esri anahtarı girilmemiş.")?),
        _ => format!(
            "{GOOGLE_KARO}/v1/2dtiles/{}/{}/{}?session={}&key={}",
            k.z,
            k.x,
            k.y,
            oturum.ok_or("Google oturumu yok.")?,
            anahtar.ok_or("Google anahtarı girilmemiş.")?
        ),
    })
}

/// Sunucunun hata yanıtından kullanıcıya gösterilecek kısa açıklama.
pub fn hata_aciklamasi(durum: u16, govde: &str) -> String {
    let mesaj = serde_json::from_str::<Value>(govde)
        .ok()
        .and_then(|v| {
            v.pointer("/error/message")
                .or_else(|| v.pointer("/error/details/0"))
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
        .unwrap_or_default();
    let temel = match durum {
        400 => "İstek reddedildi (400)",
        401 => "Anahtar geçersiz ya da süresi dolmuş (401)",
        403 => "Anahtarın bu servise izni yok ya da servis projede etkin değil (403)",
        429 => "Kota ya da istek sınırı aşıldı (429)",
        500..=599 => "Sunucu hatası",
        _ => "Beklenmeyen yanıt",
    };
    if mesaj.is_empty() {
        format!("{temel}.")
    } else {
        format!("{temel}: {mesaj}")
    }
}

// ------------------------------------------------------------------ Durum

pub struct HaritaDurumu {
    istemci: reqwest::Client,
    /// Kimlik deposundan okunan anahtarların bellek kopyası (None: okunmadı).
    anahtarlar: Mutex<HashMap<Saglayici, Option<String>>>,
    /// Google Map Tiles oturumları: katman → (oturum, bitiş zamanı, sn).
    oturumlar: tokio::sync::Mutex<HashMap<Katman, (String, u64)>>,
    son_nominatim: tokio::sync::Mutex<Option<Instant>>,
}

impl HaritaDurumu {
    pub fn yeni() -> Self {
        let istemci = reqwest::Client::builder()
            .user_agent(KULLANICI_AJANI)
            .timeout(Duration::from_secs(20))
            .build()
            .expect("HTTP istemcisi kurulamadı");
        HaritaDurumu { istemci, anahtarlar: Mutex::new(HashMap::new()), oturumlar: tokio::sync::Mutex::new(HashMap::new()), son_nominatim: tokio::sync::Mutex::new(None) }
    }

    fn anahtar(&self, s: Saglayici) -> Option<String> {
        let mut onbellek = self.anahtarlar.lock().ok()?;
        if let Some(a) = onbellek.get(&s) {
            return a.clone();
        }
        let okunan = keyring::Entry::new(ANAHTAR_SERVISI, s.kayit_adi()).ok().and_then(|e| e.get_password().ok());
        onbellek.insert(s, okunan.clone());
        okunan
    }

    fn zorunlu_anahtar(&self, s: Saglayici) -> Result<String, String> {
        self.anahtar(s).ok_or_else(|| match s {
            Saglayici::Google => "Google anahtarı girilmemiş (Ayarlar > Harita servisleri).".into(),
            Saglayici::Esri => "Esri anahtarı girilmemiş (Ayarlar > Harita servisleri).".into(),
        })
    }

    async fn google_oturumu(&self, katman: Katman, yenile: bool) -> Result<String, String> {
        let simdi = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
        let mut oturumlar = self.oturumlar.lock().await;
        if !yenile {
            // Bitişe bir günden fazla varsa mevcut oturum kullanılır.
            if let Some((oturum, bitis)) = oturumlar.get(&katman) {
                if *bitis > simdi + 86_400 {
                    return Ok(oturum.clone());
                }
            }
        }
        let anahtar = self.zorunlu_anahtar(Saglayici::Google)?;
        let govde = katman.google_oturum_govdesi().ok_or("Google katmanı değil.")?;
        let yanit = self
            .istemci
            .post(format!("{GOOGLE_KARO}/v1/createSession"))
            .query(&[("key", anahtar.as_str())])
            .json(&govde)
            .send()
            .await
            .map_err(|e| format!("Google'a bağlanılamadı: {e}"))?;
        let durum = yanit.status().as_u16();
        let metin = yanit.text().await.unwrap_or_default();
        if durum != 200 {
            return Err(hata_aciklamasi(durum, &metin));
        }
        let v: Value = serde_json::from_str(&metin).map_err(|_| "Google oturum yanıtı okunamadı.".to_string())?;
        let oturum = v.get("session").and_then(Value::as_str).ok_or("Google oturum yanıtında oturum yok.")?.to_string();
        let bitis = v.get("expiry").and_then(|e| e.as_str().and_then(|s| s.parse().ok()).or_else(|| e.as_u64())).unwrap_or(simdi + 86_400 * 2);
        oturumlar.insert(katman, (oturum.clone(), bitis));
        Ok(oturum)
    }

    /// Bir karoyu kaynağından getirir: (durum, içerik türü, önbellek başlığı, gövde).
    async fn karo_getir(&self, k: &KaroIstegi) -> Result<(u16, String, Option<String>, Vec<u8>), String> {
        let mut yenilendi = false;
        loop {
            let anahtar = match k.katman.saglayici() {
                Some(s) => Some(self.zorunlu_anahtar(s)?),
                None => None,
            };
            let oturum = if k.katman.saglayici() == Some(Saglayici::Google) { Some(self.google_oturumu(k.katman, yenilendi).await?) } else { None };
            let adres = kaynak_adresi(k, anahtar.as_deref(), oturum.as_deref())?;
            let yanit = self.istemci.get(adres).send().await.map_err(|e| format!("Karo alınamadı: {e}"))?;
            let durum = yanit.status().as_u16();
            // Süresi dolmuş Google oturumu: bir kez yenileyip tekrar dene.
            if !yenilendi && oturum.is_some() && (durum == 401 || durum == 403) {
                yenilendi = true;
                continue;
            }
            let tur = yanit.headers().get(header::CONTENT_TYPE).and_then(|v| v.to_str().ok()).unwrap_or("application/octet-stream").to_string();
            let onbellek = yanit.headers().get(header::CACHE_CONTROL).and_then(|v| v.to_str().ok()).map(str::to_owned);
            let govde = yanit.bytes().await.map_err(|e| format!("Karo okunamadı: {e}"))?.to_vec();
            return Ok((durum, tur, onbellek, govde));
        }
    }
}

// ------------------------------------------------------------------ karo:// protokolü

fn duz_yanit(durum: StatusCode, metin: &str) -> Response<Vec<u8>> {
    Response::builder()
        .status(durum)
        .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(metin.as_bytes().to_vec())
        .unwrap_or_default()
}

pub async fn karo_yaniti<R: Runtime>(app: &AppHandle<R>, yol: &str) -> Response<Vec<u8>> {
    let istek = match karo_yolunu_coz(yol) {
        Ok(i) => i,
        Err(e) => return duz_yanit(StatusCode::BAD_REQUEST, e),
    };
    let durum = app.state::<HaritaDurumu>();
    match durum.karo_getir(&istek).await {
        Ok((kod, tur, onbellek, govde)) => {
            let mut y = Response::builder()
                .status(StatusCode::from_u16(kod).unwrap_or(StatusCode::BAD_GATEWAY))
                .header(header::CONTENT_TYPE, tur)
                // Rapor görüntüsü (html2canvas) karoları kendi kaynağı dışından okuyabilsin.
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*");
            if let Some(o) = onbellek {
                y = y.header(header::CACHE_CONTROL, o);
            }
            y.body(govde).unwrap_or_default()
        }
        Err(e) => duz_yanit(StatusCode::BAD_GATEWAY, &e),
    }
}

// ------------------------------------------------------------------ Komutlar

#[derive(Serialize)]
pub struct AnahtarDurumu {
    google: bool,
    esri: bool,
}

#[tauri::command]
pub fn harita_anahtar_durumu(durum: State<'_, HaritaDurumu>) -> AnahtarDurumu {
    AnahtarDurumu { google: durum.anahtar(Saglayici::Google).is_some(), esri: durum.anahtar(Saglayici::Esri).is_some() }
}

#[tauri::command]
pub async fn harita_anahtar_kaydet(durum: State<'_, HaritaDurumu>, saglayici: Saglayici, anahtar: String) -> Result<(), String> {
    let anahtar = anahtar.trim().to_string();
    if !anahtar_bicimi_gecerli(&anahtar) {
        return Err("Anahtar biçimi geçersiz (yalnızca harf, rakam, - _ . olmalı).".into());
    }
    keyring::Entry::new(ANAHTAR_SERVISI, saglayici.kayit_adi())
        .and_then(|e| e.set_password(&anahtar))
        .map_err(|e| format!("Anahtar Windows kimlik deposuna yazılamadı: {e}"))?;
    durum.anahtarlar.lock().map_err(|_| "Anahtar önbelleği kilitli.")?.insert(saglayici, Some(anahtar));
    if saglayici == Saglayici::Google {
        durum.oturumlar.lock().await.clear();
    }
    Ok(())
}

#[tauri::command]
pub async fn harita_anahtar_sil(durum: State<'_, HaritaDurumu>, saglayici: Saglayici) -> Result<(), String> {
    match keyring::Entry::new(ANAHTAR_SERVISI, saglayici.kayit_adi()).and_then(|e| e.delete_credential()) {
        Ok(()) | Err(keyring::Error::NoEntry) => {}
        Err(e) => return Err(format!("Anahtar silinemedi: {e}")),
    }
    durum.anahtarlar.lock().map_err(|_| "Anahtar önbelleği kilitli.")?.insert(saglayici, None);
    if saglayici == Saglayici::Google {
        durum.oturumlar.lock().await.clear();
    }
    Ok(())
}

/// Google anahtarıyla Places API (New) için tek bir öneri isteği (oturumsuz; ücretsiz kotadan bir istek).
async fn places_dene(durum: &HaritaDurumu) -> Result<(), String> {
    let anahtar = durum.zorunlu_anahtar(Saglayici::Google)?;
    let yanit = durum
        .istemci
        .post(format!("{GOOGLE_YER}/places:autocomplete"))
        .header("X-Goog-Api-Key", anahtar)
        .json(&json!({ "input": "Ankara", "languageCode": "tr", "includedRegionCodes": ["tr"] }))
        .send()
        .await
        .map_err(|e| format!("Google'a bağlanılamadı: {e}"))?;
    let kod = yanit.status().as_u16();
    if kod == 200 {
        Ok(())
    } else {
        Err(hata_aciklamasi(kod, &yanit.text().await.unwrap_or_default()))
    }
}

/// Anahtarı gerçek isteklerle dener. Google'da her servis ayrı satırda raporlanır; biri bile
/// çalışmıyorsa hata döner.
#[tauri::command]
pub async fn harita_anahtar_dene(durum: State<'_, HaritaDurumu>, saglayici: Saglayici) -> Result<String, String> {
    match saglayici {
        Saglayici::Google => {
            let mut satirlar = Vec::new();
            let mut hepsi = true;
            match durum.google_oturumu(Katman::GoogleUydu, true).await {
                Ok(_) => satirlar.push("Map Tiles API: çalışıyor.".to_string()),
                Err(e) => {
                    hepsi = false;
                    satirlar.push(format!("Map Tiles API: {e}"));
                }
            }
            match places_dene(&durum).await {
                Ok(()) => satirlar.push("Places API (New): çalışıyor.".to_string()),
                Err(e) => {
                    hepsi = false;
                    satirlar.push(format!("Places API (New): {e}"));
                }
            }
            satirlar.push("Maps Embed API (Street View) buradan denenemez: Street View panelinde görüntü açılıyorsa çalışıyordur.".to_string());
            let metin = satirlar.join("\n");
            if hepsi {
                Ok(metin)
            } else {
                Err(metin)
            }
        }
        Saglayici::Esri => {
            let (kod, _, _, govde) = durum.karo_getir(&KaroIstegi { katman: Katman::EsriUydu, z: 1, x: 1, y: 0 }).await?;
            if kod == 200 && !govde.is_empty() {
                Ok("World Imagery çalışıyor.".into())
            } else {
                Err(hata_aciklamasi(kod, &String::from_utf8_lossy(&govde)))
            }
        }
    }
}

/// Google haritasının görünen alana göre telif metni (Map Tiles API viewport bilgisi).
#[tauri::command]
pub async fn google_telif(durum: State<'_, HaritaDurumu>, katman: String, zoom: u32, kuzey: f64, guney: f64, dogu: f64, bati: f64) -> Result<String, String> {
    let k = Katman::adindan(&katman).filter(|k| k.saglayici() == Some(Saglayici::Google)).ok_or("Google katmanı değil.")?;
    let ok = |v: f64, s: f64| v.is_finite() && v.abs() < s;
    if zoom > 22 || !ok(kuzey, 90.0) || !ok(guney, 90.0) || !ok(dogu, 180.0) || !ok(bati, 180.0) {
        return Err("Görünüm sınırları geçersiz.".into());
    }
    let anahtar = durum.zorunlu_anahtar(Saglayici::Google)?;
    let oturum = durum.google_oturumu(k, false).await?;
    let yanit = durum
        .istemci
        .get(format!("{GOOGLE_KARO}/tile/v1/viewport"))
        .query(&[
            ("session", oturum),
            ("key", anahtar),
            ("zoom", zoom.to_string()),
            ("north", kuzey.to_string()),
            ("south", guney.to_string()),
            ("east", dogu.to_string()),
            ("west", bati.to_string()),
        ])
        .send()
        .await
        .map_err(|e| format!("Google'a bağlanılamadı: {e}"))?;
    let kod = yanit.status().as_u16();
    let metin = yanit.text().await.unwrap_or_default();
    if kod != 200 {
        return Err(hata_aciklamasi(kod, &metin));
    }
    let v: Value = serde_json::from_str(&metin).map_err(|_| "Telif yanıtı okunamadı.".to_string())?;
    Ok(v.get("copyright").and_then(Value::as_str).unwrap_or_default().to_string())
}

/// Street View gömme adresi (Maps Embed API). Anahtar bu adreste zorunludur.
#[tauri::command]
pub fn streetview_adresi(durum: State<'_, HaritaDurumu>, lat: f64, lng: f64) -> Result<String, String> {
    if !(lat.is_finite() && lng.is_finite() && lat.abs() <= 90.0 && lng.abs() <= 180.0) {
        return Err("Konum geçersiz.".into());
    }
    let anahtar = durum.zorunlu_anahtar(Saglayici::Google)?;
    Ok(format!("https://www.google.com/maps/embed/v1/streetview?key={anahtar}&location={lat:.6},{lng:.6}&fov=90&language=tr&region=TR"))
}

#[derive(Serialize, Debug, PartialEq)]
pub struct YerOnerisi {
    #[serde(rename = "yerId")]
    yer_id: String,
    ana: String,
    ikincil: String,
}

pub fn oneri_yanitini_coz(v: &Value) -> Vec<YerOnerisi> {
    v.get("suggestions")
        .and_then(Value::as_array)
        .map(|liste| {
            liste
                .iter()
                .filter_map(|s| {
                    let p = s.get("placePrediction")?;
                    let yazi = |yol: &str| p.pointer(yol).and_then(Value::as_str).unwrap_or_default().to_string();
                    let ana = yazi("/structuredFormat/mainText/text");
                    Some(YerOnerisi {
                        yer_id: p.get("placeId")?.as_str()?.to_string(),
                        ana: if ana.is_empty() { yazi("/text/text") } else { ana },
                        ikincil: yazi("/structuredFormat/secondaryText/text"),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

fn oturum_gecerli(oturum: &str) -> bool {
    (8..=64).contains(&oturum.len()) && oturum.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// Google Places API (New) Autocomplete: yazarken adres ve işletme önerisi.
#[tauri::command]
pub async fn yer_oneri(durum: State<'_, HaritaDurumu>, sorgu: String, oturum: String, lat: Option<f64>, lng: Option<f64>) -> Result<Vec<YerOnerisi>, String> {
    let sorgu = sorgu.trim();
    if sorgu.chars().count() < 2 || sorgu.len() > 200 || !oturum_gecerli(&oturum) {
        return Ok(vec![]);
    }
    let anahtar = durum.zorunlu_anahtar(Saglayici::Google)?;
    let mut govde = json!({ "input": sorgu, "sessionToken": oturum, "languageCode": "tr", "includedRegionCodes": ["tr"] });
    if let (Some(lat), Some(lng)) = (lat, lng) {
        if lat.is_finite() && lng.is_finite() {
            govde["locationBias"] = json!({ "circle": { "center": { "latitude": lat, "longitude": lng }, "radius": 50000.0 } });
        }
    }
    let yanit = durum
        .istemci
        .post(format!("{GOOGLE_YER}/places:autocomplete"))
        .header("X-Goog-Api-Key", anahtar)
        .json(&govde)
        .send()
        .await
        .map_err(|e| format!("Google'a bağlanılamadı: {e}"))?;
    let kod = yanit.status().as_u16();
    let metin = yanit.text().await.unwrap_or_default();
    if kod != 200 {
        return Err(hata_aciklamasi(kod, &metin));
    }
    Ok(oneri_yanitini_coz(&serde_json::from_str(&metin).unwrap_or(Value::Null)))
}

#[derive(Serialize)]
pub struct YerAyrintisi {
    lat: f64,
    lng: f64,
    adres: String,
}

/// Seçilen önerinin konumu (Place Details, yalnızca Essentials alanları: konum ve adres).
#[tauri::command]
pub async fn yer_ayrinti(durum: State<'_, HaritaDurumu>, yer_id: String, oturum: String) -> Result<YerAyrintisi, String> {
    if yer_id.is_empty() || yer_id.len() > 300 || !yer_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') || !oturum_gecerli(&oturum) {
        return Err("Yer kimliği geçersiz.".into());
    }
    let anahtar = durum.zorunlu_anahtar(Saglayici::Google)?;
    let yanit = durum
        .istemci
        .get(format!("{GOOGLE_YER}/places/{yer_id}"))
        .query(&[("sessionToken", oturum.as_str()), ("languageCode", "tr"), ("regionCode", "TR")])
        .header("X-Goog-Api-Key", anahtar)
        .header("X-Goog-FieldMask", "location,formattedAddress")
        .send()
        .await
        .map_err(|e| format!("Google'a bağlanılamadı: {e}"))?;
    let kod = yanit.status().as_u16();
    let metin = yanit.text().await.unwrap_or_default();
    if kod != 200 {
        return Err(hata_aciklamasi(kod, &metin));
    }
    let v: Value = serde_json::from_str(&metin).map_err(|_| "Yer yanıtı okunamadı.".to_string())?;
    let lat = v.pointer("/location/latitude").and_then(Value::as_f64).ok_or("Yerin konumu yok.")?;
    let lng = v.pointer("/location/longitude").and_then(Value::as_f64).ok_or("Yerin konumu yok.")?;
    Ok(YerAyrintisi { lat, lng, adres: v.get("formattedAddress").and_then(Value::as_str).unwrap_or_default().to_string() })
}

#[derive(Serialize)]
pub struct AramaSonucu {
    isim: String,
    lat: f64,
    lng: f64,
}

/// OpenStreetMap Nominatim araması (anahtar yokken; yalnızca Enter ile, saniyede en fazla bir istek).
#[tauri::command]
pub async fn nominatim_ara(durum: State<'_, HaritaDurumu>, sorgu: String) -> Result<Vec<AramaSonucu>, String> {
    let sorgu = sorgu.trim();
    if sorgu.chars().count() < 2 || sorgu.len() > 200 {
        return Ok(vec![]);
    }
    {
        let mut son = durum.son_nominatim.lock().await;
        if let Some(t) = *son {
            let gecen = t.elapsed();
            if gecen < Duration::from_millis(1100) {
                tokio::time::sleep(Duration::from_millis(1100) - gecen).await;
            }
        }
        *son = Some(Instant::now());
    }
    let yanit = durum
        .istemci
        .get(NOMINATIM)
        .query(&[("format", "jsonv2"), ("q", sorgu), ("limit", "8"), ("accept-language", "tr"), ("countrycodes", "tr")])
        .send()
        .await
        .map_err(|e| format!("Arama sunucusuna bağlanılamadı: {e}"))?;
    let kod = yanit.status().as_u16();
    let metin = yanit.text().await.unwrap_or_default();
    if kod != 200 {
        return Err(hata_aciklamasi(kod, &metin));
    }
    let v: Value = serde_json::from_str(&metin).unwrap_or(Value::Null);
    Ok(v.as_array()
        .map(|l| {
            l.iter()
                .filter_map(|s| {
                    Some(AramaSonucu {
                        isim: s.get("display_name")?.as_str()?.to_string(),
                        lat: s.get("lat")?.as_str()?.parse().ok()?,
                        lng: s.get("lon")?.as_str()?.parse().ok()?,
                    })
                })
                .collect()
        })
        .unwrap_or_default())
}

#[cfg(test)]
mod testler {
    use super::*;

    #[test]
    fn karo_yolu_dogrulanir() {
        assert_eq!(karo_yolunu_coz("/google_uydu/3/5/2"), Ok(KaroIstegi { katman: Katman::GoogleUydu, z: 3, x: 5, y: 2 }));
        assert!(karo_yolunu_coz("/osm/20/0/0").is_err(), "OSM 19'dan yukarı yok");
        assert!(karo_yolunu_coz("/google_uydu/2/4/0").is_err(), "x aralık dışı");
        assert!(karo_yolunu_coz("/../etc/1/1/1").is_err());
        assert!(karo_yolunu_coz("/osm/1/1").is_err());
        assert!(karo_yolunu_coz("/osm/1/1/1/1").is_err());
        assert!(karo_yolunu_coz("/osm/a/1/1").is_err());
    }

    #[test]
    fn kaynak_adresleri_resmi_servisler() {
        let k = |katman| KaroIstegi { katman, z: 10, x: 600, y: 390 };
        assert_eq!(kaynak_adresi(&k(Katman::Osm), None, None).unwrap(), "https://tile.openstreetmap.org/10/600/390.png");
        // Esri sırası z/y/x
        assert_eq!(
            kaynak_adresi(&k(Katman::EsriUydu), Some("ANAHTAR"), None).unwrap(),
            "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/10/390/600?token=ANAHTAR"
        );
        // Google sırası z/x/y
        assert_eq!(
            kaynak_adresi(&k(Katman::GoogleHibrit), Some("ANAHTAR"), Some("OTURUM")).unwrap(),
            "https://tile.googleapis.com/v1/2dtiles/10/600/390?session=OTURUM&key=ANAHTAR"
        );
        assert!(kaynak_adresi(&k(Katman::EsriUydu), None, None).is_err());
        assert!(kaynak_adresi(&k(Katman::GoogleUydu), Some("A"), None).is_err());
    }

    #[test]
    fn google_hibrit_oturumu_yol_katmanli_uydu() {
        let g = Katman::GoogleHibrit.google_oturum_govdesi().unwrap();
        assert_eq!(g["mapType"], "satellite");
        assert_eq!(g["layerTypes"][0], "layerRoadmap");
        assert_eq!(g["overlay"], false);
        assert!(Katman::Osm.google_oturum_govdesi().is_none());
    }

    #[test]
    fn anahtar_bicimi() {
        assert!(anahtar_bicimi_gecerli("AIzaSyA-1234567890_abcdefghijklmnop"));
        assert!(anahtar_bicimi_gecerli("AAPTxy8BH1VEsoebNVZXo8HurEOF051kAEKlhkOhBEc9BHoYK9Q2.abc"));
        assert!(!anahtar_bicimi_gecerli("kisa"));
        assert!(!anahtar_bicimi_gecerli("AIzaSyA 1234567890abcdefghijklmnop"));
        assert!(!anahtar_bicimi_gecerli("AIzaSyA&key=1234567890abcdefghij"));
    }

    #[test]
    fn hata_yaniti_turkce_aciklanir() {
        let g = r#"{"error":{"code":403,"message":"Map Tiles API has not been used in project 123"}}"#;
        assert_eq!(hata_aciklamasi(403, g), "Anahtarın bu servise izni yok ya da servis projede etkin değil (403): Map Tiles API has not been used in project 123");
        assert_eq!(hata_aciklamasi(401, ""), "Anahtar geçersiz ya da süresi dolmuş (401).");
    }

    #[test]
    fn places_onerileri_okunur() {
        let v: Value = serde_json::from_str(
            r#"{"suggestions":[{"placePrediction":{"placeId":"ChIJ1","text":{"text":"Kızılay, Ankara"},"structuredFormat":{"mainText":{"text":"Kızılay"},"secondaryText":{"text":"Çankaya/Ankara"}}}},{"queryPrediction":{"text":{"text":"x"}}},{"placePrediction":{"placeId":"ChIJ2","text":{"text":"Yalnız metin"}}}]}"#,
        )
        .unwrap();
        let o = oneri_yanitini_coz(&v);
        assert_eq!(o.len(), 2);
        assert_eq!(o[0], YerOnerisi { yer_id: "ChIJ1".into(), ana: "Kızılay".into(), ikincil: "Çankaya/Ankara".into() });
        assert_eq!(o[1].ana, "Yalnız metin");
    }

    #[test]
    fn kullanici_ajani_uygulamayi_tanitir() {
        assert!(KULLANICI_AJANI.starts_with("ParatonerRiskAnalizi/"));
        assert!(!KULLANICI_AJANI.contains("Mozilla"));
    }
}
