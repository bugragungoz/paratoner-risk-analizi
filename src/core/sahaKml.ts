// Saha uygulamasının (Android, saha/ klasörü) keşif verisi ve KML çıktısı.
//
// Saha uygulaması hesap yapmaz: keşifte kot seviyelerini ve paratoner noktalarını (konum, doğruluk,
// düşünülen mast yüksekliği, not) tutar. Çıktı, masaüstündeki KML içe aktarmasının okuduğu şemadır
// (kml.ts başındaki alan listesi); bütün kot seviyeleri belge düzeyindeki pt_kotlar alanıyla taşınır,
// böylece paratoner yerleştirilmemiş kotlar da masaüstüne gelir.

import { aciklama, KML_SEMA_SURUMU, kmlRengi, veri, xml } from './kmlTemel';

export interface SahaKotu {
  id: string;
  ad: string;
  /** Zeminden (referans kottan) yükseklik, m. */
  yukseklik_m: number;
}

export interface SahaKonumu {
  lat: number;
  lng: number;
  /** Yatay konum doğruluğu (m, yaklaşık %68 güven); elle girilen koordinatta bilinmez. */
  dogruluk_m: number | null;
  /** ISO 8601 zaman. */
  zaman: string;
  kaynak: 'gps' | 'elle';
}

export interface SahaParatoneri {
  id: string;
  ad: string;
  kot_id: string | null;
  konum: SahaKonumu | null;
  /** Düşünülen mast yüksekliği, m (isteğe bağlı). */
  mast_m: number | null;
  not: string;
}

export interface SahaKesfi {
  id: string;
  ad: string;
  olusturma: string;
  guncelleme: string;
  kotlar: SahaKotu[];
  paratonerler: SahaParatoneri[];
}

/** Google Earth balonundaki satırlar (saha uygulamasının dilinde). */
export interface SahaKmlEtiketleri {
  klasor: string;
  kot: (ad: string, kot: string) => string;
  mast: (m: string) => string;
  dogruluk: (m: string) => string;
  elle: string;
  zaman: (z: string) => string;
  not: (n: string) => string;
  /** Kot yazımı (ör. "+3,5"). */
  kotMetni: (m: number) => string;
  sayi: (x: number) => string;
}

export interface SahaKmlSonucu {
  kml: string;
  /** Konumu kaydedilmediği için yazılmayan paratonerler. */
  konumsuz: string[];
}

const PARATONER_RENGI = '#f59e0b';

/** Belge düzeyindeki pt_kotlar alanı: [{ "ad": "Zemin", "m": 0 }, …] (JSON). */
export function kotListesiYaz(kotlar: readonly SahaKotu[]): string {
  return JSON.stringify(kotlar.map((k) => ({ ad: k.ad, m: Number(k.yukseklik_m.toFixed(3)) })));
}

/** pt_kotlar alanını okur; bozuk ya da eksik kayıtlar atlanır. */
export function kotListesiOku(metin: string | undefined): { ad: string; m: number }[] {
  if (!metin) return [];
  try {
    const liste: unknown = JSON.parse(metin);
    if (!Array.isArray(liste)) return [];
    return liste.flatMap((x) => {
      const k = x as { ad?: unknown; m?: unknown };
      return typeof k?.ad === 'string' && k.ad.trim() && typeof k.m === 'number' && Number.isFinite(k.m) ? [{ ad: k.ad.trim().slice(0, 80), m: k.m }] : [];
    });
  } catch {
    return [];
  }
}

export function sahaKmlUret(kesif: SahaKesfi, e: SahaKmlEtiketleri, uygulama: string): SahaKmlSonucu {
  const kotlar = new Map(kesif.kotlar.map((k) => [k.id, k]));
  const konumsuz: string[] = [];
  const isaretler: string[] = [];
  for (const p of kesif.paratonerler) {
    if (!p.konum) {
      konumsuz.push(p.ad);
      continue;
    }
    const kot = p.kot_id ? kotlar.get(p.kot_id) : undefined;
    const k = p.konum;
    const satirlar = [
      kot ? e.kot(kot.ad, e.kotMetni(kot.yukseklik_m)) : '',
      p.mast_m !== null ? e.mast(e.sayi(p.mast_m)) : '',
      k.dogruluk_m !== null ? e.dogruluk(e.sayi(k.dogruluk_m)) : k.kaynak === 'elle' ? e.elle : '',
      e.zaman(k.zaman),
      p.not.trim() ? e.not(p.not.trim()) : '',
    ].filter(Boolean);
    isaretler.push(
      [
        '<Placemark>',
        `<name>${xml(p.ad)}</name>`,
        aciklama(satirlar),
        '<styleUrl>#paratoner</styleUrl>',
        veri({
          pt_tur: 'paratoner',
          pt_kimlik: p.id,
          pt_kot: kot?.ad,
          pt_kot_m: kot?.yukseklik_m,
          pt_mast_m: p.mast_m,
          pt_dogruluk_m: k.dogruluk_m === null ? null : Number(k.dogruluk_m.toFixed(1)),
          pt_konum_kaynagi: k.kaynak,
          pt_zaman: k.zaman,
          pt_not: p.not.trim(),
        }),
        `<Point><coordinates>${k.lng.toFixed(8)},${k.lat.toFixed(8)},0</coordinates></Point>`,
        '</Placemark>',
      ].join(''),
    );
  }
  const kml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    `<Document><name>${xml(kesif.ad)}</name><open>1</open>`,
    `<Style id="paratoner"><IconStyle><color>${kmlRengi(PARATONER_RENGI)}</color><scale>1.1</scale></IconStyle></Style>`,
    veri({ pt_surum: KML_SEMA_SURUMU, pt_uygulama: uygulama, pt_kotlar: kotListesiYaz(kesif.kotlar) }),
    `<Folder><name>${xml(e.klasor)}</name>`,
    ...isaretler,
    '</Folder>',
    '</Document>',
    '</kml>',
    '',
  ].join('\n');
  return { kml, konumsuz };
}

