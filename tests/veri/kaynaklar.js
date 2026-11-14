// Doğrulama kaynakları: Amper ve Radsan "Yıldırım Risk Hesabı (NF C 17-102)" çıktıları.
// Amper: https://www.amper.com.tr/aktifparatoner/index.php?lang=turkce (24.10.2026'da hesaplatıldı)
// Radsan: https://www.radsan.com.tr/images/dosyalar/proje-ornekleri/aktif-paratoner-projeleri-mR/60ce86-aktif-paratoner-projesi-standart.pdf

/** Kaynakların yayımladığı örnek hesaplar (değerler kaynakta gösterilen yuvarlamayla). */
export const KAYNAK_ORNEKLERI = [
  {
    ad: 'Amper örneği',
    L: 50, W: 30, H: 15, Td: 30, C: { C1: 1, C2: 0.5, C3: 1, C4: 1, C5: 5 },
    beklenen: { Ae: 15061.7251, Ng: 2.8084, Nd: 0.0423, Nc: 0.0022, E: 0.95, seviye: 'Seviye 2', sutun: 'II' },
  },
  {
    ad: 'Radsan örnek 1',
    L: 30, W: 30, H: 16, Td: 12, C: { C1: 0.25, C2: 1, C3: 2, C4: 3, C5: 10 },
    beklenen: { Ae: 13898.2295, Ng: 0.8934, Nd: 0.0031, Nc: 0.0001, E: 0.97, seviye: 'Seviye 1', sutun: 'I' },
  },
  {
    // Radsan çıktısı E'yi 0,98'e yuvarlayıp "SEVİYE I" diyor; gerçek değer 0,9806 > 0,98.
    // Eşik yuvarlanmamış değere uygulanınca doğru sonuç "Seviye 1 + ek önlem" (Rp yine I sütunu).
    ad: 'Radsan örnek 2',
    L: 95, W: 25, H: 16, Td: 12, C: { C1: 0.25, C2: 1, C3: 2, C4: 3, C5: 10 },
    beklenen: { Ae: 21133.2295, Ng: 0.8934, Nd: 0.0047, Nc: 0.0001, E: 0.98, seviye: 'Seviye 1 + ek önlem', sutun: 'I' },
  },
];

/** Amper "Elektrostatik Aktif Paratonerler için Seçim Tablosu" (30/45/60 µs) ve
 *  "Piezoelektrik Kristalli Aktif Paratoner Seçim Tablosu"ndaki 15 µs sütunu. Rp (m). */
const H = [2, 4, 5, 6, 8, 10, 20, 30, 60];
const tablo = (satirlar) => satirlar.map(([I, II, III, IV], i) => ({ h: H[i], I, II, III, IV }));
export const AMPER_ESE_TABLOLARI = {
  15: tablo([[13, 15, 18, 20], [25, 30, 36, 41], [32, 37, 45, 51], [32, 38, 46, 52], [33, 39, 47, 54], [34, 40, 49, 56], [35, 44, 55, 63], [35, 45, 58, 69], [35, 45, 60, 75]]),
  30: tablo([[19, 22, 25, 28], [38, 44, 51, 57], [48, 55, 63, 71], [48, 55, 64, 72], [49, 56, 65, 73], [49, 57, 66, 75], [50, 59, 71, 81], [50, 60, 73, 85], [50, 60, 75, 90]]),
  45: tablo([[25, 28, 32, 36], [51, 57, 64, 72], [63, 71, 81, 89], [63, 71, 81, 90], [64, 72, 82, 91], [64, 72, 83, 92], [65, 74, 86, 97], [65, 75, 89, 101], [65, 75, 90, 105]]),
  60: tablo([[31, 35, 39, 43], [63, 69, 78, 85], [79, 86, 97, 107], [79, 87, 97, 107], [79, 87, 98, 108], [79, 88, 99, 109], [80, 89, 102, 113], [80, 90, 104, 116], [80, 90, 105, 120]]),
};

/** Amper hesap formundaki C katsayısı değerleri (standart tablo). C2: satır = çatı, sütun = yapı. */
export const STANDART_C = {
  C1: [0.25, 0.5, 1, 2],
  C2_MATRIS: {
    satirlar: ['Metal çatı', 'Kiremit/normal çatı', 'Tutuşabilir çatı'],
    sutunlar: ['Metal yapı', 'Tuğla/beton yapı', 'Tutuşabilir yapı'],
    degerler: [[0.5, 1, 2], [1, 1, 2.5], [2, 2.5, 3]],
  },
  C2: [0.5, 1, 2, 2.5, 3],
  C3: [0.5, 1, 2, 3],
  C4: [0.5, 1, 3],
  C5: [1, 5, 10],
};
