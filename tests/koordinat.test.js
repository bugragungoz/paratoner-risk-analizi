// Koordinat dönüşümleri ve elipsoit geometrisi, çekirdekten ve proj4'ten bağımsız formüllerle
// doğrulanır: Transverse Mercator için Krüger serisi, kısa mesafeler için elipsoidin eğrilik
// yarıçapları (meridyen M, birinci düşey N).
import { describe, test, expect } from 'vitest';
import * as ck from '../src/core';
import { KURE_MODELI } from './veri/kureModeli';

const a = 6378137;
const f = 1 / 298.257222101; // GRS80
const e2 = f * (2 - f);
const rad = Math.PI / 180;

/** Krüger serisiyle Transverse Mercator (Karney 2011, üç terim; hata < 0,1 mm). */
function krugerTM(lat, lng, { lat0 = 0, lon0, x0 = 0, y0 = 0 }) {
  const n = f / (2 - f);
  const A = (a / (1 + n)) * (1 + n ** 2 / 4 + n ** 4 / 64);
  const al = [n / 2 - (2 * n ** 2) / 3 + (5 * n ** 3) / 16, (13 * n ** 2) / 48 - (3 * n ** 3) / 5, (61 * n ** 3) / 240];
  const e = Math.sqrt(e2);
  const xiEta = (phi, lam) => {
    const t = Math.sinh(Math.atanh(Math.sin(phi)) - e * Math.atanh(e * Math.sin(phi)));
    const xp = Math.atan2(t, Math.cos(lam));
    const ep = Math.atanh(Math.sin(lam) / Math.sqrt(1 + t * t));
    let xi = xp;
    let eta = ep;
    al.forEach((alj, i) => {
      const j = i + 1;
      xi += alj * Math.sin(2 * j * xp) * Math.cosh(2 * j * ep);
      eta += alj * Math.cos(2 * j * xp) * Math.sinh(2 * j * ep);
    });
    return [xi, eta];
  };
  const [xi, eta] = xiEta(lat * rad, (lng - lon0) * rad);
  const [xi0] = xiEta(lat0 * rad, 0);
  return { x: x0 + A * eta, y: y0 + A * (xi - xi0) };
}

/** Enlemdeki eğrilik yarıçapları: 1 m kuzey = 1/M radyan, 1 m doğu = 1/(N·cos φ) radyan. */
function yaricaplar(lat) {
  const s2 = Math.sin(lat * rad) ** 2;
  return { M: (a * (1 - e2)) / (1 - e2 * s2) ** 1.5, N: a / Math.sqrt(1 - e2 * s2) };
}
/** Orijinden (doğu, kuzey) metre uzaklıktaki nokta (kısa mesafede hata milimetrenin çok altında). */
function kaydir(o, dogu, kuzey) {
  const { M, N } = yaricaplar(o.lat);
  return { lat: o.lat + kuzey / M / rad, lng: o.lng + dogu / (N * Math.cos(o.lat * rad)) / rad };
}

describe('TUREF / TM dilimleri', () => {
  test('boylama göre dilim ve EPSG kodu', () => {
    expect([25, 27, 28.4, 28.6, 31.4, 33, 40.4, 44, 46].map(ck.turefDilimi)).toEqual([27, 27, 27, 30, 30, 33, 39, 45, 45]);
    expect(ck.TUREF_DILIMLERI.map(ck.turefEpsg)).toEqual([5253, 5254, 5255, 5256, 5257, 5258, 5259]);
  });

  test.each([
    [30, 40.7, 31.45],
    [33, 39.92, 32.85],
    [36, 37.0, 35.32],
    [42, 38.5, 43.4],
  ])('TM%i: dilim kenarına yakın noktada Krüger serisiyle 1 mm içinde', (dilim, lat, lng) => {
    const p = ck.turefDuzlemi(dilim).ileri({ lat, lng });
    const r = krugerTM(lat, lng, { lon0: dilim, x0: 500000 });
    expect(Math.abs(p.x - r.x)).toBeLessThan(0.001);
    expect(Math.abs(p.y - r.y)).toBeLessThan(0.001);
  });

  test('ileri ve geri dönüşüm aynı noktaya döner', () => {
    const d = ck.turefDuzlemi(30);
    const n = { lat: 40.71234567, lng: 31.0987654 };
    const g = d.geri(d.ileri(n));
    expect(Math.abs(g.lat - n.lat)).toBeLessThan(1e-9);
    expect(Math.abs(g.lng - n.lng)).toBeLessThan(1e-9);
  });
});

