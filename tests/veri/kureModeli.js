// Eski küresel geometri modeli (1.9.1'e kadar çekirdekte kullanılan): Dünya küre kabul edilir,
// mesafe Haversine, kapsama Turf ile enlem/boylam düzleminde hesaplanır.
// YALNIZCA v5 karşılaştırma testinde kullanılır: v5 motoru da küre kullandığı için, bu modelle
// çekirdeğin geri kalanının v5 ile birebir aynı sonuç verdiği doğrulanır (M14 dışındaki her şey).
import {
  area, booleanPointInPolygon, circle, difference, featureCollection, intersect, length, lineString, point,
  pointToLineDistance, polygon, union,
} from '@turf/turf';

const DUNYA_YARICAPI_M = 6371000;
const DAIRE_ADIMI = 128;

function haversine(lat1, lng1, lat2, lng2) {
  const r = (d) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return DUNYA_YARICAPI_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function kapaliHalka(poligon) {
  const c = poligon.map((n) => [n.lng, n.lat]);
  const ilk = c[0];
  const son = c[c.length - 1];
  if (ilk && son && (ilk[0] !== son[0] || ilk[1] !== son[1])) c.push(ilk);
  return c;
}
const poligonaDonustur = (p) => polygon([kapaliHalka(p)]);

function alanCevre(poligon) {
  if (!poligon || poligon.length < 3) return { alan: 0, cevre: 0 };
  const f = poligonaDonustur(poligon);
  return { alan: area(f), cevre: length(f, { units: 'kilometers' }) * 1000 };
}

function mesafeler(paratoner, poligon) {
  if (!poligon || poligon.length === 0) return null;
  const enUzak = Math.max(...poligon.map((n) => haversine(paratoner.lat, paratoner.lng, n.lat, n.lng)));
  const nokta = point([paratoner.lng, paratoner.lat]);
  if (poligon.length >= 3 && booleanPointInPolygon(nokta, poligonaDonustur(poligon))) return { enYakin: 0, enUzak };
  const enYakin = pointToLineDistance(nokta, lineString(kapaliHalka(poligon)), { units: 'kilometers' }) * 1000;
  return { enYakin, enUzak };
}

function kapsama(daireler, poligon) {
  const bos = (acik) => ({ kapsananGeoJSON: null, acikGeoJSON: acik, tamamenKorunuyorMu: false, hicKorumaYokMu: true, kapsamaOrani: 0, geometriHatasi: false });
  if (!poligon || poligon.length < 3) return bos(null);
  const pf = poligonaDonustur(poligon);
  const gecerli = daireler.filter((d) => d.yaricapM && d.yaricapM > 0);
  if (gecerli.length === 0) return bos(pf);
  let birlesik = null;
  try {
    birlesik = gecerli
      .map((d) => circle(point([d.merkez.lng, d.merkez.lat]), d.yaricapM, { units: 'meters', steps: DAIRE_ADIMI }))
      .reduce((acc, f) => {
        try {
          return union(featureCollection([acc, f])) || acc;
        } catch {
          return acc;
        }
      });
  } catch {
    birlesik = null;
  }
  if (!birlesik) return bos(pf);
  let kapsanan = null;
  let acik = null;
  let hata = false;
  try {
    kapsanan = intersect(featureCollection([birlesik, pf]));
  } catch {
    hata = true;
  }
  try {
    acik = difference(featureCollection([pf, birlesik]));
  } catch {
    hata = true;
  }
  if (hata) return { kapsananGeoJSON: null, acikGeoJSON: null, tamamenKorunuyorMu: false, hicKorumaYokMu: false, kapsamaOrani: 0, geometriHatasi: true };
  const oran = area(pf) > 0 ? (kapsanan ? area(kapsanan) : 0) / area(pf) : 0;
  return { kapsananGeoJSON: kapsanan, acikGeoJSON: acik, tamamenKorunuyorMu: oran > 0.995 && !acik, hicKorumaYokMu: oran === 0, kapsamaOrani: oran, geometriHatasi: false };
}

export const KURE_MODELI = { alanCevre, mesafeler, kapsama };
