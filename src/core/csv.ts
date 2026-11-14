// Hesap tablosunun CSV metni (noktalı virgül ayraç, ondalık virgül — Türkçe Excel ile uyumlu).

import { sayi } from './bicim';
import type { ProjeSonucu } from './hesap';

function hucre(deger: unknown): string {
  const s = String(deger ?? '');
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_BASLIKLARI = [
  'Yapı', 'Gerekli Seviye', 'Ae (m²)', 'Nd', 'Nc', 'E',
  'Paratoner', 'Birincil', 'ΔT (µs)', 'h (m)', 'Rp (m)',
  'Mesafe en yakın (m)', 'Mesafe en uzak (m)', 'Marj en yakın (m)', 'Marj en uzak (m)',
  'Satır durumu', 'Nihai durum',
] as const;

export function hesapTablosuCsv(sonuc: ProjeSonucu): string {
  const satirlar: string[] = [CSV_BASLIKLARI.map(hucre).join(';')];
  for (const y of sonuc.yapilar) {
    const r = y.risk;
    const yapiAlanlari = [y.yapiIsim, r?.seviye ?? '', sayi(r?.Ae), sayi(r?.Nd, 5), sayi(r?.Nc, 5), sayi(r?.E, 3)];
    if (y.satirlar.length === 0) {
      const aciklama = y.hatalar.length ? y.hatalar.join(' ') : 'Paratoner yok';
      satirlar.push([...yapiAlanlari, '', '', '', '', '', '', '', '', '', aciklama, y.nihai.etiket].map(hucre).join(';'));
      continue;
    }
    for (const s of y.satirlar) {
      satirlar.push(
        [
          ...yapiAlanlari,
          s.paratonerIsim,
          s.paratonerId === y.birincilParatonerId ? 'Evet' : '',
          s.gecerli ? (s.deltaT ?? '') : '',
          s.gecerli ? sayi(s.gercekH) : '',
          s.gecerli ? sayi(s.rp) : '',
          s.gecerli ? sayi(s.enYakin) : '',
          s.gecerli ? sayi(s.enUzak) : '',
          s.gecerli ? sayi(s.marjEnYakin) : '',
          s.gecerli ? sayi(s.marjEnUzak) : '',
          s.gecerli ? s.durum : s.neden,
          y.nihai.etiket,
        ]
          .map(hucre)
          .join(';'),
      );
    }
  }
  return satirlar.join('\r\n');
}
