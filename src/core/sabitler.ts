// Standart tablolar: C katsayıları, C2 matrisi, ESE koruma yarıçapı tabloları, yapı tipi şablonları.
// Kaynak: NF C 17-102 basitleştirilmiş risk değerlendirmesi; değerler Amper ve Radsan'ın
// yayımladığı hesap formlarıyla doğrulanmıştır (tests/kaynak-dogrulama.test.js).

import type { C2Secimi, Malzeme, Seviye } from './tipler';

export interface Secenek {
  deger: number;
  etiket: string;
}

export type CAdi = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

/** C1 — Çevre katsayısı. */
export const C1_SECENEKLERI: readonly Secenek[] = [
  { deger: 0.25, etiket: 'Aynı yükseklikte veya daha yüksek yapılar/ağaçlar arasında' },
  { deger: 0.5, etiket: 'Daha alçak yapılarla çevrili' },
  { deger: 1, etiket: 'Yalnız: 3H mesafe içinde başka yapı yok' },
  { deger: 2, etiket: 'Yalnız ve tepe/yükselti üzerinde (bölgenin en yüksek noktası)' },
];

/** C2 — Yapı katsayısı: yapı malzemesi × çatı malzemesi matrisi. */
export const MALZEMELER: readonly Malzeme[] = ['metal', 'normal', 'yanici'];
export const YAPI_MALZEMESI_ETIKETLERI: Record<Malzeme, string> = {
  metal: 'Metal yapı',
  normal: 'Normal yapı (tuğla, beton, kâgir)',
  yanici: 'Yanıcı yapı (ahşap vb.)',
};
export const CATI_MALZEMESI_ETIKETLERI: Record<Malzeme, string> = {
  metal: 'Metal çatı',
  normal: 'Normal çatı (kiremit, beton vb.)',
  yanici: 'Yanıcı çatı (ahşap, saman, kamış vb.)',
};
/** C2_MATRISI[yapı][çatı] */
export const C2_MATRISI: Record<Malzeme, Record<Malzeme, number>> = {
  metal: { metal: 0.5, normal: 1, yanici: 2 },
  normal: { metal: 1, normal: 1, yanici: 2.5 },
  yanici: { metal: 2, normal: 2.5, yanici: 3 },
};

export function c2Degeri(secim: C2Secimi): number {
  return C2_MATRISI[secim.yapi][secim.cati];
}

/** C3 — Yapı içeriği katsayısı. */
export const C3_SECENEKLERI: readonly Secenek[] = [
  { deger: 0.5, etiket: 'Değersiz, yanmaz içerik' },
  { deger: 1, etiket: 'Normal değerde, olağan yanıcılıkta içerik' },
  { deger: 2, etiket: 'Değerli veya kolay tutuşan içerik' },
  { deger: 3, etiket: 'Çok değerli/yeri doldurulamaz, parlayıcı veya patlayıcı içerik' },
];

/** C4 — Kullanım (doluluk) katsayısı. */
export const C4_SECENEKLERI: readonly Secenek[] = [
  { deger: 0.5, etiket: 'Personelsiz' },
  { deger: 1, etiket: 'Normal doluluk' },
  { deger: 3, etiket: 'Tahliyesi zor veya panik riski var' },
];

/** C5 — Yıldırımın sonuçları katsayısı. */
export const C5_SECENEKLERI: readonly Secenek[] = [
  { deger: 1, etiket: 'Hizmet sürekliliği gerekmiyor, çevresel sonucu yok' },
  { deger: 5, etiket: 'Hizmet sürekliliği gerekiyor, çevresel sonucu yok' },
  { deger: 10, etiket: 'Çevresel sonuç doğurabilir' },
];

/** Her C katsayısı için standartta geçerli değerler. */
export const STANDART_C_DEGERLERI: Record<CAdi, readonly number[]> = {
  C1: C1_SECENEKLERI.map((s) => s.deger),
  C2: [...new Set(Object.values(C2_MATRISI).flatMap((satir) => Object.values(satir)))].sort((a, b) => a - b),
  C3: C3_SECENEKLERI.map((s) => s.deger),
  C4: C4_SECENEKLERI.map((s) => s.deger),
  C5: C5_SECENEKLERI.map((s) => s.deger),
};

export function standartCMi(c: CAdi, deger: number): boolean {
  return STANDART_C_DEGERLERI[c].includes(deger);
}

export interface EseSatiri {
  h: number;
  I: number;
  II: number;
  III: number;
  IV: number;
}

const H_DEGERLERI = [2, 4, 5, 6, 8, 10, 20, 30, 60] as const;
function tablo(satirlar: readonly (readonly [number, number, number, number])[]): EseSatiri[] {
  return satirlar.map(([I, II, III, IV], i) => ({ h: H_DEGERLERI[i] as number, I, II, III, IV }));
}

