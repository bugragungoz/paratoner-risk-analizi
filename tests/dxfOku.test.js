// DXF okuyucu: ezdxf ile üretilmiş örnek dosyalar ve programın eski R12 çıktısı (tests/veri/dxf).
// Beklenen değerler dosyayı üreten betikteki geometriden elle hesaplanmıştır.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as ck from '../src/core';

const oku = (ad) => new Uint8Array(readFileSync(new URL(`./veri/dxf/${ad}`, import.meta.url)));
const katmanParcalari = (a, ad) => {
  const i = a.katmanlar.findIndex((k) => k.ad === ad);
  return a.parcalar.filter((p) => p.katman === i);
};
const noktalar = (p) => Array.from({ length: p.noktalar.length / 2 }, (_, i) => [p.noktalar[2 * i], p.noktalar[2 * i + 1]]);
const icerir = (p, [x, y], tol = 1e-6) => noktalar(p).some(([a, b]) => Math.abs(a - x) < tol && Math.abs(b - y) < tol);
const sinir = (p) => {
  const n = noktalar(p);
  return { minX: Math.min(...n.map((q) => q[0])), maxX: Math.max(...n.map((q) => q[0])), minY: Math.min(...n.map((q) => q[1])), maxY: Math.max(...n.map((q) => q[1])) };
};

describe('DXF okuma: R2018 (UTF-8, metre)', () => {
  const a = ck.dxfCoz(oku('ornek-r2018.dxf'));

  test('sürüm, birim, katmanlar (Türkçe ad, kapalı ve donuk katmanlar)', () => {
    expect(a.surum).toBe('AC1032');
    expect(a.birim).toBe(6);
    expect(ck.birimMetresi(a.birim)).toBe(1);
    const k = Object.fromEntries(a.katmanlar.map((x) => [x.ad, x]));
    expect(k['Çevre Duvarı'].renk).toBe(3);
    expect(k['Bina'].renk).toBe(1);
    expect(k['Gizli'].kapali).toBe(true);
    expect(k['Donuk'].kapali).toBe(true);
    expect(k['Yol'].kapali).toBe(false);
  });

  test('LWPOLYLINE: kabarık kenar dışa doğru yarım daire (merkez 10,5; r 5)', () => {
    const bina = katmanParcalari(a, 'Bina').find((p) => icerir(p, [0, 10]));
    expect(bina.kapali).toBe(true);
    expect(icerir(bina, [15, 5], 1e-9)).toBe(true); // yayın en dış noktası
    for (const [x, y] of noktalar(bina).filter(([x]) => x > 10)) expect(Math.hypot(x - 10, y - 5)).toBeCloseTo(5, 9);
  });

  test('CIRCLE, ARC, ELLIPSE', () => {
    const daire = katmanParcalari(a, 'Çevre Duvarı')[0];
    for (const [x, y] of noktalar(daire)) expect(Math.hypot(x - 50, y - 50)).toBeCloseTo(5, 9);
    const yay = katmanParcalari(a, 'Yol').find((p) => icerir(p, [110, 0]) && icerir(p, [100, 10]));
    expect(yay).toBeDefined();
    for (const [x, y] of noktalar(yay)) {
      expect(Math.hypot(x - 100, y)).toBeCloseTo(10, 9);
      expect(x >= 100 - 1e-9 && y >= -1e-9).toBe(true); // 0°–90°
    }
    const elips = katmanParcalari(a, 'Yol').find((p) => icerir(p, [220, 0], 1e-6) && icerir(p, [180, 0], 1e-6));
    const s = sinir(elips);
    expect(s.maxY).toBeCloseTo(10, 6);
    expect(s.minY).toBeCloseTo(-10, 6);
  });

  test('SPLINE (yalnızca geçiş noktaları): yumuşak eğri her geçiş noktasından geçer', () => {
    const egri = katmanParcalari(a, 'Yol').find((p) => sinir(p).minX >= 299 && sinir(p).maxX <= 331);
    expect(egri).toBeDefined();
    expect(egri.noktalar.length / 2).toBeGreaterThan(20);
    for (const n of [[300, 0], [310, 10], [320, 0], [330, 10]]) expect(icerir(egri, n, 1e-9), String(n)).toBe(true);
  });

  test('aynalanmış daire (ekstrüzyon 0,0,-1): merkez dünya koordinatında (-60, 0)', () => {
    const d = katmanParcalari(a, 'Bina').find((p) => sinir(p).maxX < 0);
    expect(d).toBeDefined();
    for (const [x, y] of noktalar(d)) expect(Math.hypot(x + 60, y)).toBeCloseTo(3, 9);
  });

  test('INSERT: taban noktası, ölçek 2, dönüş 90°; "0" katmanındaki öğeler eklemenin katmanını alır', () => {
    // Direk çizgisi (1,1)-(3,1): (500,0) + R90 · 2 · (p − (1,1)) → (500,0)-(500,4)
    const cizgi = katmanParcalari(a, 'Bina').find((p) => p.noktalar.length === 4 && icerir(p, [500, 4], 1e-9));
    expect(cizgi).toBeDefined();
    expect(icerir(cizgi, [500, 0], 1e-9)).toBe(true);
    const daire = katmanParcalari(a, 'Bina').find((p) => p.noktalar.length > 4 && Math.abs(sinir(p).minX - 499) < 1e-6);
    for (const [x, y] of noktalar(daire)) expect(Math.hypot(x - 500, y)).toBeCloseTo(1, 9); // r 0,5 · 2
  });

  test('iç içe blok: Grup → Direk; içteki eklemenin kendi katmanı (Bina) korunur', () => {
    // Grup (600,0); içindeki Direk (0,0), taban (1,1): çizgi (1,1)-(3,1) → (0,0)-(2,0) → (600,0)-(602,0), katman Bina.
    expect(katmanParcalari(a, 'Bina').some((p) => icerir(p, [600, 0], 1e-9) && icerir(p, [602, 0], 1e-9))).toBe(true);
    // Grup'un "0" katmanındaki çizgisi eklemenin katmanını (Yol) alır: (600,0)-(600,5).
    expect(katmanParcalari(a, 'Yol').some((p) => icerir(p, [600, 5], 1e-9))).toBe(true);
  });

  test('yazılar ve tarama atlanır, kağıt alanı çizilmez, ölçü çizilir', () => {
    expect(a.atlanan.TEXT).toBe(1);
    expect(a.atlanan.MTEXT).toBe(2); // biri ölçünün kendi bloğundaki rakam
    expect(a.atlanan.HATCH).toBe(1);
    expect(a.cizilen.DIMENSION).toBe(1);
    expect(a.sinirlar.maxX).toBeLessThan(700); // kağıt alanındaki (1000, 1000) çizgisi yok
    expect(a.kesildi).toBe(false);
  });
});

