// English texts. Structure and message signatures must match tr.ts (checked by the type system).

import type { Metinler } from './index';

export const en: Metinler = {
  dil: {
    ad: 'Language',
    tr: 'Türkçe',
    en: 'English',
  },
  ortak: {
    tamam: 'OK',
    iptal: 'Cancel',
    kapat: 'Close',
    ogeSayisi: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
  },
};
