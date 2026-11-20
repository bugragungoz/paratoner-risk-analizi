// English number, percentage, level and date format (decimal point; CSV separator comma).

import type { Metinler } from '../index';

const sayi = (deger: number | null | undefined, basamak = 1): string =>
  deger === null || deger === undefined || Number.isNaN(deger) ? '-' : deger.toFixed(basamak);

export const bicimEn: Metinler['bicim'] = {
  sayi,
  yuzde: (oran) => {
    const d = Math.floor(oran * 1000) / 10;
    return `${sayi(d, d % 1 === 0 ? 0 : 1)}%`;
  },
  kot: (deger, basamak = 1) => {
    if (deger === null || deger === undefined || Number.isNaN(deger)) return '-';
    const yuvarlak = Number(deger.toFixed(basamak));
    if (yuvarlak === 0) return `±${sayi(0, basamak)}`;
    return `${yuvarlak > 0 ? '+' : '−'}${sayi(Math.abs(deger), basamak)}`;
  },
  tarih: (t) => t.toLocaleDateString('en-GB'),
  tarihSaat: (t) => t.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  csvAyrac: ',',
  evet: 'Yes',
  hayir: 'No',
  yerel: 'en-GB',
};
