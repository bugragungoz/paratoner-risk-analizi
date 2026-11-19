// Coğrafi koordinat (WGS84 enlem/boylam) ile metrik düzlem koordinatları arasındaki dönüşümler.
//
// Bütün metrik hesaplar (mesafe, alan, kapsama) ve CAD dışa aktarımı Transverse Mercator
// izdüşümünde yapılır. TM açıları korur (konform); merkez meridyende ölçek katsayısı 1 olduğundan
// birkaç kilometrelik bir sahada uzunluk hatası milyonda birin çok altındadır.
//
// Datum: Türkiye'nin ulusal sistemi TUREF (ITRF96, GRS80 elipsoidi) ile WGS84 arasındaki fark
// metrenin altındadır ve uydu görüntüsünün kendi konum hatasından küçüktür; dönüşüm uygulanmaz.

import proj4 from 'proj4';
import type { LatLng } from './tipler';

export interface XY {
  x: number;
  y: number;
}

/** Bir metrik düzlem: x doğuya, y kuzeye doğru metre. */
export interface Duzlem {
  ileri(n: LatLng): XY;
  geri(p: XY): LatLng;
  /** proj4 tanımı (bilgi ve dışa aktarma için). */
  tanim: string;
}

const COGRAFI = '+proj=longlat +ellps=GRS80 +no_defs';

function tmTanimi(lat0: number, lon0: number, x0: number, y0: number): string {
  return `+proj=tmerc +lat_0=${lat0} +lon_0=${lon0} +k=1 +x_0=${x0} +y_0=${y0} +ellps=GRS80 +units=m +no_defs`;
}

function duzlemKur(tanim: string): Duzlem {
  const d = proj4(COGRAFI, tanim);
  return {
    tanim,
    ileri: (n) => {
      const [x, y] = d.forward([n.lng, n.lat]) as [number, number];
      return { x, y };
    },
    geri: (p) => {
      const [lng, lat] = d.inverse([p.x, p.y]) as [number, number];
      return { lat, lng };
    },
  };
}

/**
 * Orijini verilen noktada olan yerel düzlem: merkez meridyeni ve başlangıç enlemi orijinden geçen,
 * ölçek katsayısı 1 olan Transverse Mercator. Orijin (0, 0) noktasıdır.
 */
export function yerelDuzlem(orijin: LatLng): Duzlem {
  return duzlemKur(tmTanimi(orijin.lat, orijin.lng, 0, 0));
}

/** TUREF 3° dilimlerinin merkez meridyenleri (TM27 … TM45). */
export const TUREF_DILIMLERI = [27, 30, 33, 36, 39, 42, 45] as const;
export type TurefDilimi = (typeof TUREF_DILIMLERI)[number];

/** Boylama en yakın TUREF dilimi (Türkiye dışında en yakın uçtaki dilim). */
export function turefDilimi(lng: number): TurefDilimi {
  const enYakin = Math.round(lng / 3) * 3;
  return Math.min(45, Math.max(27, enYakin)) as TurefDilimi;
}

/** Dilimin EPSG kodu: TUREF / TM27 = 5253 … TUREF / TM45 = 5259. */
export function turefEpsg(dilim: TurefDilimi): number {
  return 5253 + (dilim - 27) / 3;
}

/**
 * TUREF / TM düzlemi (ITRF96, 3° dilim): ölçek katsayısı 1, sahte doğu 500 000 m, sahte kuzey 0.
 * Haritacılıktaki "Y" doğu (burada x), "X" kuzey (burada y) koordinatıdır.
 */
export function turefDuzlemi(dilim: TurefDilimi): Duzlem {
  return duzlemKur(tmTanimi(0, dilim, 500000, 0));
}

/** Poligonun köşe ortalaması: yerel düzlemin orijini için kararlı bir nokta. */
export function koseOrtalamasi(noktalar: LatLng[]): LatLng {
  const n = noktalar.length || 1;
  return {
    lat: noktalar.reduce((t, p) => t + p.lat, 0) / n,
    lng: noktalar.reduce((t, p) => t + p.lng, 0) / n,
  };
}

/** İki nokta arasındaki elipsoit üzerindeki mesafe (m), ilk noktada merkezlenen yerel düzlemde. */
export function elipsoitMesafe(a: LatLng, b: LatLng): number {
  const p = yerelDuzlem(a).ileri(b);
  return Math.hypot(p.x, p.y);
}
