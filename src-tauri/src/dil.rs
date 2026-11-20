//! Arayüz dili: kullanıcıya dönen hata ve durum mesajları ile Google/Nominatim isteklerinin dil kodu.
//! Arayüz açılışta ve dil değişince `dil_ayarla` çağırır; varsayılan Türkçe.

use std::sync::atomic::{AtomicBool, Ordering};

static INGILIZCE: AtomicBool = AtomicBool::new(false);

/// Arayüz dili değişince (ve açılışta) çağrılır: "tr" ya da "en".
#[tauri::command]
pub fn dil_ayarla(dil: String) {
    INGILIZCE.store(dil == "en", Ordering::Relaxed);
}

pub fn ingilizce() -> bool {
    INGILIZCE.load(Ordering::Relaxed)
}

/// Mesajın seçili dildeki karşılığı.
pub fn m(tr: &'static str, en: &'static str) -> &'static str {
    if ingilizce() {
        en
    } else {
        tr
    }
}

/// Google Places, Street View ve Nominatim isteklerindeki dil kodu.
pub fn kod() -> &'static str {
    if ingilizce() {
        "en"
    } else {
        "tr"
    }
}
