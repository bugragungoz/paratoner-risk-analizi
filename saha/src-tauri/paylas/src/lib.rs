// Paratoner Saha — dosya paylaşma eklentisi. Copyright (C) 2026 Buğra Güngöz — GPL-3.0-or-later
//
// Android'de iki iş yapar (Kotlin: android/src/main/java/PaylasPlugin.kt):
//   paylas  dosyayı uygulamanın önbelleğine yazar ve Android paylaşma penceresini açar
//           (WhatsApp, e-posta, Drive …); dosyaya geçici okuma izni FileProvider ile verilir.
//   kaydet  "Farklı kaydet" penceresini açar (ör. İndirilenler) ve dosyayı seçilen yere yazar.

use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DosyaIstegi {
    pub dosya_adi: String,
    pub icerik: String,
    pub mime: String,
    pub baslik: Option<String>,
}

#[cfg(target_os = "android")]
struct Paylas<R: Runtime>(tauri::plugin::PluginHandle<R>);

#[cfg(target_os = "android")]
fn yerel<R: Runtime>(app: &tauri::AppHandle<R>, komut: &str, istek: DosyaIstegi) -> Result<serde_json::Value, String> {
    use tauri::Manager;
    app.state::<Paylas<R>>().0.run_mobile_plugin(komut, istek).map_err(|e| e.to_string())
}

#[cfg(not(target_os = "android"))]
fn yerel<R: Runtime>(_app: &tauri::AppHandle<R>, _komut: &str, _istek: DosyaIstegi) -> Result<serde_json::Value, String> {
    Err("Paylaşma yalnızca Android'de kullanılabilir.".into())
}

#[tauri::command]
async fn paylas<R: Runtime>(app: tauri::AppHandle<R>, istek: DosyaIstegi) -> Result<serde_json::Value, String> {
    yerel(&app, "paylas", istek)
}

/// Dönen nesne: { kaydedildi: bool } (kullanıcı vazgeçerse false).
#[tauri::command]
async fn kaydet<R: Runtime>(app: tauri::AppHandle<R>, istek: DosyaIstegi) -> Result<serde_json::Value, String> {
    yerel(&app, "kaydet", istek)
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("paylas")
        .invoke_handler(tauri::generate_handler![paylas, kaydet])
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            {
                use tauri::Manager;
                let tutamac = _api.register_android_plugin("com.bugragungoz.paratoner.saha.paylas", "PaylasPlugin")?;
                _app.manage(Paylas(tutamac));
            }
            Ok(())
        })
        .build()
}
