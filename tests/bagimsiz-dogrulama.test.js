// Bağımsız doğrulama: hesap çekirdeğinin sonuçları, çekirdekten HİÇBİR fonksiyon kullanmayan
// ikinci bir yolla (elle hesap, düzlem geometri, nokta örnekleme) yeniden üretilir.
// Amaç, "kendi kendini doğrulayan" testlerin kaçırabileceği hataları yakalamaktır.
import { describe, test, expect } from 'vitest';
import * as ck from '../src/core';
import { rastgeleProje, yerelProje } from './veri/projeler';

const SEVIYELER = ['I', 'II', 'III', 'IV'];
const DELTA_T = [15, 30, 45, 60];

describe('Elle hesap: uçtan uca tek yapı', () => {
  // Yapı 40 × 20 m, H = 8 m, Nk = 25, C1 = 1, C2 = 1, C3 = 2, C4 = 1, C5 = 5; ΔT = 30 µs.
  // Paratoner çatının ortasında, direk 5 m.
  const proje = yerelProje({
    Nk: 25,
    deltaT: 30,
    yapilar: [{ id: 'y', dikdortgen: [0, 0, 40, 20], H: 8, C: { C1: 1, C2: 1, C3: 2, C4: 1, C5: 5 }, manuelBoyut: true, L_m: 40, W_m: 20 }],
    paratonerler: [{ id: 'p', x: 20, y: 10, mast: 5, yapi: 'y' }],
  });
  const y = ck.projeyiHesapla(proje).yapilar[0];

  test('risk zinciri', () => {
    const Ae = 40 * 20 + 6 * 8 * (40 + 20) + 9 * Math.PI * 8 * 8; // 5489,557
    const Ng = 0.04 * 25 ** 1.25; // 2,23607
    const Nd = Ae * Ng * 1 * 1e-6; // 0,012275
    const Nc = 5.5e-3 / (1 * 2 * 1 * 5); // 0,00055
    const E = 1 - Nc / Nd; // 0,9552
    expect(Ae).toBeCloseTo(5489.557, 2);
    expect(E).toBeCloseTo(0.9552, 4);
    expect(y.risk.Ae).toBeCloseTo(Ae, 6);
    expect(y.risk.Ng).toBeCloseTo(Ng, 10);
    expect(y.risk.Nd).toBeCloseTo(Nd, 10);
    expect(y.risk.Nc).toBeCloseTo(Nc, 12);
    expect(y.risk.E).toBeCloseTo(E, 10);
    expect(y.risk.seviye).toBe('Seviye 1');
  });

  test('koruma yarıçapı ve marj', () => {
    const s = y.satirlar[0];
    expect(s.gercekH).toBe(5);
    expect(s.rp).toBe(48); // ΔT = 30 µs, h = 5 m, Seviye I
    expect(s.enYakin).toBe(0);
    expect(s.enUzak).toBeCloseTo(Math.hypot(20, 10), 1); // 22,36 m
    expect(s.marjEnUzak).toBeCloseTo(48 - Math.hypot(20, 10), 1);
    expect(y.nihai.kod).toBe('YETERLI');
    expect(y.kapsama.kapsamaOrani).toBeCloseTo(1, 6);
  });
});

describe('Kot zinciri: kayan nokta hatası sonucu değiştirmez', () => {
  test('çatıdaki tam 2 m direk her yapı yüksekliğinde h = 2 m verir', () => {
    for (let i = 1; i <= 600; i++) {
      const H = i / 10;
      const proje = yerelProje({
        yapilar: [{ id: 'y', dikdortgen: [0, 0, 10, 10], H }],
        paratonerler: [{ id: 'p', x: 5, y: 5, mast: 2, yapi: 'y' }],
      });
      const s = ck.projeyiHesapla(proje).yapilar[0].satirlar[0];
      expect(s.gercekH, `H = ${H}`).toBe(2);
      expect(s.gecerli, `H = ${H}`).toBe(true);
    }
  });

  test('kot + direk − (kot + H) ondalık girdilerde tam değer verir', () => {
    for (const [kotP, mast, kotY, H, beklenen] of [
      [0.1, 2.2, 0, 0.3, 2],
      [1.3, 8.8, 0.1, 4, 6],
      [0, 64.1, 0, 4.1, 60],
      [2.7, 5.4, 0.6, 5.5, 2],
    ]) {
      const proje = yerelProje({
        kotlar: [['kp', kotP], ['ky', kotY]],
        yapilar: [{ id: 'y', dikdortgen: [0, 0, 10, 10], H, kot: 'ky' }],
        paratonerler: [{ id: 'p', x: 20, y: 5, mast, kot: 'kp' }],
      });
      expect(ck.gercekHHesapla(proje.paratonerler[0], proje.yapilar[0], proje)).toBe(beklenen);
      expect(ck.projeyiHesapla(proje).yapilar[0].satirlar[0].gecerli).toBe(true);
    }
  });
});

