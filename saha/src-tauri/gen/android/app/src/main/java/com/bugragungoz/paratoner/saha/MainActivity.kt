package com.bugragungoz.paratoner.saha

import android.os.Bundle
import android.util.Log
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  // tauri-plugin-geolocation 2.5: etkinlik WebView yüklenmeden duraklatılırsa (ör. açılışta bir ayar
  // değişikliğiyle yeniden başlatılınca) eklentinin onPause'u başlatılmamış alana erişip uygulamayı
  // çökertiyor. TauriActivity.onPause önce Activity.onPause'u çağırdığı için hatayı yakalamak güvenli;
  // konum izlemesi o anda zaten başlamamıştır.
  override fun onPause() {
    try {
      super.onPause()
    } catch (e: UninitializedPropertyAccessException) {
      Log.w("ParatonerSaha", "Eklenti yüklenmeden duraklatıldı: ${e.message}")
    }
  }
}
