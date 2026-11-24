// Keşiflerin telefonda saklanması (WebView yerel depolaması; ağ yok) ve küçük yardımcılar.
// Veri biçimi masaüstüyle ortaktır: src/core/sahaKml.ts.

import type { SahaKesfi, SahaKonumu, SahaKotu, SahaParatoneri } from '../../src/core/sahaKml';

export type { SahaKesfi, SahaKonumu, SahaKotu, SahaParatoneri };

const ANAHTAR = 'paratoner_saha_kesifler_v1';

export function kimlik(on: string): string {
  return `${on}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const sayiMi = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const metin = (x: unknown, v = ''): string => (typeof x === 'string' ? x : v);

function konumOku(x: unknown): SahaKonumu | null {
  if (!x || typeof x !== 'object') return null;
  const k = x as Record<string, unknown>;
  if (!sayiMi(k.lat) || !sayiMi(k.lng) || Math.abs(k.lat) > 90 || Math.abs(k.lng) > 180) return null;
  return { lat: k.lat, lng: k.lng, dogruluk_m: sayiMi(k.dogruluk_m) ? k.dogruluk_m : null, zaman: metin(k.zaman, new Date(0).toISOString()), kaynak: k.kaynak === 'elle' ? 'elle' : 'gps' };
}

/** Kayıtlı keşifleri okur; bozuk kayıtlar atlanır (uygulama yine açılır). */
export function kesifleriOku(): SahaKesfi[] {
  try {
    const ham: unknown = JSON.parse(localStorage.getItem(ANAHTAR) ?? '[]');
    if (!Array.isArray(ham)) return [];
    return ham.flatMap((x): SahaKesfi[] => {
      if (!x || typeof x !== 'object') return [];
      const k = x as Record<string, unknown>;
      if (typeof k.id !== 'string') return [];
      const kotlar = (Array.isArray(k.kotlar) ? k.kotlar : []).flatMap((y): SahaKotu[] => {
        const t = y as Record<string, unknown>;
        return t && typeof t.id === 'string' && sayiMi(t.yukseklik_m) ? [{ id: t.id, ad: metin(t.ad), yukseklik_m: t.yukseklik_m }] : [];
      });
      const paratonerler = (Array.isArray(k.paratonerler) ? k.paratonerler : []).flatMap((y): SahaParatoneri[] => {
        const p = y as Record<string, unknown>;
        if (!p || typeof p.id !== 'string') return [];
        return [{ id: p.id, ad: metin(p.ad), kot_id: typeof p.kot_id === 'string' ? p.kot_id : null, konum: konumOku(p.konum), mast_m: sayiMi(p.mast_m) ? p.mast_m : null, not: metin(p.not) }];
      });
      const simdi = new Date().toISOString();
      return [{ id: k.id, ad: metin(k.ad), olusturma: metin(k.olusturma, simdi), guncelleme: metin(k.guncelleme, simdi), kotlar, paratonerler }];
    });
  } catch {
    return [];
  }
}

/** Yazılamazsa (depolama dolu) false; çağıran kullanıcıya bildirir. */
export function kesifleriYaz(liste: SahaKesfi[]): boolean {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(liste));
    return true;
  } catch {
    return false;
  }
}

export function yeniKesif(ad: string, zemin: string): SahaKesfi {
  const simdi = new Date().toISOString();
  return { id: kimlik('kesif'), ad, olusturma: simdi, guncelleme: simdi, kotlar: [{ id: kimlik('kot'), ad: zemin, yukseklik_m: 0 }], paratonerler: [] };
}

/** Yeni paratonerin numarası: adların sonundaki en büyük sayıdan bir fazlası. */
export function sonrakiNumara(adlar: readonly string[]): number {
  const sayilar = adlar.map((a) => Number(a.match(/(\d+)\s*$/)?.[1] ?? 0));
  return Math.max(0, ...sayilar) + 1;
}

/** Ondalık virgül ya da noktayla yazılmış sayı; boşsa null, geçersizse NaN. */
export function sayiOku(metin: string): number | null {
  const s = metin.trim().replace(/\s/g, '').replace(',', '.');
  if (!s) return null;
  return /^-?\d*\.?\d+$/.test(s) ? Number(s) : NaN;
}

/** Kotlar yüksekliğe göre sıralı. */
export const siraliKotlar = (k: SahaKesfi) => [...k.kotlar].sort((a, b) => a.yukseklik_m - b.yukseklik_m);

const TURKCE_HARF: Record<string, string> = { ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U' };

/**
 * Dosya adı: Türkçe ad, yalnızca ASCII harflerle (her bilgisayarda, e-postada ve bulut sürücüde
 * sorunsuz açılsın). "Keşif 22.11.2026" → "Kesif-22-11-2026".
 */
export function asciiDosyaAdi(ad: string, yedek = 'kesif'): string {
  const s = ad
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (h) => TURKCE_HARF[h] ?? h)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return (s || yedek).slice(0, 80);
}
