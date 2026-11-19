// Proje dosyalarının okunup yazılması ve otomatik kayıt.
//
// Arayüz, diske yalnızca bu komutlarla erişir: uzantı, boyut ve yol burada denetlenir;
// yazma işlemleri yarıda kalırsa eski dosyayı bozmamak için önce geçici dosyaya yapılır.

use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Manager};

/// Proje dosyası boyut sınırı (bayt). Arayüzdeki PROJE_DOSYA_SINIRI ile aynı.
const DOSYA_SINIRI: u64 = 20 * 1024 * 1024;
const OTOMATIK_KAYIT_KLASORU: &str = "Paratoner Otomatik Kayıt";
const YEDEK_KLASORU: &str = "yedekler";
/// Her proje için saklanan en fazla yedek sayısı.
const YEDEK_SAYISI: usize = 5;
/// İçe aktarılan Google Earth dosyası (.kml / .kmz) boyut sınırı (bayt).
const KML_SINIRI: u64 = 30 * 1024 * 1024;

fn uzanti(yol: &Path) -> String {
    yol.extension()
        .map(|u| u.to_string_lossy().to_lowercase())
        .unwrap_or_default()
}

fn mutlak_yol(yol: &str) -> Result<PathBuf, String> {
    let yol = PathBuf::from(yol);
    if !yol.is_absolute() {
        return Err("Dosya yolu geçersiz.".into());
    }
    Ok(yol)
}

/// Dosya adında Windows'ta sorun çıkaran karakterleri ve ayrılmış adları temizler.
fn guvenli_ad(ad: &str, yedek: &str) -> String {
    let mut temiz: String = ad
        .chars()
        .map(|c| if c.is_control() || r#"\/:*?"<>|"#.contains(c) { '_' } else { c })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    temiz = temiz.chars().take(80).collect();
    let temiz = temiz.trim_end_matches(['.', ' ']).to_string();
    if temiz.is_empty() {
        return yedek.to_string();
    }
    let buyuk = temiz.to_uppercase();
    let ayrilmis = ["CON", "PRN", "AUX", "NUL"].contains(&buyuk.as_str())
        || ((buyuk.starts_with("COM") || buyuk.starts_with("LPT"))
            && buyuk.len() == 4
            && buyuk.as_bytes()[3].is_ascii_digit());
    if ayrilmis {
        format!("_{temiz}")
    } else {
        temiz
    }
}

/// Proje kimliğinin dosya adında kullanılan kısa biçimi (son 8 harf/rakam).
fn kisa_kimlik(id: &str) -> String {
    let temiz: Vec<char> = id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
        .collect();
    let bas = temiz.len().saturating_sub(8);
    let kisa: String = temiz[bas..].iter().collect();
    if kisa.is_empty() {
        "proje".into()
    } else {
        kisa
    }
}

/// İçeriği önce aynı klasördeki geçici dosyaya yazar, sonra hedefin yerine koyar.
fn guvenli_yaz(hedef: &Path, icerik: &[u8]) -> Result<(), String> {
    let ust = hedef.parent().ok_or("Hedef klasör bulunamadı.")?;
    if !ust.is_dir() {
        return Err("Hedef klasör bulunamadı.".into());
    }
    let ad = hedef
        .file_name()
        .ok_or("Dosya adı geçersiz.")?
        .to_string_lossy()
        .to_string();
    let gecici = ust.join(format!(".{ad}.yaziliyor"));
    let sonuc = (|| -> std::io::Result<()> {
        let mut f = fs::File::create(&gecici)?;
        f.write_all(icerik)?;
        f.sync_all()?;
        drop(f);
        fs::rename(&gecici, hedef)
    })();
    if let Err(e) = sonuc {
        let _ = fs::remove_file(&gecici);
        return Err(format!("Dosya yazılamadı: {e}"));
    }
    Ok(())
}

fn metni_oku(yol: &Path) -> Result<String, String> {
    let bilgi = fs::metadata(yol).map_err(|e| format!("Dosya açılamadı: {e}"))?;
    if !bilgi.is_file() {
        return Err("Seçilen öğe bir dosya değil.".into());
    }
    if bilgi.len() > DOSYA_SINIRI {
        return Err("Dosya bir proje dosyası için fazla büyük.".into());
    }
    let veri = fs::read(yol).map_err(|e| format!("Dosya okunamadı: {e}"))?;
    String::from_utf8(veri).map_err(|_| "Dosya okunamadı: metin kodlaması UTF-8 değil.".into())
}

// ------------------------------------------------------------------ Proje dosyası

/// Kullanıcının seçtiği (ya da son dosyalar listesindeki) proje dosyasını okur.
/// Yalnızca .ptproj ve eski sürümün .json dosyaları kabul edilir.
#[tauri::command]
pub async fn proje_dosyasi_oku(yol: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let yol = mutlak_yol(&yol)?;
        if !matches!(uzanti(&yol).as_str(), "ptproj" | "json") {
            return Err("Yalnızca .ptproj ya da eski sürümün .json proje dosyaları açılabilir.".into());
        }
        metni_oku(&yol)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Projeyi .ptproj dosyasına yazar (yarıda kalan yazma eski dosyayı bozmaz).
#[tauri::command]
pub async fn proje_dosyasi_yaz(yol: String, icerik: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let yol = mutlak_yol(&yol)?;
        if uzanti(&yol) != "ptproj" {
            return Err("Proje yalnızca .ptproj uzantılı dosyaya kaydedilebilir.".into());
        }
        if icerik.len() as u64 > DOSYA_SINIRI {
            return Err("Proje bir dosya için fazla büyük.".into());
        }
        guvenli_yaz(&yol, icerik.as_bytes())
    })
    .await
    .map_err(|e| e.to_string())?
}