describe('DXF okuma: R2000 (ANSI_1254, milimetre, POLYLINE)', () => {
  const a = ck.dxfCoz(oku('ornek-r2000-1254.dxf'));
  test('kod sayfasından Türkçe katman adı, birim mm, 2B çoklu çizgi', () => {
    expect(a.surum).toBe('AC1015');
    expect(a.birim).toBe(4);
    expect(ck.birimMetresi(4)).toBe(0.001);
    const p = katmanParcalari(a, 'Çatı Katı');
    expect(p).toHaveLength(1);
    expect(p[0].kapali).toBe(true);
    expect(sinir(p[0])).toEqual({ minX: 0, maxX: 20000, minY: 0, maxY: 8000 });
  });
});

describe('DXF okuma: R12 (AC1009, Windows-1254, POLYLINE/VERTEX)', () => {
  // ornek-r12.dxf: programın 1.10 sürümündeki R12 yazıcısının kanıt senaryosu çıktısı (TUREF / TM33, metre).
  test('katmanlar, kapalı çoklu çizgiler ve daireler', () => {
    const a = ck.dxfCoz(oku('ornek-r12.dxf'));
    expect(a.surum).toBe('AC1009');
    expect(a.parcalar).toHaveLength(10);
    // Yapı köşeleri aynı koordinatta.
    const yapi = [[482896.3351, 4418444.8113], [483046.5416, 4418444.4765], [483046.5859, 4418464.4249], [482896.3798, 4418464.7597]];
    const okunan = katmanParcalari(a, 'YAPI_KORUNMUYOR');
    expect(okunan.some((q) => q.kapali && yapi.every((n) => icerir(q, n, 1e-4)))).toBe(true);
    // Rp dairesi: bütün köşeler merkezden yarıçap uzaklıkta.
    const [mx, my, r] = [482891.3506, 4418454.7968, 63.0002];
    const daire = katmanParcalari(a, 'RP_DAIRE').find((q) => Math.abs(sinir(q).maxX - (mx + r)) < 1e-3);
    for (const [x, y] of noktalar(daire)) expect(Math.hypot(x - mx, y - my)).toBeCloseTo(r, 3);
  });
});

describe('DXF okuma hataları', () => {
  test('ikili DXF, bozuk dosya, boş çizim', () => {
    const ikili = new TextEncoder().encode('AutoCAD Binary DXF\r\n\x1a\x00xxxx');
    expect(() => ck.dxfCoz(ikili)).toThrow(ck.DxfOkumaHatasi);
    expect(() => ck.dxfCoz(new TextEncoder().encode('bu bir dxf değil\nx\n'))).toThrow(ck.DxfOkumaHatasi);
    const bos = new TextEncoder().encode(['0', 'SECTION', '2', 'ENTITIES', '0', 'TEXT', '8', 'A', '10', '0', '20', '0', '30', '0', '40', '1', '1', 'x', '0', 'ENDSEC', '0', 'EOF', ''].join('\r\n'));
    expect(() => ck.dxfCoz(bos)).toThrow(/çizgi yok/);
  });

  test('nokta sınırı aşılınca çizim kesilir ve bildirilir', () => {
    const a = ck.dxfCoz(oku('ornek-r2018.dxf'), { enFazlaNokta: 50 });
    expect(a.kesildi).toBe(true);
    const toplam = a.parcalar.reduce((t, p) => t + p.noktalar.length / 2, 0);
    expect(toplam).toBeLessThanOrEqual(50);
  });
});
