// ESE seçim tablosundan koruma yarıçapı (Rp) okuma.
//
// Kurallar:
// - h tabloda tam karşılık bulursa o satır kullanılır.
// - h iki satır arasındaysa doğrusal enterpolasyon yapılır (0,1 m'ye yuvarlanır).
// - h < 2 m: standartta Rp tanımsızdır → değer ÜRETİLMEZ (v5'te h=2 satırı dönüyordu, M3).
// - h > 60 m: standart tablo dışı → değer üretilmez.
// - ΔT tablolarda yoksa ya da girilmemişse → değer üretilmez (v5'te sessizce 60 µs kullanılıyordu, M2).

import type { Metinler } from '../dil';
import { tr as TR } from '../dil/tr';
import { ESE_TABLOLARI } from './sabitler';
import type { Seviye } from './tipler';

export type RpHatasi = 'GECERSIZ_H' | 'DELTA_T_TANIMSIZ' | 'H_2_ALTI' | 'H_60_USTU';

export type RpOkuma =
  | { tamam: true; rp: number; enterpoleEdildi: boolean }
  | { tamam: false; neden: RpHatasi; mesaj: string };

/** Türkçe mesajlar (dile göre: `m.hesap.rp`). */
export const RP_MESAJLARI: Record<RpHatasi, string> = TR.hesap.rp;

export function rpOku(h: number, sutun: Seviye, deltaT: number | null | undefined, m: Metinler = TR): RpOkuma {
  const hata = (neden: RpHatasi): RpOkuma => ({ tamam: false, neden, mesaj: m.hesap.rp[neden] });
  if (typeof h !== 'number' || Number.isNaN(h)) return hata('GECERSIZ_H');
  const tablo = deltaT === null || deltaT === undefined ? undefined : ESE_TABLOLARI[deltaT];
  if (!tablo) return hata('DELTA_T_TANIMSIZ');

  const ilk = tablo[0];
  const son = tablo[tablo.length - 1];
  if (!ilk || !son) return hata('DELTA_T_TANIMSIZ');
  if (h < ilk.h) return hata('H_2_ALTI');
  if (h > son.h) return hata('H_60_USTU');

  const tam = tablo.find((satir) => satir.h === h);
  if (tam) return { tamam: true, rp: tam[sutun], enterpoleEdildi: false };

  for (let i = 0; i < tablo.length - 1; i++) {
    const alt = tablo[i];
    const ust = tablo[i + 1];
    if (alt && ust && h > alt.h && h < ust.h) {
      const oran = (h - alt.h) / (ust.h - alt.h);
      const rp = alt[sutun] + oran * (ust[sutun] - alt[sutun]);
      return { tamam: true, rp: Math.round(rp * 10) / 10, enterpoleEdildi: true };
    }
  }
  return hata('GECERSIZ_H');
}
