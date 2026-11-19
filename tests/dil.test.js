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
      else {
        expect(deger.length, anahtar).toBe(tr.get(anahtar).length);
        const ornek = deger(...Array.from({ length: deger.length }, () => 2));
        expect(typeof ornek === 'string' && ornek.trim() !== '', anahtar).toBe(true);
      }
    }
  });

  test('İngilizcede tekil ve çoğul ayrılır', () => {
    expect(metinler('en').ortak.ogeSayisi(1)).toBe('1 item');
    expect(metinler('en').ortak.ogeSayisi(3)).toBe('3 items');
    expect(metinler('tr').ortak.ogeSayisi(3)).toBe('3 öğe');
  });

  test('dil doğrulaması', () => {
    expect(['tr', 'en', 'de', null, 1].map(dilMi)).toEqual([true, true, false, false, false]);
  });
});
