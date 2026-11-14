// Bu uygulama Buğra Güngöz tarafından hazırlanmıştır.
// GitHub: https://github.com/bugragungoz

// Elektrostatik Aktif Paratonerler İçin Seçim Tablosu.
// Kaynak: bir referans proje raporu, "Hesaplama Yöntemi ve
// Formüller" bölümü. I/II/III/IV = Gerekli Koruma Seviyesi 1/2/3/4.
// Üç ΔT (yayılım süresi) seti mevcuttur — paratoner datasheet'inde
// hangisi belirtilmişse proje ayarlarından o seçilir.

export const ESE_TABLOLARI = {
  30: [
    { h: 2, I: 19, II: 22, III: 25, IV: 28 },
    { h: 4, I: 38, II: 44, III: 51, IV: 57 },
    { h: 5, I: 48, II: 55, III: 63, IV: 71 },
    { h: 6, I: 48, II: 55, III: 64, IV: 72 },
    { h: 8, I: 49, II: 56, III: 65, IV: 73 },
    { h: 10, I: 49, II: 57, III: 66, IV: 75 },
    { h: 20, I: 50, II: 59, III: 71, IV: 81 },
    { h: 30, I: 50, II: 60, III: 73, IV: 85 },
    { h: 60, I: 50, II: 60, III: 75, IV: 90 },
  ],
  45: [
    { h: 2, I: 25, II: 28, III: 32, IV: 36 },
    { h: 4, I: 51, II: 57, III: 64, IV: 72 },
    { h: 5, I: 63, II: 71, III: 81, IV: 89 },
    { h: 6, I: 63, II: 71, III: 81, IV: 90 },
    { h: 8, I: 64, II: 72, III: 82, IV: 91 },
    { h: 10, I: 64, II: 72, III: 83, IV: 92 },
    { h: 20, I: 65, II: 74, III: 86, IV: 97 },
    { h: 30, I: 65, II: 75, III: 89, IV: 101 },
    { h: 60, I: 65, II: 75, III: 90, IV: 105 },
  ],
  60: [
    { h: 2, I: 31, II: 35, III: 39, IV: 43 },
    { h: 4, I: 63, II: 69, III: 78, IV: 85 },
    { h: 5, I: 79, II: 86, III: 97, IV: 107 },
    { h: 6, I: 79, II: 87, III: 97, IV: 107 },
    { h: 8, I: 79, II: 87, III: 98, IV: 108 },
    { h: 10, I: 79, II: 88, III: 99, IV: 109 },
    { h: 20, I: 80, II: 89, III: 102, IV: 113 },
    { h: 30, I: 80, II: 90, III: 104, IV: 116 },
    { h: 60, I: 80, II: 90, III: 105, IV: 120 },
  ],
};

export const GECERLI_DELTA_T_DEGERLERI = [30, 45, 60];

// Geriye dönük uyumluluk: eskiden tek tablo (60μs) sabitti, bazı
// modüller doğrudan bu ismi import ediyor olabilir.
export const ESE_TABLOSU_60US = ESE_TABLOLARI[60];

/**
 * Verilen h değeri için, seçilen ΔT tablosundan Rp okur.
 *
 * Kural (kullanıcı tarafından doğrulanmıştır — 60μs tablosunda
 * "2<h<=3 -> Rp=64" değeri, h=2 (IV=43) ve h=4 (IV=85) satırları
 * arasındaki doğrusal enterpolasyonun (43+85)/2=64 sonucudur):
 *
 * - h tabloda TAM karşılık buluyorsa (örn. h=2, h=4, h=5...) o
 *   satırın değeri doğrudan kullanılır.
 * - h, tablodaki iki satır ARASINDA kalıyorsa DOĞRUSAL ENTERPOLASYON
 *   yapılır.
 * - h, tablonun en büyük değerini (60) aşıyorsa, en son satırın
 *   değeri kullanılır (`disariTasti: true` ile işaretlenir).
 * - h <= 0 veya geçersizse null döner.
 *
 * @param {number} h
 * @param {'I'|'II'|'III'|'IV'} sutun
 * @param {30|45|60} deltaT ΔT (yayılım süresi), varsayılan 60
 * @returns {{ rp: number, enterpoleEdildi: boolean, disariTasti: boolean } | null}
 */
export function rpOku(h, sutun = 'IV', deltaT = 60) {
  if (h === null || h === undefined || Number.isNaN(h) || h <= 0) return null;

  const tablo = ESE_TABLOLARI[deltaT] || ESE_TABLOLARI[60];

  const tamEslesme = tablo.find((satir) => satir.h === h);
  if (tamEslesme) {
    return { rp: tamEslesme[sutun], enterpoleEdildi: false, disariTasti: false };
  }

  if (h < tablo[0].h) {
    return { rp: tablo[0][sutun], enterpoleEdildi: false, disariTasti: false };
  }

  const son = tablo[tablo.length - 1];
  if (h > son.h) {
    return { 
      rp: null, 
      hesaplanamaz: true, 
      mesaj: 'Bu yükseklik için uygulama tarafından standart tabanlı Rp değeri üretilememektedir. 60 m üzerindeki yükseklikler için özel mühendislik değerlendirmesi gereklidir.' 
    };
  }

  for (let i = 0; i < tablo.length - 1; i++) {
    const alt = tablo[i];
    const ust = tablo[i + 1];
    if (h > alt.h && h < ust.h) {
      const oran = (h - alt.h) / (ust.h - alt.h);
      const rp = alt[sutun] + oran * (ust[sutun] - alt[sutun]);
      return { rp: Math.round(rp * 10) / 10, enterpoleEdildi: true, disariTasti: false };
    }
  }

  return null;
}