// ------------------------------------------------------------------ Otomatik kayıt

fn otomatik_kayit_klasoru(app: &AppHandle, konum: &str) -> Result<PathBuf, String> {
    let taban = match konum {
        "masaustu" => app.path().desktop_dir(),
        "belgeler" => app.path().document_dir(),
        _ => return Err("Otomatik kayıt konumu geçersiz.".into()),
    }
    .map_err(|e| format!("Klasör bulunamadı: {e}"))?;
    Ok(taban.join(OTOMATIK_KAYIT_KLASORU))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OtomatikKayitSonucu {
    pub yol: String,
    pub yedek_yolu: Option<String>,
}

/// Projeyi otomatik kayıt klasörüne "Ad (kimlik).ptproj" adıyla yazar.
///
/// - Dosya adında proje kimliği bulunduğu için aynı adlı iki farklı proje birbirini ezmez.
/// - Proje yeniden adlandırılınca yalnızca AYNI kimliğe ait eski adlı kayıt kaldırılır.
/// - `zaman_etiketi` verilirse "yedekler" klasörüne zaman damgalı bir kopya da yazılır;
///   her proje için en yeni 5 yedek saklanır.
#[tauri::command]
pub async fn otomatik_kayit_yaz(
    app: AppHandle,
    konum: String,
    proje_id: String,
    proje_adi: String,
    icerik: String,
    zaman_etiketi: Option<String>,
) -> Result<OtomatikKayitSonucu, String> {
    let klasor = otomatik_kayit_klasoru(&app, &konum)?;
    tauri::async_runtime::spawn_blocking(move || {
        if icerik.len() as u64 > DOSYA_SINIRI {
            return Err("Proje bir dosya için fazla büyük.".into());
        }
        fs::create_dir_all(&klasor).map_err(|e| format!("Otomatik kayıt klasörü oluşturulamadı: {e}"))?;
        let kimlik = kisa_kimlik(&proje_id);
        let ad = guvenli_ad(&proje_adi, "Proje");
        let ek = format!(" ({kimlik}).ptproj");
        let dosya_adi = format!("{ad}{ek}");
        let hedef = klasor.join(&dosya_adi);
        guvenli_yaz(&hedef, icerik.as_bytes())?;

        // Aynı projenin eski adla kalmış kaydı.
        if let Ok(okuma) = fs::read_dir(&klasor) {
            for giris in okuma.flatten() {
                let ad = giris.file_name().to_string_lossy().to_string();
                if ad != dosya_adi && ad.ends_with(&ek) && giris.path().is_file() {
                    let _ = fs::remove_file(giris.path());
                }
            }
        }

        let mut yedek_yolu = None;
        if let Some(etiket) = zaman_etiketi {
            if etiket.is_empty() || etiket.len() > 32 || !etiket.chars().all(|c| c.is_ascii_digit() || c == '-' || c == ' ') {
                return Err("Yedek zaman etiketi geçersiz.".into());
            }
            let yedekler = klasor.join(YEDEK_KLASORU);
            fs::create_dir_all(&yedekler).map_err(|e| format!("Yedek klasörü oluşturulamadı: {e}"))?;
            let yedek = yedekler.join(format!("{ad} ({kimlik}) {etiket}.ptproj"));
            guvenli_yaz(&yedek, icerik.as_bytes())?;
            yedek_yolu = Some(yedek.to_string_lossy().to_string());

            let isaret = format!(" ({kimlik}) ");
            let mut eskiler: Vec<(u128, PathBuf)> = fs::read_dir(&yedekler)
                .map(|o| {
                    o.flatten()
                        .filter(|g| {
                            let ad = g.file_name().to_string_lossy().to_string();
                            ad.contains(&isaret) && ad.ends_with(".ptproj") && g.path().is_file()
                        })
                        .map(|g| (degistirilme_ms(&g.path()), g.path()))
                        .collect()
                })
                .unwrap_or_default();
            eskiler.sort_by(|a, b| b.0.cmp(&a.0));
            for (_, yol) in eskiler.into_iter().skip(YEDEK_SAYISI) {
                let _ = fs::remove_file(yol);
            }
        }

        Ok(OtomatikKayitSonucu {
            yol: hedef.to_string_lossy().to_string(),
            yedek_yolu,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

fn degistirilme_ms(yol: &Path) -> u128 {
    fs::metadata(yol)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OtomatikKayitBilgisi {
    pub yol: String,
    pub dosya_adi: String,
    pub degistirilme_ms: u64,
    pub boyut: u64,
    pub yedek: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OtomatikKayitListesi {
    pub klasor: String,
    pub kayitlar: Vec<OtomatikKayitBilgisi>,
}

/// Otomatik kayıt klasöründeki kayıtları ve yedekleri (en yeni önce) listeler.
#[tauri::command]
pub async fn otomatik_kayitlari_listele(app: AppHandle, konum: String) -> Result<OtomatikKayitListesi, String> {
    let klasor = otomatik_kayit_klasoru(&app, &konum)?;
    tauri::async_runtime::spawn_blocking(move || {
        let mut kayitlar = Vec::new();
        for (dizin, yedek) in [(klasor.clone(), false), (klasor.join(YEDEK_KLASORU), true)] {
            let Ok(okuma) = fs::read_dir(&dizin) else { continue };
            for giris in okuma.flatten() {
                let yol = giris.path();
                let Ok(bilgi) = giris.metadata() else { continue };
                if !bilgi.is_file() || uzanti(&yol) != "ptproj" {
                    continue;
                }
                kayitlar.push(OtomatikKayitBilgisi {
                    yol: yol.to_string_lossy().to_string(),
                    dosya_adi: giris.file_name().to_string_lossy().to_string(),
                    degistirilme_ms: degistirilme_ms(&yol) as u64,
                    boyut: bilgi.len(),
                    yedek,
                });
            }
        }
        kayitlar.sort_by(|a, b| b.degistirilme_ms.cmp(&a.degistirilme_ms));
        Ok(OtomatikKayitListesi {
            klasor: klasor.to_string_lossy().to_string(),
            kayitlar,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

// ------------------------------------------------------------------ Google Earth (KML / KMZ)

/// .kml ya da .kmz dosyasını ham bayt olarak okur; KMZ arşivi arayüzde açılır.
fn kml_baytlari(yol: &str) -> Result<Vec<u8>, String> {
    let yol = mutlak_yol(yol)?;
    if !matches!(uzanti(&yol).as_str(), "kml" | "kmz") {
        return Err("Yalnızca .kml ya da .kmz dosyaları içe aktarılabilir.".into());
    }
    let bilgi = fs::metadata(&yol).map_err(|e| format!("Dosya açılamadı: {e}"))?;
    if !bilgi.is_file() {
        return Err("Seçilen öğe bir dosya değil.".into());
    }
    if bilgi.len() > KML_SINIRI {
        return Err("Dosya içe aktarmak için fazla büyük (en çok 30 MB).".into());
    }
    fs::read(&yol).map_err(|e| format!("Dosya okunamadı: {e}"))
}

/// Kullanıcının seçtiği KML/KMZ dosyasını okur (arayüze ArrayBuffer olarak döner).
#[tauri::command]
pub async fn kml_dosyasi_oku(yol: String) -> Result<tauri::ipc::Response, String> {
    let bayt = tauri::async_runtime::spawn_blocking(move || kml_baytlari(&yol))
        .await
        .map_err(|e| e.to_string())??;
    Ok(tauri::ipc::Response::new(bayt))
}

#[cfg(test)]
mod testler {
    use super::*;

    #[test]
    fn guvenli_ad_windows_kurallari() {
        assert_eq!(guvenli_ad("Depo: A/B*?", "x"), "Depo_ A_B__");
        assert_eq!(guvenli_ad("  Çatı   Katı  ", "x"), "Çatı Katı");
        assert_eq!(guvenli_ad("son nokta...", "x"), "son nokta");
        assert_eq!(guvenli_ad("CON", "x"), "_CON");
        assert_eq!(guvenli_ad("com1", "x"), "_com1");
        assert_eq!(guvenli_ad("COMPANY", "x"), "COMPANY");
        assert_eq!(guvenli_ad("   ", "Proje"), "Proje");
        assert_eq!(guvenli_ad("..\\..\\x", "Proje"), ".._.._x");
    }

    #[test]
    fn kml_yalnizca_kml_ve_kmz_uzantisini_okur() {
        let klasor = std::env::temp_dir().join(format!("paratoner-kml-{}", std::process::id()));
        fs::create_dir_all(&klasor).unwrap();
        let kml = klasor.join("Saha.KML");
        fs::write(&kml, b"<kml/>").unwrap();
        let txt = klasor.join("notlar.txt");
        fs::write(&txt, b"x").unwrap();
        assert_eq!(kml_baytlari(kml.to_str().unwrap()).unwrap(), b"<kml/>");
        assert!(kml_baytlari(txt.to_str().unwrap()).is_err());
        assert!(kml_baytlari("goreli/Saha.kml").is_err());
        assert!(kml_baytlari(klasor.join("yok.kmz").to_str().unwrap()).is_err());
        let _ = fs::remove_dir_all(&klasor);
    }

    #[test]
    fn kisa_kimlik_yol_karakteri_icermez() {
        assert_eq!(kisa_kimlik("proj_lq3k9x2ab"), "q3k9x2ab");
        assert_eq!(kisa_kimlik("../../a"), "a");
        assert_eq!(kisa_kimlik("///"), "proje");
    }

    #[test]
    fn guvenli_yaz_eski_dosyanin_yerine_gecer() {
        let klasor = std::env::temp_dir().join(format!("paratoner-test-{}", std::process::id()));
        fs::create_dir_all(&klasor).unwrap();
        let hedef = klasor.join("a.ptproj");
        guvenli_yaz(&hedef, b"bir").unwrap();
        guvenli_yaz(&hedef, b"iki").unwrap();
        assert_eq!(fs::read_to_string(&hedef).unwrap(), "iki");
        assert!(!klasor.join(".a.ptproj.yaziliyor").exists());
        fs::remove_dir_all(&klasor).unwrap();
    }
}
