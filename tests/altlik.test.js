// Altlık hizalaması: TUREF yerleşimi, iki nokta (TUREF → ince ayar çevirisi), ince ayar ve çizim birimi.
import { describe, test, expect } from 'vitest';
import * as ck from '../src/core';

const mm = (a, b) => ck.elipsoitMesafe(a, b);

describe('Altlık hizalaması', () => {
  test('TUREF: çizim koordinatı TUREF düzleminin tersiyle aynı; ters dönüşüm geri verir', () => {
    const h = { tur: 'turef', dilim: 30 };
    const don = ck.altlikDonusturucu(h, 1);
    const n = don(512345.678, 4512345.123);
    const beklenen = ck.turefDuzlemi(30).geri({ x: 512345.678, y: 4512345.123 });
    expect(mm(n, beklenen)).toBeLessThan(1e-6);
    const c = ck.cizimKoordinati(h, 1, n);
    expect(c.x).toBeCloseTo(512345.678, 4);
    expect(c.y).toBeCloseTo(4512345.123, 4);
  });

  test('TUREF dilimi, çizimi referans noktasına en yakın yere koyan dilimdir', () => {
    // Ankara'daki bir nokta TM33'te: aynı koordinatlar TM30'da ~250 km batıya, TM36'da doğuya düşer.
    const n = ck.turefDuzlemi(33).ileri({ lat: 39.92, lng: 32.85 });
    const s = { minX: n.x - 100, minY: n.y - 100, maxX: n.x + 100, maxY: n.y + 100 };
    expect(ck.turefDilimiBul(s, 1, { lat: 39.9, lng: 32.8 })).toBe(33);
    // Referans kaba da olsa (ör. harita Türkiye'nin ortasında, boylam 35) dilim yine doğru seçilir.
    expect(ck.turefDilimiBul(s, 1, { lat: 39, lng: 34 })).toBe(33);
    expect(ck.turefDilimiBul(s, 1, { lat: 39, lng: 30.2 })).toBe(30);
  });

  test('TUREF aralığı tanınır', () => {
    expect(ck.turefOlabilir({ minX: 480000, minY: 4400000, maxX: 481000, maxY: 4401000 })).toBe(true);
    expect(ck.turefOlabilir({ minX: 0, minY: 0, maxX: 120, maxY: 80 })).toBe(false);
    // Milimetre birimli TUREF çizimi
    expect(ck.turefOlabilir({ minX: 480000e3, minY: 4400000e3, maxX: 481000e3, maxY: 4401000e3 }, 0.001)).toBe(true);
  });

  test('iki nokta: bilinen döndürme ve ötelemeyi geri bulur (ölçek kilitli, birim mm)', () => {
    // Gerçek yerleşim: 23° döndürülmüş, mm birimli çizim.
    const gercek = { tur: 'benzerlik', orijin: { lat: 40.7, lng: 31.5 }, aci: (23 * Math.PI) / 180, olcek: 0.001, tx: 12.3, ty: -45.6 };
    const don = ck.altlikDonusturucu(gercek, 0.001);
    const c1 = { x: 1000, y: 2000 };
    const c2 = { x: 85000, y: 40000 };
    const { hizalama, olcekOrani } = ck.ikiNoktaHizala(c1, c2, don(c1.x, c1.y), don(c2.x, c2.y), 0.001);
    expect(olcekOrani).toBeCloseTo(1, 6);
    const bulunan = ck.altlikDonusturucu(hizalama, 0.001);
    for (const c of [c1, c2, { x: 0, y: 0 }, { x: 120000, y: 90000 }]) expect(mm(bulunan(c.x, c.y), don(c.x, c.y))).toBeLessThan(0.002);
  });

  test('iki nokta: haritadaki noktalar %2 uzaksa oran bildirilir; kilitli ölçekte orta nokta eşlenir, serbestte c1 tam oturur', () => {
    const h1 = { lat: 39.9, lng: 32.8 };
    const d = ck.yerelDuzlem(h1);
    const h2 = d.geri({ x: 102, y: 0 }); // çizimde 100 m
    const c1 = { x: 0, y: 0 };
    const c2 = { x: 100, y: 0 };
    const kilitli = ck.ikiNoktaHizala(c1, c2, h1, h2, 1);
    expect(kilitli.olcekOrani).toBeCloseTo(1.02, 6);
    const k = ck.altlikDonusturucu(kilitli.hizalama, 1);
    expect(mm(k(0, 0), h1)).toBeCloseTo(1, 3); // her uçta 1 m kayma
    expect(mm(k(50, 0), d.geri({ x: 51, y: 0 }))).toBeLessThan(0.001);
    const serbest = ck.ikiNoktaHizala(c1, c2, h1, h2, 1, true);
    const s = ck.altlikDonusturucu(serbest.hizalama, 1);
    expect(mm(s(0, 0), h1)).toBeLessThan(0.001);
    expect(mm(s(100, 0), h2)).toBeLessThan(0.001);
    expect(() => ck.ikiNoktaHizala(c1, c1, h1, h2, 1)).toThrow();
  });

  test('TUREF yerleşimi ince ayar için benzerliğe çevrilir: 600 m çizimde fark < 5 mm', () => {
    const s = { minX: 610000, minY: 4500000, maxX: 610600, maxY: 4500400 };
    const turef = { tur: 'turef', dilim: 30 };
    const b = ck.benzerligeCevir(turef, s, 1);
    expect(b.tur).toBe('benzerlik');
    const a1 = ck.altlikDonusturucu(turef, 1);
    const a2 = ck.altlikDonusturucu(b, 1);
    for (const [x, y] of [[610000, 4500000], [610600, 4500400], [610300, 4500200], [610000, 4500400]]) expect(mm(a1(x, y), a2(x, y))).toBeLessThan(0.005);
  });

  test('ince ayar: kaydırma metre cinsinden, döndürme çizimin ortasını yerinde bırakır', () => {
    const s = { minX: 0, minY: 0, maxX: 200, maxY: 100 };
    const h = ck.ilkYerlesim(s, 1, { lat: 38, lng: 27 });
    const don = ck.altlikDonusturucu(h, 1);
    expect(mm(don(100, 50), { lat: 38, lng: 27 })).toBeLessThan(1e-6); // orta nokta merkeze
    const k = ck.altlikDonusturucu(ck.kaydir(h, 3, 4), 1);
    expect(mm(k(100, 50), don(100, 50))).toBeCloseTo(5, 4);
    const d = ck.dondur(h, 90, s);
    const r = ck.altlikDonusturucu(d, 1);
    expect(mm(r(100, 50), don(100, 50))).toBeLessThan(1e-6);
    // (200, 50) noktası ortanın 100 m doğusundaydı; 90° sonra 100 m kuzeyinde.
    const p = ck.yerelDuzlem({ lat: 38, lng: 27 }).ileri(r(200, 50));
    expect(p.x).toBeCloseTo(0, 4);
    expect(p.y).toBeCloseTo(100, 4);
  });
});

