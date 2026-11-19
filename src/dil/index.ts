// Arayüz ve çıktı metinleri. Her dil, Türkçe sözlükle aynı yapıda bir nesnedir: anahtar eksikse ya da
// bir mesajın parametreleri farklıysa tür denetimi hata verir. Sayıya ya da ada bağlı mesajlar
// fonksiyondur (ör. İngilizcede tekil/çoğul ayrımı).
//
// Kullanım: arayüzde `const m = useMetinler(); m.ortak.iptal`, React dışında `metinler(dil)`.

import { en } from './en';
import { tr } from './tr';

export type Dil = 'tr' | 'en';
export const DILLER: readonly Dil[] = ['tr', 'en'];

/** Sözlüğün tipi: Türkçe sözlükteki sabit metinler `string`, mesaj fonksiyonları aynı imzayla. */
type Genislet<T> = T extends string
  ? string
  : T extends (...a: infer A) => string
    ? (...a: A) => string
    : { readonly [K in keyof T]: Genislet<T[K]> };

export type Metinler = Genislet<typeof tr>;

const SOZLUKLER: Record<Dil, Metinler> = { tr, en };

export const dilMi = (x: unknown): x is Dil => x === 'tr' || x === 'en';

export function metinler(dil: Dil): Metinler {
  return SOZLUKLER[dil] ?? tr;
}
