// Coğrafi hesaplar: alan/çevre, Ae, paratoner–yapı mesafeleri, çoklu paratoner kapsama analizi.
//
// Metrik hesaplar elipsoit üzerinde, yapının (ya da paratonerin) çevresindeki yerel Transverse
// Mercator düzleminde yapılır (koordinat.ts). Dünyayı küre kabul eden eski hesap doğu-batı yönünde
// mesafeyi %0,26'ya kadar kısa ölçüyordu (M14).
//
// Hesap motoru geometriyi `GeometriModeli` üzerinden kullanır. v5 ile karşılaştırma testleri eski
// küresel modeli verip motorun geri kalanının birebir aynı sonuç verdiğini doğrular.

import { booleanPointInPolygon, difference, featureCollection, intersect, kinks, point, polygon, union } from '@turf/turf';
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import { koseOrtalamasi, yerelDuzlem, type Duzlem, type XY } from './koordinat';
import type { LatLng, Yapi } from './tipler';

/** Koruma dairesini yaklaşıklayan çokgenin kenar sayısı. İç teğet çokgen olduğu için güvenli yöndedir. */
export const DAIRE_ADIMI = 128;

export type Alan = Feature<Polygon | MultiPolygon>;

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

// ---------------------------------------------------------------- Düzlem geometrisi

/** Poligonun düzlemdeki kapalı halkası ([x, y] metre). */
function duzlemHalkasi(poligon: LatLng[], d: Duzlem): Position[] {
  const halka: Position[] = poligon.map((n) => {
    const p = d.ileri(n);
    return [p.x, p.y];
  });
  const ilk = halka[0];
  const son = halka[halka.length - 1];
  if (ilk && son && (ilk[0] !== son[0] || ilk[1] !== son[1])) halka.push([ilk[0]!, ilk[1]!]);
  return halka;
}

/** Kapalı halkanın alanı (m², işaretsiz; Gauss alan formülü). */
function halkaAlani(halka: Position[]): number {
  let t = 0;
  for (let i = 1; i < halka.length; i++) {
    const [x1, y1] = halka[i - 1]!;
    const [x2, y2] = halka[i]!;
    t += x1! * y2! - x2! * y1!;
  }
  return Math.abs(t) / 2;
}

function halkaCevresi(halka: Position[]): number {
  let t = 0;
  for (let i = 1; i < halka.length; i++) t += Math.hypot(halka[i]![0]! - halka[i - 1]![0]!, halka[i]![1]! - halka[i - 1]![1]!);
  return t;
}

/** Düzlemdeki (Polygon/MultiPolygon) alanın büyüklüğü: dış halkalar eksi delikler. */
function duzlemAlani(f: Alan): number {
  const poligonlar = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  return poligonlar.reduce((t, halkalar) => t + halkalar.reduce((u, h, i) => u + (i === 0 ? 1 : -1) * halkaAlani(h), 0), 0);
}

/** Düzlemdeki alanı coğrafi koordinata ([boylam, enlem]) çevirir. */
function cografiye(f: Alan, d: Duzlem): Alan {
  const cevir = (h: Position[]): Position[] =>
    h.map(([x, y]) => {
      const n = d.geri({ x: x!, y: y! });
      return [n.lng, n.lat];
    });
  const geometry: Polygon | MultiPolygon =
    f.geometry.type === 'Polygon'
      ? { type: 'Polygon', coordinates: f.geometry.coordinates.map(cevir) }
      : { type: 'MultiPolygon', coordinates: f.geometry.coordinates.map((p) => p.map(cevir)) };
  return { ...f, geometry };
}

/** Noktanın bir doğru parçasına en kısa mesafesi. */
function parcayaMesafe(p: XY, a: XY, b: XY): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const uzunluk2 = dx * dx + dy * dy;
  const t = uzunluk2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / uzunluk2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Nokta çokgenin içinde mi (ışın yöntemi; kenar üzerindeki nokta için mesafe zaten 0 çıkar). */
function duzlemdeIcinde(p: XY, kose: XY[]): boolean {
  let ic = false;
  for (let i = 0, j = kose.length - 1; i < kose.length; j = i++) {
    const a = kose[i]!;
    const b = kose[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) ic = !ic;
  }
  return ic;
}

/** Merkezi ve yarıçapı verilen dairenin iç teğet çokgeni (düzlemde). */
function daireCokgeni(merkez: XY, yaricap: number): Feature<Polygon> {
  const halka: Position[] = [];
  for (let i = 0; i < DAIRE_ADIMI; i++) {
    const a = (2 * Math.PI * i) / DAIRE_ADIMI;
    halka.push([merkez.x + yaricap * Math.cos(a), merkez.y + yaricap * Math.sin(a)]);
  }
  halka.push([halka[0]![0]!, halka[0]![1]!]);
  return polygon([halka]);
}

// ---------------------------------------------------------------- Ölçüler

