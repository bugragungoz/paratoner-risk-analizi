// Hesap tablosunun CSV metni. Türkçe: noktalı virgül ayraç, ondalık virgül (Türkçe Excel ile uyumlu);
// İngilizce: virgül ayraç, ondalık nokta. Dil `m` sözlüğünden gelir; sonuç da aynı dille hesaplanmış olmalıdır.

import type { Metinler } from '../dil';
import { tr as TR } from '../dil/tr';
import type { ProjeSonucu } from './hesap';

/** Türkçe başlıklar (dile göre: `m.rapor.csv.basliklar`). */
export const CSV_BASLIKLARI: readonly string[] = TR.rapor.csv.basliklar;

export function hesapTablosuCsv(sonuc: ProjeSonucu, m: Metinler = TR): string {
  const { sayi, csvAyrac: ayrac, evet } = m.bicim;
  const ozel = new RegExp(`[${ayrac}"\\r\\n]`);
  const hucre = (deger: unknown): string => {
    const s = String(deger ?? '');
    return ozel.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const satir = (alanlar: unknown[]) => alanlar.map(hucre).join(ayrac);
  const satirlar: string[] = [satir([...m.rapor.csv.basliklar])];
  for (const y of sonuc.yapilar) {
    const r = y.risk;
    const yapiAlanlari = [y.yapiIsim, r?.seviye ?? '', sayi(r?.Ae), sayi(r?.Nd, 5), sayi(r?.Nc, 5), sayi(r?.E, 3)];
    if (y.satirlar.length === 0) {
      const aciklama = y.hatalar.length ? y.hatalar.join(' ') : m.rapor.csv.paratonerYok;
      satirlar.push(satir([...yapiAlanlari, '', '', '', '', '', '', '', '', '', aciklama, y.nihai.etiket]));
      continue;
    }
    for (const s of y.satirlar) {
      satirlar.push(
        satir([
          ...yapiAlanlari,
          s.paratonerIsim,
          s.paratonerId === y.birincilParatonerId ? evet : '',
          s.gecerli ? (s.deltaT ?? '') : '',
          s.gecerli ? sayi(s.gercekH) : '',
          s.gecerli ? sayi(s.rp) : '',
          s.gecerli ? sayi(s.enYakin) : '',
          s.gecerli ? sayi(s.enUzak) : '',
          s.gecerli ? sayi(s.marjEnYakin) : '',
          s.gecerli ? sayi(s.marjEnUzak) : '',
          s.gecerli ? s.durum : s.neden,
          y.nihai.etiket,
        ]),
      );
    }
  }
  return satirlar.join('\r\n');
}