describe('Yerel düzlem', () => {
  test('orijin (0, 0); Krüger serisiyle 1 mm içinde', () => {
    const o = { lat: 39.9, lng: 32.8 };
    const d = ck.yerelDuzlem(o);
    expect(d.ileri(o).x).toBeCloseTo(0, 6);
    expect(d.ileri(o).y).toBeCloseTo(0, 6);
    const n = { lat: 39.9031, lng: 32.8047 };
    const p = d.ileri(n);
    const r = krugerTM(n.lat, n.lng, { lat0: o.lat, lon0: o.lng });
    expect(Math.abs(p.x - r.x)).toBeLessThan(0.001);
    expect(Math.abs(p.y - r.y)).toBeLessThan(0.001);
  });
});

describe('M14: mesafe, alan ve kapsama elipsoit üzerinde', () => {
  test.each([36, 40, 42])('enlem %i°: 60 m doğu ve 60 m kuzey, 1 mm içinde ölçülür', (lat) => {
    const p = { lat, lng: 30 };
    for (const [dx, dy] of [[60, 0], [0, 60], [-42.43, 42.43]]) {
      const hedef = kaydir(p, dx, dy);
      expect(Math.abs(ck.elipsoitMesafe(p, hedef) - Math.hypot(dx, dy))).toBeLessThan(0.001);
      // Tek köşeli "poligon": en uzak mesafe aynı nokta.
      expect(Math.abs(ck.paratonerYapiMesafeleri(p, [hedef]).enUzak - Math.hypot(dx, dy))).toBeLessThan(0.001);
    }
  });

  test('60 × 25 m dikdörtgen: alan 1500 m², çevre 170 m', () => {
    const o = { lat: 41.2, lng: 36.3 };
    const poligon = [kaydir(o, 0, 0), kaydir(o, 60, 0), kaydir(o, 60, 25), kaydir(o, 0, 25)];
    const { alan, cevre } = ck.poligonAlanCevre(poligon);
    expect(Math.abs(alan - 1500)).toBeLessThan(0.01);
    expect(Math.abs(cevre - 170)).toBeLessThan(0.001);
  });

  test('Rp = 60 m dairesinin 10 cm doğusundaki köşe: eski küre modeli "korunuyor" diyordu, elipsoit demiyor', () => {
    const pr = { lat: 40, lng: 30 };
    // Dairenin doğu kenarına uzanan 4 × 4 m kare; en uzak köşesi gerçek 60,10 m doğuda (kuzeyde 0).
    const yapi = [kaydir(pr, 56.1, -2), kaydir(pr, 60.1, 0), kaydir(pr, 56.1, 2)];
    const daireler = [{ merkez: pr, yaricapM: 60 }];
    expect(ck.paratonerYapiMesafeleri(pr, yapi).enUzak).toBeGreaterThan(60.09);
    expect(ck.yapiKapsamaAnalizi(daireler, yapi).tamamenKorunuyorMu).toBe(false);
    // Küre doğu-batı mesafesini ~%0,25 kısa ölçer: 60,10 m'lik köşeyi 59,95 m görür.
    expect(KURE_MODELI.mesafeler(pr, yapi).enUzak).toBeLessThan(60);
    expect(KURE_MODELI.kapsama(daireler, yapi).tamamenKorunuyorMu).toBe(true);
  });

  test('kapsanan ve açıkta kalan alanlar coğrafi koordinatla döner (harita için)', () => {
    const pr = { lat: 38, lng: 27.1 };
    const yapi = [kaydir(pr, 40, -10), kaydir(pr, 80, -10), kaydir(pr, 80, 10), kaydir(pr, 40, 10)];
    const k = ck.yapiKapsamaAnalizi([{ merkez: pr, yaricapM: 60 }], yapi);
    expect(k.tamamenKorunuyorMu).toBe(false);
    expect(k.kapsamaOrani).toBeGreaterThan(0.4);
    expect(k.kapsamaOrani).toBeLessThan(0.6);
    const koseler = [...k.kapsananGeoJSON.geometry.coordinates.flat(2), ...k.acikGeoJSON.geometry.coordinates.flat(2)];
    for (let i = 0; i < koseler.length; i += 2) {
      expect(Math.abs(koseler[i] - 27.1)).toBeLessThan(0.002); // boylam
      expect(Math.abs(koseler[i + 1] - 38)).toBeLessThan(0.002); // enlem
    }
  });
});