/**
 * ESE (aktif paratoner) seçim tabloları: koruma yarıçapı Rp (m), satır = h (m), sütun = koruma seviyesi.
 * Anahtar = ΔT (µs). Değerler NF C 17-102 formülüyle en fazla 0,5 m farklıdır (yuvarlama).
 */
export const ESE_TABLOLARI: Readonly<Record<number, readonly EseSatiri[]>> = {
  15: tablo([[13, 15, 18, 20], [25, 30, 36, 41], [32, 37, 45, 51], [32, 38, 46, 52], [33, 39, 47, 54], [34, 40, 49, 56], [35, 44, 55, 63], [35, 45, 58, 69], [35, 45, 60, 75]]),
  30: tablo([[19, 22, 25, 28], [38, 44, 51, 57], [48, 55, 63, 71], [48, 55, 64, 72], [49, 56, 65, 73], [49, 57, 66, 75], [50, 59, 71, 81], [50, 60, 73, 85], [50, 60, 75, 90]]),
  45: tablo([[25, 28, 32, 36], [51, 57, 64, 72], [63, 71, 81, 89], [63, 71, 81, 90], [64, 72, 82, 91], [64, 72, 83, 92], [65, 74, 86, 97], [65, 75, 89, 101], [65, 75, 90, 105]]),
  60: tablo([[31, 35, 39, 43], [63, 69, 78, 85], [79, 86, 97, 107], [79, 87, 97, 107], [79, 87, 98, 108], [79, 88, 99, 109], [80, 89, 102, 113], [80, 90, 104, 116], [80, 90, 105, 120]]),
};

export const GECERLI_DELTA_T_DEGERLERI: readonly number[] = [15, 30, 45, 60];

export const SEVIYELER: readonly Seviye[] = ['I', 'II', 'III', 'IV'];

/** Yapı tipi şablonu: önerilen C değerleri (kullanıcı her zaman değiştirebilir). */
export interface YapiTipi {
  deger: string;
  etiket: string;
  C1: number;
  C2_secim: C2Secimi;
  C3: number;
  C4: number;
  C5: number;
  gerekce: string;
}

export const YAPI_TIPLERI: readonly YapiTipi[] = [
  { deger: 'kumes', etiket: 'Kümes', C1: 0.25, C2_secim: { yapi: 'normal', cati: 'metal' }, C3: 2, C4: 0.5, C5: 5, gerekce: 'Aynı yükseklikte yapılar arasında; tuğla gövde, metal çatı; personelsiz; üretim değeri var' },
  { deger: 'silo', etiket: 'Silo', C1: 2, C2_secim: { yapi: 'metal', cati: 'metal' }, C3: 1, C4: 0.5, C5: 5, gerekce: 'Sahanın en yüksek noktalarından; metal yapı; personelsiz' },
  { deger: 'idari_bina', etiket: 'İdari Bina', C1: 0.25, C2_secim: { yapi: 'normal', cati: 'normal' }, C3: 1, C4: 1, C5: 5, gerekce: 'Normal doluluk, normal değer' },
  { deger: 'lojman', etiket: 'Lojman', C1: 0.5, C2_secim: { yapi: 'normal', cati: 'normal' }, C3: 1, C4: 1, C5: 10, gerekce: 'İnsan barınan yapı' },
  { deger: 'depo', etiket: 'Depo', C1: 0.25, C2_secim: { yapi: 'normal', cati: 'metal' }, C3: 2, C4: 0.5, C5: 5, gerekce: 'Tuğla gövde, metal çatı; personelsiz; orta değer' },
  { deger: 'su_deposu', etiket: 'Su Deposu', C1: 2, C2_secim: { yapi: 'normal', cati: 'normal' }, C3: 1, C4: 0.5, C5: 1, gerekce: 'Yüksek konumlu; sürekli kullanım ve çevresel sonuç düşük' },
  { deger: 'tank', etiket: 'Tank', C1: 0.25, C2_secim: { yapi: 'metal', cati: 'metal' }, C3: 3, C4: 0.5, C5: 10, gerekce: 'Metal yapı; parlayıcı içerik riski; personelsiz' },
  { deger: 'jenerator_odasi', etiket: 'Jeneratör Odası', C1: 0.25, C2_secim: { yapi: 'metal', cati: 'metal' }, C3: 3, C4: 0.5, C5: 10, gerekce: 'Metal yapı; yakıt içeriği; personelsiz' },
  { deger: 'diger', etiket: 'Diğer', C1: 1, C2_secim: { yapi: 'normal', cati: 'normal' }, C3: 1, C4: 1, C5: 1, gerekce: 'Varsayılan değerler — gözden geçirilmelidir' },
];