/** Poligonun alanı (m²) ve çevresi (m). */
export function poligonAlanCevre(poligon: LatLng[]): { alan: number; cevre: number } {
  if (!poligon || poligon.length < 3) return { alan: 0, cevre: 0 };
  const halka = duzlemHalkasi(poligon, yerelDuzlem(koseOrtalamasi(poligon)));
  return { alan: halkaAlani(halka), cevre: halkaCevresi(halka) };
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
    const d = yerelDuzlem(koseOrtalamasi([...a, ...b]));
    const ortak = intersect(featureCollection([polygon([duzlemHalkasi(a, d)]), polygon([duzlemHalkasi(b, d)])]));
    return ortak ? duzlemAlani(ortak) : 0;
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
export function aeHesapla(
  yapi: Pick<Yapi, 'manuelBoyut' | 'L_m' | 'W_m' | 'H_m' | 'poligon'>,
  model: GeometriModeli = ELIPSOIT_MODELI,
): {
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
  const { alan, cevre } = model.alanCevre(yapi.poligon);
  return { alan, cevre, Ae: alan + 6 * H * (cevre / 2) + 9 * Math.PI * H * H };
}

/**
 * Paratonerden yapıya en yakın (kenar) ve en uzak (köşe) mesafe, m.
 * Paratoner yapının içindeyse (çatısındaysa) en yakın mesafe 0'dır (M10).
 */
export function paratonerYapiMesafeleri(paratoner: LatLng, poligon: LatLng[]): { enYakin: number; enUzak: number } | null {
  if (!poligon || poligon.length === 0) return null;
  // Paratoner, kendi yerel düzleminin orijinidir.
  const d = yerelDuzlem(paratoner);
  const kose = poligon.map((n) => d.ileri(n));
  const enUzak = Math.max(...kose.map((k) => Math.hypot(k.x, k.y)));
  const o: XY = { x: 0, y: 0 };
  if (kose.length >= 3 && duzlemdeIcinde(o, kose)) return { enYakin: 0, enUzak };
  if (kose.length === 1) return { enYakin: enUzak, enUzak };
  let enYakin = Infinity;
  for (let k = 0; k < kose.length; k++) enYakin = Math.min(enYakin, parcayaMesafe(o, kose[k]!, kose[(k + 1) % kose.length]!));
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

  // Bütün geometri yapının yerel düzleminde kurulur; sonuç haritaya coğrafi koordinatla döner.
  const d = yerelDuzlem(koseOrtalamasi(poligon));
  const yapi = polygon([duzlemHalkasi(poligon, d)]);

  let birlesik: Alan | null = null;
  try {
    const daireFeatures: Alan[] = gecerli.map((dr) => daireCokgeni(d.ileri(dr.merkez), dr.yaricapM));
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
    kapsanan = intersect(featureCollection([birlesik, yapi]));
  } catch {
    kapsanan = null;
    geometriHatasi = true;
  }
  try {
    acik = difference(featureCollection<Polygon | MultiPolygon>([yapi, birlesik]));
  } catch {
    acik = null;
    geometriHatasi = true;
  }
  if (geometriHatasi) {
    return { kapsananGeoJSON: null, acikGeoJSON: null, tamamenKorunuyorMu: false, hicKorumaYokMu: false, kapsamaOrani: 0, geometriHatasi: true };
  }

  const poligonAlani = duzlemAlani(yapi);
  const kapsananAlani = kapsanan ? duzlemAlani(kapsanan) : 0;
  const oran = poligonAlani > 0 ? kapsananAlani / poligonAlani : 0;
  return {
    kapsananGeoJSON: kapsanan ? cografiye(kapsanan, d) : null,
    acikGeoJSON: acik ? cografiye(acik, d) : null,
    tamamenKorunuyorMu: oran > 0.995 && !acik,
    hicKorumaYokMu: oran === 0,
    kapsamaOrani: oran,
    geometriHatasi: false,
  };
}

/**
 * Yapının tamamı tek bir koruma dairesinin içinde: bütün köşeleri dairenin içindeyse çokgenin
 * tamamı da içindedir (daire dışbükeydir). Çokgen yaklaşımı (iç teğet 128-gen, kenar ortalarında
 * yarıçapın ~%0,03'ü kadar içeride) bu durumu köşe daireye çok yakınsa kaçırabildiği için hesap
 * motoru bu kesin sonucu kullanır (M15).
 */
export function tamKapsama(poligon: LatLng[]): KapsamaAnalizi {
  return {
    kapsananGeoJSON: poligonaDonustur(poligon),
    acikGeoJSON: null,
    tamamenKorunuyorMu: true,
    hicKorumaYokMu: false,
    kapsamaOrani: 1,
    geometriHatasi: false,
  };
}

// ---------------------------------------------------------------- Model

/** Hesap motorunun kullandığı metrik işlemler. */
export interface GeometriModeli {
  alanCevre(poligon: LatLng[]): { alan: number; cevre: number };
  mesafeler(paratoner: LatLng, poligon: LatLng[]): { enYakin: number; enUzak: number } | null;
  kapsama(daireler: KorumaDairesi[], poligon: LatLng[]): KapsamaAnalizi;
}

/** Programın kullandığı model: elipsoit, yerel Transverse Mercator düzlemi. */
export const ELIPSOIT_MODELI: GeometriModeli = {
  alanCevre: poligonAlanCevre,
  mesafeler: paratonerYapiMesafeleri,
  kapsama: yapiKapsamaAnalizi,
};