describe('Birim değişikliği', () => {
  test('metreden milimetreye: çizimin ortası yerinde kalır, boyut 1000 kat küçülür', () => {
    const s = { minX: 0, minY: 0, maxX: 40000, maxY: 20000 };
    const h = ck.ilkYerlesim(s, 1, { lat: 40, lng: 30 });
    const y = ck.birimDegistir(h, 1, 0.001, s);
    const a = ck.altlikDonusturucu(y, 0.001);
    expect(mm(a(20000, 10000), { lat: 40, lng: 30 })).toBeLessThan(1e-6);
    expect(mm(a(0, 10000), a(40000, 10000))).toBeCloseTo(40, 3);
    expect(ck.birimDegistir({ tur: 'turef', dilim: 30 }, 1, 0.001, s)).toEqual({ tur: 'turef', dilim: 30 });
  });
});

describe('Altlık ayarı proje dosyasında', () => {
  test('saklanır, hesabı etkilemez; bozuk ayar projeyi açmayı engellemez', async () => {
    const { kanitSenaryosu } = await import('./veri/projeler');
    const p = kanitSenaryosu();
    const altlik = {
      yol: String.raw`C:\Projeler\Vaziyet.dxf`, ad: 'Vaziyet.dxf', birim: 0.001,
      hizalama: { tur: 'benzerlik', orijin: { lat: 39.9, lng: 32.8 }, aci: 0.3, olcek: 0.001, tx: 1, ty: 2 },
      gizliKatmanlar: ['Kot'], opaklik: 0.6, gorunur: true, renk: 'tek',
    };
    const q = { ...p, altlik };
    expect(ck.hesapGirdisiAyni(p, q)).toBe(true);
    expect(ck.projeDosyasiOku(ck.projeDosyasiYaz(q, 'test')).proje.altlik).toEqual(altlik);
    const turef = { ...altlik, hizalama: { tur: 'turef', dilim: 33 } };
    expect(ck.projeDosyasiOku(ck.projeDosyasiYaz({ ...p, altlik: turef }, 'test')).proje.altlik.hizalama).toEqual({ tur: 'turef', dilim: 33 });
    for (const bozuk of [{ ...altlik, hizalama: { tur: 'turef', dilim: 31 } }, { ...altlik, birim: 0 }, { ...altlik, hizalama: { ...altlik.hizalama, aci: 'x' } }]) {
      expect(ck.projeDosyasiOku(ck.projeDosyasiYaz({ ...p, altlik: bozuk }, 'test')).proje.altlik).toBeUndefined();
    }
  });

  test('tek renk ve konum kilidi saklanır; geçersiz renk ve kilit yok sayılır', async () => {
    const { kanitSenaryosu } = await import('./veri/projeler');
    const p = kanitSenaryosu();
    const altlik = {
      yol: null, ad: 'Plan.dxf', birim: 1,
      hizalama: { tur: 'benzerlik', orijin: { lat: 39.9, lng: 32.8 }, aci: 0, olcek: 1, tx: 0, ty: 0 },
      gizliKatmanlar: [], opaklik: 0.85, gorunur: true, renk: 'tek', tekRenk: '#00e5ff', kilitli: true,
    };
    const oku = (a) => ck.projeDosyasiOku(ck.projeDosyasiYaz({ ...p, altlik: a }, 'test')).proje.altlik;
    expect(oku(altlik)).toEqual(altlik);
    const geri = oku({ ...altlik, tekRenk: 'red', kilitli: 'evet' });
    expect(geri.tekRenk).toBeUndefined();
    expect(geri.kilitli).toBeUndefined();
  });
});

