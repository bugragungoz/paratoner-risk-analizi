// Keşif (Paratoner saha uygulaması) — Copyright (C) 2026 Buğra Güngöz — GPL-3.0-or-later
//
// Rust tarafı yalnızca kabuktur: konum (Android; internet varsa ağ destekli), bağlantı açma, pano ve
// dosya paylaşma eklentileri. Keşif verisi telefonda (WebView yerel depolaması) tutulur.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_paylas::init());
    #[cfg(mobile)]
    let builder = builder.plugin(tauri_plugin_geolocation::init());
    builder
        .run(tauri::generate_context!())
        .expect("Keşif başlatılamadı");
}
