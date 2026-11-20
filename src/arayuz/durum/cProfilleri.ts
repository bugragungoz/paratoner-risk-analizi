// C profilleri: sık kullanılan yapı türleri için kullanıcının kendi tanımladığı risk katsayısı
// takımları. Uygulama ayarlarında (bu bilgisayarda) saklanır ve bütün projelerde kullanılır.
//
// Bir profil yalnızca standart tablodaki değerleri taşıyabilir. Boş bırakılan katsayı "yapıda
// seçilir" demektir: profil uygulandığında o katsayıya dokunulmaz. C1 (çevre) yapının türüne değil
// sahadaki konumuna bağlı olduğundan örnek profillerde boş bırakılmıştır.

import { MALZEMELER, standartCMi, yapiTipleri, type C2Secimi, type Malzeme } from '../../core';
import type { Metinler } from '../../dil';
import { tr as TR } from '../../dil/tr';

export interface CProfili {
  id: string;
  ad: string;
  C1: number | null;
  C2_secim: C2Secimi | null;
  C3: number | null;
  C4: number | null;
  C5: number | null;
}

export type TekliC = 'C1' | 'C3' | 'C4' | 'C5';
export const TEKLI_C: readonly TekliC[] = ['C1', 'C3', 'C4', 'C5'];

/** Profil adı için üst sınır (liste ve rapor tablosu taşmasın). */
export const PROFIL_ADI_SINIRI = 40;
export const PROFIL_SAYISI_SINIRI = 60;

export function yeniProfilKimligi(): string {
  return `prf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function bosProfil(ad: string = TR.cProfil.yeniProfil): CProfili {
  return { id: yeniProfilKimligi(), ad, C1: null, C2_secim: null, C3: null, C4: null, C5: null };
}

/** İlk kurulumdaki örnek profiller (adları `m` dilinde). Başlangıç noktasıdır; kullanıcı kendi uygulamasına göre düzenler. */
export function ornekProfiller(m: Metinler = TR): CProfili[] {
  return yapiTipleri(m).filter((t) => t.deger !== 'diger').map((t) => ({
    id: `ornek_${t.deger}`,
    ad: t.etiket,
    C1: null,
    C2_secim: { ...t.C2_secim },
    C3: t.C3,
    C4: t.C4,
    C5: t.C5,
  }));
}

const malzemeMi = (x: unknown): x is Malzeme => typeof x === 'string' && (MALZEMELER as readonly string[]).includes(x);

function profilOku(x: unknown, sira: number): CProfili | null {
  if (typeof x !== 'object' || x === null) return null;
  const p = x as Record<string, unknown>;
  const ad = typeof p.ad === 'string' ? p.ad.trim().slice(0, PROFIL_ADI_SINIRI) : '';
  if (!ad) return null;
  const c = (k: TekliC) => (typeof p[k] === 'number' && standartCMi(k, p[k]) ? p[k] : null);
  const s = typeof p.C2_secim === 'object' && p.C2_secim !== null ? (p.C2_secim as Record<string, unknown>) : null;
  return {
    id: typeof p.id === 'string' && p.id ? p.id : `prf_okunan_${sira}`,
    ad,
    C1: c('C1'),
    C2_secim: s && malzemeMi(s.yapi) && malzemeMi(s.cati) ? { yapi: s.yapi, cati: s.cati } : null,
    C3: c('C3'),
    C4: c('C4'),
    C5: c('C5'),
  };
}

/**
 * Kayıtlı profilleri okur. Kayıt hiç yoksa örnek profiller döner; kullanıcı hepsini sildiyse boş
 * liste korunur. Standart dışı değerler ve bozuk kayıtlar atılır, kimlikler tekilleştirilir.
 */
export function profilleriOku(kayit: unknown, m: Metinler = TR): CProfili[] {
  if (!Array.isArray(kayit)) return ornekProfiller(m);
  const gorulen = new Set<string>();
  const profiller: CProfili[] = [];
  kayit.slice(0, PROFIL_SAYISI_SINIRI).forEach((x, i) => {
    const p = profilOku(x, i);
    if (!p) return;
    if (gorulen.has(p.id)) p.id = `${p.id}_${i}`;
    gorulen.add(p.id);
    profiller.push(p);
  });
  return profiller;
}

/** Yapı formundaki katsayı durumu. */
export interface FormKatsayilari {
  C: Record<TekliC, number | null>;
  c2Secim: Partial<C2Secimi>;
}

/** Profili forma uygular: profilde tanımlı katsayılar yazılır, boş olanlar olduğu gibi kalır. */
export function profiliUygula(profil: CProfili, mevcut: FormKatsayilari): FormKatsayilari {
  const C = { ...mevcut.C };
  for (const k of TEKLI_C) if (profil[k] !== null) C[k] = profil[k];
  return { C, c2Secim: profil.C2_secim ? { ...profil.C2_secim } : mevcut.c2Secim };
}

/** Profilde kaç katsayı tanımlı (C2 dahil, en fazla 5). */
export function tanimliKatsayiSayisi(p: CProfili): number {
  return TEKLI_C.filter((k) => p[k] !== null).length + (p.C2_secim ? 1 : 0);
}

/**
 * Yapının kayıtlı tipinden profil adı. Eski projelerde tip, yerleşik bir anahtardır ("kumes");
 * yeni kayıtlarda doğrudan profilin adıdır. "diger" ve boş değer "profil yok" demektir.
 */
export function tiptenProfilAdi(tip: string | undefined | null, m: Metinler = TR): string {
  const t = (tip ?? '').trim();
  if (!t || t === 'diger') return '';
  return yapiTipleri(m).find((x) => x.deger === t)?.etiket ?? t;
}
