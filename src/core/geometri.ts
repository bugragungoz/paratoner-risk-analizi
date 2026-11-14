// Coğrafi hesaplar: alan/çevre, Ae, paratoner–yapı mesafeleri, çoklu paratoner kapsama analizi.
// v5 ile aynı Turf fonksiyonları ve aynı işlem sırası kullanılır; böylece eski motorla
// karşılaştırmalı testlerde sonuçlar birebir aynı çıkar (bilinçli düzeltmeler hariç).

import {
  area,
  booleanPointInPolygon,
  circle,
  difference,
  featureCollection,
  intersect,
  kinks,
  length,
  lineString,
  point,
  pointToLineDistance,
  polygon,
  union,
} from '@turf/turf';
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import type { LatLng, Yapi } from './tipler';

const DUNYA_YARICAPI_M = 6371000;
/** Koruma dairesini yaklaşıklayan çokgenin kenar sayısı. İç teğet çokgen olduğu için güvenli yöndedir. */
export const DAIRE_ADIMI = 128;

export type Alan = Feature<Polygon | MultiPolygon>;

/** İki nokta arası büyük daire mesafesi (m), Haversine. */
export function haversineMesafe(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return DUNYA_YARICAPI_M * c;
}

function kapaliHalka(poligon: LatLng[]): Position[] {
  const coords: Position[] = poligon.map((n) => [n.lng, n.lat]);
  const ilk = coords[0];
  const son = coords[coords.length - 1];
  if (ilk && son && (ilk[0] !== son[0] || ilk[1] !== son[1])) coords.push(ilk);
  return coords;
}

export function poligonaDonustur(poligon: LatLng[]): Feature<Polygon> {
  return polygon([kapaliHalka(poligon)]);
}

/** Poligonun alanı (m²) ve çevresi (m). */
export function poligonAlanCevre(poligon: LatLng[]): { alan: number; cevre: number } {
  if (!poligon || poligon.length < 3) return { alan: 0, cevre: 0 };
  const f = poligonaDonustur(poligon);
  return { alan: area(f), cevre: length(f, { units: 'kilometers' }) * 1000 };
}

/** Nokta poligonun içinde ya da kenarında mı? */
export function noktaPoligondaMi(nokta: LatLng, poligon: LatLng[]): boolean {
  if (!poligon || poligon.length < 3) return false;
  return booleanPointInPolygon(point([nokta.lng, nokta.lat]), poligonaDonustur(poligon));
}

/** İki poligonun ortak alanı (m²); geçersiz geometride 0. */
export function poligonCakismaAlani(a: LatLng[], b: LatLng[]): number {
  if (!a || !b || a.length < 3 || b.length < 3) return 0;
  try {
    const ortak = intersect(featureCollection([poligonaDonustur(a), poligonaDonustur(b)]));
    return ortak ? area(ortak) : 0;
  } catch {
    return 0;
  }
}

/** Poligon kendi kendini kesiyor mu (geçersiz çizim)? */
export function poligonKendiniKesiyorMu(poligon: LatLng[]): boolean {
  if (!poligon || poligon.length < 4) return false;
  return kinks(poligonaDonustur(poligon)).features.length > 0;
}

/**
 * Etkin eşdeğer alan: Ae = A + 3H·P + 9πH² (dikdörtgende L·W + 6H(L+W) + 9πH²).
 * Dışbükey poligonda 3H tamponlu alanın tam karşılığıdır; içbükeyde güvenli yönde büyük çıkar.
 */
export function aeHesapla(yapi: Pick<Yapi, 'manuelBoyut' | 'L_m' | 'W_m' | 'H_m' | 'poligon'>): {
  alan: number;
  cevre: number;
  Ae: number;
} {
  const H = yapi.H_m ?? 0;
  if (yapi.manuelBoyut && yapi.L_m && yapi.W_m) {
    const L = yapi.L_m;
    const W = yapi.W_m;
    return { alan: L * W, cevre: 2 * (L + W), Ae: L * W + 6 * H * (L + W) + 9 * Math.PI * H * H };
  }
  const { alan, cevre } = poligonAlanCevre(yapi.poligon);
  return { alan, cevre, Ae: alan + 6 * H * (cevre / 2) + 9 * Math.PI * H * H };
}

