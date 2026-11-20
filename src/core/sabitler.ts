// Standart tablolar: C katsayıları, C2 matrisi, ESE koruma yarıçapı tabloları, yapı tipi şablonları.
// Kaynak: NF C 17-102 basitleştirilmiş risk değerlendirmesi; değerler Amper ve Radsan'ın
// yayımladığı hesap formlarıyla doğrulanmıştır (tests/kaynak-dogrulama.test.js).

import type { Metinler } from '../dil';
import { tr as TR } from '../dil/tr';
import type { C2Secimi, Malzeme, Seviye } from './tipler';

export interface Secenek {
  deger: number;
  etiket: string;
}

export type CAdi = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

/** C katsayılarının standart değerleri (C2 malzeme matrisinden gelir). */
const C_DEGERLERI = { C1: [0.25, 0.5, 1, 2], C3: [0.5, 1, 2, 3], C4: [0.5, 1, 3], C5: [1, 5, 10] } as const;

/** Seçenek listeleri, dile göre adlarıyla. */
export function cSecenekleri(m: Metinler = TR): Record<'C1' | 'C3' | 'C4' | 'C5', readonly Secenek[]> {
  const liste = (c: 'C1' | 'C3' | 'C4' | 'C5') =>
    C_DEGERLERI[c].map((deger) => ({ deger, etiket: (m.sabit[c] as Record<string, string>)[String(deger)] ?? String(deger) }));
  return { C1: liste('C1'), C3: liste('C3'), C4: liste('C4'), C5: liste('C5') };
}

/** C1 — Çevre katsayısı (Türkçe adlarla; dile göre: cSecenekleri). */
export const C1_SECENEKLERI: readonly Secenek[] = cSecenekleri().C1;

/** C2 — Yapı katsayısı: yapı malzemesi × çatı malzemesi matrisi. */
export const MALZEMELER: readonly Malzeme[] = ['metal', 'normal', 'yanici'];
export const YAPI_MALZEMESI_ETIKETLERI: Record<Malzeme, string> = TR.sabit.yapiMalzemesi;
export const CATI_MALZEMESI_ETIKETLERI: Record<Malzeme, string> = TR.sabit.catiMalzemesi;
/** C2_MATRISI[yapı][çatı] */
export const C2_MATRISI: Record<Malzeme, Record<Malzeme, number>> = {
  metal: { metal: 0.5, normal: 1, yanici: 2 },
  normal: { metal: 1, normal: 1, yanici: 2.5 },
  yanici: { metal: 2, normal: 2.5, yanici: 3 },
};

export function c2Degeri(secim: C2Secimi): number {
  return C2_MATRISI[secim.yapi][secim.cati];
}

/** C3 — Yapı içeriği, C4 — Kullanım, C5 — Yıldırımın sonuçları (Türkçe adlarla). */
export const C3_SECENEKLERI: readonly Secenek[] = cSecenekleri().C3;
export const C4_SECENEKLERI: readonly Secenek[] = cSecenekleri().C4;
export const C5_SECENEKLERI: readonly Secenek[] = cSecenekleri().C5;

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

const YAPI_TIPI_DEGERLERI: readonly YapiTipi[] = [
  { deger: 'kumes', etiket: '', C1: 0.25, C2_secim: { yapi: 'normal', cati: 'metal' }, C3: 2, C4: 0.5, C5: 5, gerekce: '' },
  { deger: 'silo', etiket: '', C1: 2, C2_secim: { yapi: 'metal', cati: 'metal' }, C3: 1, C4: 0.5, C5: 5, gerekce: '' },
  { deger: 'idari_bina', etiket: '', C1: 0.25, C2_secim: { yapi: 'normal', cati: 'normal' }, C3: 1, C4: 1, C5: 5, gerekce: '' },
  { deger: 'lojman', etiket: '', C1: 0.5, C2_secim: { yapi: 'normal', cati: 'normal' }, C3: 1, C4: 1, C5: 10, gerekce: '' },
  { deger: 'depo', etiket: '', C1: 0.25, C2_secim: { yapi: 'normal', cati: 'metal' }, C3: 2, C4: 0.5, C5: 5, gerekce: '' },
  { deger: 'su_deposu', etiket: '', C1: 2, C2_secim: { yapi: 'normal', cati: 'normal' }, C3: 1, C4: 0.5, C5: 1, gerekce: '' },
  { deger: 'tank', etiket: '', C1: 0.25, C2_secim: { yapi: 'metal', cati: 'metal' }, C3: 3, C4: 0.5, C5: 10, gerekce: '' },
  { deger: 'jenerator_odasi', etiket: '', C1: 0.25, C2_secim: { yapi: 'metal', cati: 'metal' }, C3: 3, C4: 0.5, C5: 10, gerekce: '' },
  { deger: 'diger', etiket: '', C1: 1, C2_secim: { yapi: 'normal', cati: 'normal' }, C3: 1, C4: 1, C5: 1, gerekce: '' },
];

/** Yapı tipi şablonları, dile göre adı ve gerekçesiyle. */
export function yapiTipleri(m: Metinler = TR): readonly YapiTipi[] {
  return YAPI_TIPI_DEGERLERI.map((t) => ({
    ...t,
    etiket: m.sabit.yapiTipi[t.deger as keyof Metinler['sabit']['yapiTipi']] ?? t.deger,
    gerekce: m.sabit.yapiTipiGerekce[t.deger as keyof Metinler['sabit']['yapiTipiGerekce']] ?? '',
  }));
}

/** Türkçe adlarla (dile göre: yapiTipleri). */
export const YAPI_TIPLERI: readonly YapiTipi[] = yapiTipleri();
