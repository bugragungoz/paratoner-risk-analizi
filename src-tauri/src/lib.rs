mod dil;
mod harita_servisleri;
mod proje_dosyasi;

use std::sync::Mutex;
use tauri::{Emitter, Manager};

/// Program bir proje dosyasıyla açıldıysa (çift tıklama / "Birlikte aç") o dosyanın yolu.
/// Arayüz başlangıçta bir kez alır.
struct BaslangicDosyasi(Mutex<Option<String>>);

/// Komut satırı argümanlarındaki ilk proje dosyası (.ptproj ya da eski .json).
fn proje_argumani<I: IntoIterator<Item = String>>(argumanlar: I) -> Option<String> {
    argumanlar.into_iter().skip(1).find(|a| {
        let k = a.to_lowercase();
        k.ends_with(".ptproj") || k.ends_with(".json")
    })
}

#[tauri::command]
fn baslangic_dosyasi(durum: tauri::State<'_, BaslangicDosyasi>) -> Option<String> {
    durum.0.lock().ok().and_then(|mut d| d.take())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Tek kopya: ikinci açılış mevcut pencereyi öne getirir; proje dosyasıyla açıldıysa
        // dosya mevcut pencerede açılır (aynı projenin iki pencerede birbirini ezmesi önlenir).
        .plugin(tauri_plugin_single_instance::init(|app, argumanlar, _klasor| {
            if let Some(pencere) = app.get_webview_window("main") {
                let _ = pencere.unminimize();
                let _ = pencere.show();
                let _ = pencere.set_focus();
            }
            if let Some(yol) = proje_argumani(argumanlar) {
                let _ = app.emit("proje-dosyasi-ac", yol);
            }
        }))
        .manage(BaslangicDosyasi(Mutex::new(proje_argumani(std::env::args()))))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(harita_servisleri::HaritaDurumu::yeni())
        // Harita karoları: http://karo.localhost/{katman}/{z}/{x}/{y} (Windows'ta özel protokol adresi).
        .register_asynchronous_uri_scheme_protocol("karo", |ctx, istek, yanitci| {
            let app = ctx.app_handle().clone();
            let yol = istek.uri().path().to_string();
            tauri::async_runtime::spawn(async move {
                yanitci.respond(harita_servisleri::karo_yaniti(&app, &yol).await);
            });
        })
        .invoke_handler(tauri::generate_handler![
            baslangic_dosyasi,
            harita_servisleri::harita_anahtar_durumu,
            harita_servisleri::harita_anahtar_kaydet,
            harita_servisleri::harita_anahtar_sil,
            harita_servisleri::harita_anahtar_dene,
            harita_servisleri::google_telif,
            harita_servisleri::streetview_adresi,
            harita_servisleri::yer_oneri,
            harita_servisleri::yer_ayrinti,
            harita_servisleri::nominatim_ara,
            dil::dil_ayarla,
            proje_dosyasi::proje_dosyasi_oku,
            proje_dosyasi::proje_dosyasi_yaz,
            proje_dosyasi::otomatik_kayit_yaz,
            proje_dosyasi::otomatik_kayitlari_listele,
            proje_dosyasi::kml_dosyasi_oku,
            proje_dosyasi::dxf_dosyasi_oku,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod testler {
    use super::proje_argumani;

    #[test]
    fn proje_dosyasi_argumani_bulunur() {
        let a = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
        assert_eq!(proje_argumani(a(&["app.exe", "C:\\Saha\\Örnek.PTPROJ"])), Some("C:\\Saha\\Örnek.PTPROJ".into()));
        assert_eq!(proje_argumani(a(&["app.exe", "--bayrak", "eski.json"])), Some("eski.json".into()));
        assert_eq!(proje_argumani(a(&["app.exe"])), None);
        assert_eq!(proje_argumani(a(&["proje.ptproj"])), None, "ilk argüman programın kendisi");
    }
}