/**
 * Paratonerden yapıya en yakın (kenar) ve en uzak (köşe) mesafe, m.
 * Paratoner yapının içindeyse (çatısındaysa) en yakın mesafe 0'dır (M10).
 */
export function paratonerYapiMesafeleri(paratoner: LatLng, poligon: LatLng[]): { enYakin: number; enUzak: number } | null {
  if (!poligon || poligon.length === 0) return null;
  const enUzak = Math.max(...poligon.map((n) => haversineMesafe(paratoner.lat, paratoner.lng, n.lat, n.lng)));

  const prNokta = point([paratoner.lng, paratoner.lat]);
  if (poligon.length >= 3 && booleanPointInPolygon(prNokta, poligonaDonustur(poligon))) {
    return { enYakin: 0, enUzak };
  }
  const enYakin = pointToLineDistance(prNokta, lineString(kapaliHalka(poligon)), { units: 'kilometers' }) * 1000;
  return { enYakin, enUzak };
}

export interface KorumaDairesi {
  merkez: LatLng;
  yaricapM: number;
}

export interface KapsamaAnalizi {
  /** Yapının koruma altındaki kısmı (harita: yeşil). */
  kapsananGeoJSON: Alan | null;
  /** Yapının koruma dışında kalan kısmı (harita: kırmızı). */
  acikGeoJSON: Alan | null;
  tamamenKorunuyorMu: boolean;
  hicKorumaYokMu: boolean;
  /** 0–1 arası: yapı alanının kapsanan oranı. */
  kapsamaOrani: number;
  geometriHatasi: boolean;
}

/** Birden çok koruma dairesinin birleşiminin yapı poligonuyla kesişimi. */
export function yapiKapsamaAnalizi(daireler: KorumaDairesi[], poligon: LatLng[]): KapsamaAnalizi {
  const bos = (acik: Alan | null): KapsamaAnalizi => ({
    kapsananGeoJSON: null,
    acikGeoJSON: acik,
    tamamenKorunuyorMu: false,
    hicKorumaYokMu: true,
    kapsamaOrani: 0,
    geometriHatasi: false,
  });
  if (!poligon || poligon.length < 3) return bos(null);

  const poligonFeature = poligonaDonustur(poligon);
  const gecerli = daireler.filter((d) => d.yaricapM && d.yaricapM > 0);
  if (gecerli.length === 0) return bos(poligonFeature);

  let birlesik: Alan | null = null;
  try {
    const daireFeatures: Alan[] = gecerli.map((d) =>
      circle(point([d.merkez.lng, d.merkez.lat]), d.yaricapM, { units: 'meters', steps: DAIRE_ADIMI }),
    );
    birlesik = daireFeatures.reduce((acc, f) => {
      try {
        return union(featureCollection([acc, f])) || acc;
      } catch {
        return acc;
      }
    });
  } catch {
    birlesik = null;
  }
  if (!birlesik) return bos(poligonFeature);

  let kapsanan: Alan | null = null;
  let acik: Alan | null = null;
  let geometriHatasi = false;
  try {
    kapsanan = intersect(featureCollection([birlesik, poligonFeature]));
  } catch {
    kapsanan = null;
    geometriHatasi = true;
  }
  try {
    acik = difference(featureCollection<Polygon | MultiPolygon>([poligonFeature, birlesik]));
  } catch {
    acik = null;
    geometriHatasi = true;
  }
  if (geometriHatasi) {
    return { kapsananGeoJSON: null, acikGeoJSON: null, tamamenKorunuyorMu: false, hicKorumaYokMu: false, kapsamaOrani: 0, geometriHatasi: true };
  }

  const poligonAlani = area(poligonFeature);
  const kapsananAlani = kapsanan ? area(kapsanan) : 0;
  const oran = poligonAlani > 0 ? kapsananAlani / poligonAlani : 0;
  return {
    kapsananGeoJSON: kapsanan,
    acikGeoJSON: acik,
    tamamenKorunuyorMu: oran > 0.995 && !acik,
    hicKorumaYokMu: oran === 0,
    kapsamaOrani: oran,
    geometriHatasi: false,
  };
}