describe('Rp tablosu: güvenlik yönünden tutarlılık', () => {
  test('h arttıkça Rp azalmaz (çatı düzlemi her zaman belirleyici düzlemdir)', () => {
    for (const dT of DELTA_T) {
      for (const sv of SEVIYELER) {
        let onceki = 0;
        for (let h = 2; h <= 60; h = Math.round((h + 0.1) * 10) / 10) {
          const rp = ck.rpOku(h, sv, dT).rp;
          expect(rp, `ΔT ${dT} ${sv} h ${h}`).toBeGreaterThanOrEqual(onceki);
          onceki = rp;
        }
      }
    }
  });

  test('daha sıkı seviye ve daha küçük ΔT hiçbir zaman daha büyük Rp vermez', () => {
    for (let h = 2; h <= 60; h += 0.5) {
      for (const dT of DELTA_T) {
        const r = SEVIYELER.map((sv) => ck.rpOku(h, sv, dT).rp);
        expect(r[0]).toBeLessThanOrEqual(r[1]);
        expect(r[1]).toBeLessThanOrEqual(r[2]);
        expect(r[2]).toBeLessThanOrEqual(r[3]);
      }
      for (const sv of SEVIYELER) {
        const r = DELTA_T.map((dT) => ck.rpOku(h, sv, dT).rp);
        expect(r[0]).toBeLessThan(r[1]);
        expect(r[1]).toBeLessThan(r[2]);
        expect(r[2]).toBeLessThan(r[3]);
      }
    }
  });
});

describe('Risk: tek yönlülük', () => {
  const taban = { Ae: 8000, C1: 1, C2: 1, C3: 1, C4: 1, C5: 5 };
  const E = (ek, Nk = 25) => ck.yapiRiskAnalizi({ ...taban, ...ek }, Nk).E;
  test('risk artıran her girdi E değerini artırır', () => {
    expect(E({ Ae: 16000 })).toBeGreaterThan(E({}));
    expect(E({ C1: 2 })).toBeGreaterThan(E({}));
    expect(E({ C2: 2 })).toBeGreaterThan(E({}));
    expect(E({ C3: 2 })).toBeGreaterThan(E({}));
    expect(E({ C4: 3 })).toBeGreaterThan(E({}));
    expect(E({ C5: 10 })).toBeGreaterThan(E({}));
    expect(E({}, 40)).toBeGreaterThan(E({}, 25));
  });
});

// ---- Kapsama: çekirdekten bağımsız nokta örnekleme ----

/** Yerel düzlem (m): küçük sahalarda küresel hesapla farkı milimetre düzeyindedir. */
function duzlem(proje) {
  const tum = [...proje.yapilar.flatMap((y) => y.poligon), ...proje.paratonerler];
  const lat0 = tum.reduce((t, n) => t + n.lat, 0) / tum.length;
  const lng0 = tum.reduce((t, n) => t + n.lng, 0) / tum.length;
  const R = 6371008.8;
  const rad = Math.PI / 180;
  return (n) => [(n.lng - lng0) * rad * R * Math.cos(lat0 * rad), (n.lat - lat0) * rad * R];
}