describe('Çizim birimi tahmini', () => {
  const sinir = (boyut) => ({ minX: 855, minY: 827, maxX: 855 + boyut, maxY: 827 + boyut * 0.7 });

  test('varsayılan metre: AutoCAD şablonu "milimetre" yazsa da metreyle çizilmiş 400 m saha metre', () => {
    expect(ck.birimTahmini(4, sinir(401))).toBe(1);
    expect(ck.birimTahmini(0, sinir(401))).toBe(1);
    expect(ck.birimTahmini(6, sinir(401))).toBe(1);
  });

  test('metreyle akla yatmayan boyutta dosyanın birimi, sonra santimetre ve milimetre denenir', () => {
    // Milimetreyle çizilmiş 400 m saha: metre olsa 400 km olurdu.
    expect(ck.birimTahmini(4, sinir(400_000))).toBe(0.001);
    // Birimsiz, santimetreyle çizilmiş 300 m saha.
    expect(ck.birimTahmini(0, sinir(30_000))).toBe(0.01);
    // Birimsiz, milimetreyle çizilmiş 2 km saha: santimetre 20 km olurdu.
    expect(ck.birimTahmini(0, sinir(2_000_000))).toBe(0.001);
  });

  test('dosya açıkça santimetre diyorsa ve akla yatıyorsa santimetre; yatmıyorsa metre', () => {
    expect(ck.birimTahmini(5, sinir(5000))).toBe(0.01);
    // "Santimetre" yazan ama metreyle çizilmiş 300 m saha: santimetreyle 3 m olurdu.
    expect(ck.birimTahmini(5, sinir(300))).toBe(1);
  });

  test("TUREF / TM koordinatlı çizim boyutundan bağımsız olarak metre: 3,5 km'lik saha da yerine oturur", () => {
    const genis = { minX: 480000, maxX: 483500, minY: 4418000, maxY: 4420000 };
    for (const ins of [0, 4, 5, 6]) {
      expect(ck.birimTahmini(ins, genis)).toBe(1);
      expect(ck.turefOlabilir(genis, ck.birimTahmini(ins, genis))).toBe(true);
    }
  });

  test('hiçbir birim uymazsa metre (TUREF koordinatları arasında kalan uzak bir öğe gibi)', () => {
    expect(ck.birimTahmini(4, { minX: 0, minY: 0, maxX: 480_000, maxY: 4_400_000 })).toBe(1);
  });
});
