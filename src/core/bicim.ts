// Sayı biçimlendirme (Türkçe ondalık virgül). Dile göre biçim için sözlükteki `m.bicim` kullanılır;
// bu işlevler Türkçe biçimin kısayoludur.

import { bicimTr } from '../dil/tr/bicim';

export const sayi = bicimTr.sayi;

/** Kapsama oranı (0–1) → "%77" / "%99,9". Aşağı yuvarlanır: %99,96 "%100" görünüp yanıltmasın. */
export const yuzde = bicimTr.yuzde;

/** Kot gösterimi: "+2,0", "−3,0" (eksi işareti U+2212), sıfır için "±0,0". */
export const kotMetni = bicimTr.kot;

export const SEVIYE_NUMARASI = { I: 1, II: 2, III: 3, IV: 4 } as const;