function icindeMi([x, y], kose) {
  let ic = false;
  for (let i = 0, j = kose.length - 1; i < kose.length; j = i++) {
    const [xi, yi] = kose[i];
    const [xj, yj] = kose[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ic = !ic;
  }
  return ic;
}

/** Poligon içindeki ızgara noktalarından, en az bir koruma dairesinin içinde kalanların oranı. */
function ornekleKapsama(kose, daireler, adim) {
  const xs = kose.map((k) => k[0]);
  const ys = kose.map((k) => k[1]);
  let toplam = 0;
  let korunan = 0;
  for (let x = Math.min(...xs) + adim / 2; x < Math.max(...xs); x += adim) {
    for (let y = Math.min(...ys) + adim / 2; y < Math.max(...ys); y += adim) {
      if (!icindeMi([x, y], kose)) continue;
      toplam++;
      if (daireler.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) <= r)) korunan++;
    }
  }
  return { toplam, korunan, oran: toplam ? korunan / toplam : 0 };
}

describe('Kapsama analizi: bağımsız nokta örneklemesiyle karşılaştırma', () => {
  test('120 rastgele sahada kapsama oranı ve "tamamen korunuyor" kararı örneklemeyle uyuşur', () => {
    let karsilastirilan = 0;
    let tamKorunan = 0;
    let kismi = 0;
    for (let tohum = 1; tohum <= 120; tohum++) {
      const proje = rastgeleProje(tohum);
      const xy = duzlem(proje);
      const sonuc = ck.projeyiHesapla(proje);
      for (const y of sonuc.yapilar) {
        if (!y.kapsama || y.kapsama.geometriHatasi) continue;
        const yapi = proje.yapilar.find((p) => p.id === y.yapiId);
        const kose = yapi.poligon.map(xy);
        const daireler = y.satirlar
          .filter((s) => s.gecerli)
          .map((s) => {
            const pr = proje.paratonerler.find((p) => p.id === s.paratonerId);
            return [...xy(pr), s.rp];
          });
        const genislik = Math.max(...kose.map((k) => k[0])) - Math.min(...kose.map((k) => k[0]));
        const ornek = ornekleKapsama(kose, daireler, Math.max(0.25, genislik / 220));
        if (ornek.toplam < 200) continue;
        karsilastirilan++;
        expect(Math.abs(y.kapsama.kapsamaOrani - ornek.oran), `tohum ${tohum} ${y.yapiIsim}`).toBeLessThan(0.012);
        // Güvenlik yönü: çekirdek "tamamen korunuyor" diyorsa örneklenen HER nokta korunuyor olmalı.
        if (y.kapsama.tamamenKorunuyorMu) {
          tamKorunan++;
          expect(ornek.korunan, `tohum ${tohum} ${y.yapiIsim}`).toBe(ornek.toplam);
        } else if (ornek.oran > 0 && ornek.oran < 1) kismi++;
        // Hiç koruma yoksa örnekleme de hiç korunan nokta bulmamalı.
        if (y.kapsama.hicKorumaYokMu) expect(ornek.korunan).toBe(0);
      }
    }
    // Testin gerçekten her iki durumu da sınadığından emin ol.
    expect(karsilastirilan).toBeGreaterThan(150);
    expect(tamKorunan).toBeGreaterThan(20);
    expect(kismi).toBeGreaterThan(20);
  });

  test('satır durumu, köşe mesafelerinin düzlemde elle hesabıyla uyuşur', () => {
    for (let tohum = 200; tohum < 260; tohum++) {
      const proje = rastgeleProje(tohum);
      const xy = duzlem(proje);
      for (const y of ck.projeyiHesapla(proje).yapilar) {
        const yapi = proje.yapilar.find((p) => p.id === y.yapiId);
        const kose = yapi.poligon.map(xy);
        for (const s of y.satirlar.filter((x) => x.gecerli)) {
          const [px, py] = xy(proje.paratonerler.find((p) => p.id === s.paratonerId));
          const enUzak = Math.max(...kose.map(([x, yy]) => Math.hypot(x - px, yy - py)));
          expect(Math.abs(s.enUzak - enUzak)).toBeLessThan(0.05);
          if (Math.abs(s.rp - enUzak) > 0.1) expect(s.marjEnUzak >= 0).toBe(s.rp >= enUzak);
        }
      }
    }
  });
});
