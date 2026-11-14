// Proje durum deposu: proje + geri al/yinele geçmişi.
// Proje yükleme ve yeni proje geçmişi sıfırlar (v5'te Ctrl+Z önceki projeye dönüyordu — S4).

import type { Proje } from '../../core';

export const GECMIS_SINIRI = 50;
/** Aynı birleştirme anahtarıyla bu süre içinde gelen değişiklikler tek geri alma adımı sayılır. */
export const BIRLESTIRME_SURESI_MS = 1500;

export interface DepoDurumu {
  proje: Proje | null;
  gecmis: Proje[];
  gelecek: Proje[];
  sonBirlestirme: { anahtar: string; zaman: number } | null;
}

export type Eylem =
  | { tur: 'yukle'; proje: Proje }
  | { tur: 'guncelle'; fn: (p: Proje) => Proje; birlestir?: string; zaman?: number }
  | { tur: 'geriAl' }
  | { tur: 'yinele' };

export const BOS_DEPO: DepoDurumu = { proje: null, gecmis: [], gelecek: [], sonBirlestirme: null };

export function depoIndirgeyici(d: DepoDurumu, e: Eylem): DepoDurumu {
  switch (e.tur) {
    case 'yukle':
      return { proje: e.proje, gecmis: [], gelecek: [], sonBirlestirme: null };

    case 'guncelle': {
      if (!d.proje) return d;
      const yeni = e.fn(d.proje);
      if (yeni === d.proje) return d;
      const zaman = e.zaman ?? Date.now();
      const birlestir =
        e.birlestir !== undefined &&
        d.sonBirlestirme?.anahtar === e.birlestir &&
        zaman - d.sonBirlestirme.zaman < BIRLESTIRME_SURESI_MS;
      return {
        proje: yeni,
        gecmis: birlestir ? d.gecmis : [...d.gecmis, d.proje].slice(-GECMIS_SINIRI),
        gelecek: [],
        sonBirlestirme: e.birlestir !== undefined ? { anahtar: e.birlestir, zaman } : null,
      };
    }

    case 'geriAl': {
      const onceki = d.gecmis[d.gecmis.length - 1];
      if (!onceki || !d.proje) return d;
      return { proje: onceki, gecmis: d.gecmis.slice(0, -1), gelecek: [...d.gelecek, d.proje], sonBirlestirme: null };
    }

    case 'yinele': {
      const sonraki = d.gelecek[d.gelecek.length - 1];
      if (!sonraki || !d.proje) return d;
      return { proje: sonraki, gecmis: [...d.gecmis, d.proje], gelecek: d.gelecek.slice(0, -1), sonBirlestirme: null };
    }
  }
}
