// Sözlükler: her dilde Türkçe sözlükteki bütün anahtarlar, aynı türde ve boş olmayan değerle bulunur.
// (Tür denetimi aynı kuralı derlemede de uygular; bu test çalışma zamanında, eksik ya da boş çeviriyi yakalar.)
import { describe, test, expect } from 'vitest';
import { DILLER, dilMi, metinler } from '../src/dil';

function yapraklar(nesne, yol = '') {
  return Object.entries(nesne).flatMap(([k, v]) => (typeof v === 'object' && v !== null ? yapraklar(v, `${yol}${k}.`) : [[`${yol}${k}`, v]]));
}

describe('Sözlükler', () => {
  const tr = new Map(yapraklar(metinler('tr')));

  test.each(DILLER)('%s: anahtarlar Türkçeyle aynı, değerler dolu', (dil) => {
    const s = new Map(yapraklar(metinler(dil)));
    expect([...s.keys()].sort()).toEqual([...tr.keys()].sort());
    for (const [anahtar, deger] of s) {
      expect(typeof deger, anahtar).toBe(typeof tr.get(anahtar));
      if (typeof deger === 'string') expect(deger.trim(), anahtar).not.toBe('');
      else expect(deger.length, anahtar).toBe(tr.get(anahtar).length);
    }
  });

  test('İngilizcede tekil ve çoğul ayrılır', () => {
    expect(metinler('en').ortak.ogeSayisi(1)).toBe('1 item');
    expect(metinler('en').ortak.ogeSayisi(3)).toBe('3 items');
    expect(metinler('tr').ortak.ogeSayisi(3)).toBe('3 öğe');
  });

  test('biçim: Türkçe ondalık virgül ve %77, İngilizce nokta ve 77%', () => {
    const tr = metinler('tr').bicim;
    const en = metinler('en').bicim;
    expect([tr.sayi(3.25, 2), tr.yuzde(0.7695), tr.kot(-3), tr.kot(0), tr.csvAyrac]).toEqual(['3,25', '%76,9', '−3,0', '±0,0', ';']);
    expect([en.sayi(3.25, 2), en.yuzde(0.7695), en.kot(-3), en.kot(2.04), en.csvAyrac]).toEqual(['3.25', '76.9%', '−3.0', '+2.0', ',']);
    expect(en.tarih(new Date(2026, 10, 20))).toBe('20/11/2026');
    expect(tr.tarih(new Date(2026, 10, 20))).toBe('20.11.2026');
  });

  test('dil doğrulaması', () => {
    expect(['tr', 'en', 'de', null, 1].map(dilMi)).toEqual([true, true, false, false, false]);
  });
});
