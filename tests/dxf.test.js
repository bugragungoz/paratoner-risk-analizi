// DXF çizim modeli: koordinatlar, ölçek, katmanlar ve yazılar.
import { describe, test, expect } from 'vitest';
import * as ck from '../src/core';
import { metinler } from '../src/dil';
import { kanitSenaryosu, rastgeleProje } from './veri/projeler';

const m = metinler('tr');
const cizim = (p, sistem) => ck.dxfCizimi(p, ck.projeyiHesapla(p), sistem, m, 'Paratoner Risk Analizi test · 20.11.2026');
const katmandaki = (c, ad, tur) => c.ogeler.filter((o) => o.katman === ad && (!tur || o.tur === tur));

describe('DXF yerel sistem', () => {
  const p = kanitSenaryosu({ deltaT: 30 });
  const orijin = ck.projeOrtasi(p);
  const c = cizim(p, { tur: 'yerel', orijin });

  test('başlangıç noktası proje ortasında, koordinatlar elipsoit mesafeleriyle tutarlı', () => {
    expect(orijin.lat).toBeCloseTo(39.9, 2);
    const yapi = p.yapilar[0];
    const cokgen = c.ogeler.find((o) => o.tur === 'cokgen' && o.katman.startsWith('YAPI_') && o.noktalar[0][0] === ck.yerelDuzlem(orijin).ileri(yapi.poligon[0]).x.toFixed(4) * 1);
    expect(cokgen).toBeDefined();
    for (let i = 0; i < yapi.poligon.length; i++) {
      const j = (i + 1) % yapi.poligon.length;
      const kenar = Math.hypot(cokgen.noktalar[j][0] - cokgen.noktalar[i][0], cokgen.noktalar[j][1] - cokgen.noktalar[i][1]);
      expect(Math.abs(kenar - ck.elipsoitMesafe(yapi.poligon[i], yapi.poligon[j]))).toBeLessThan(0.001);
    }
  });

  test('her katman tanımlı, adlar ASCII; yapılar sonuca göre katmanda', () => {
    const adlar = new Set(c.katmanlar.map((k) => k.ad));
    for (const o of c.ogeler) expect(adlar.has(o.katman), o.katman).toBe(true);
    for (const k of c.katmanlar) expect(k.ad).toMatch(/^[A-Z0-9_-]+$/);
    const sonuc = ck.projeyiHesapla(p);
    for (const y of sonuc.yapilar) expect(ck.yapiKatmani(y.nihai.kod)).toBe(y.nihai.kod === 'KISMI' ? 'YAPI_KORUNMUYOR' : ck.yapiKatmani(y.nihai.kod));
    // ΔT 30'da Depo-B kısmi: açıkta kalan alan çizilir.
    expect(sonuc.yapilar.find((y) => y.yapiIsim === 'Depo-B').nihai.kod).toBe('KISMI');
    expect(katmandaki(c, 'ACIK_ALAN', 'cokgen').length).toBeGreaterThan(0);
    expect(katmandaki(c, 'YAPI_KORUNMUYOR', 'cokgen').length).toBeGreaterThan(0);
  });

  test('Rp daireleri: yarıçap Rp, merkez paratoner; aynı paratoner ve Rp tek daire', () => {
    const sonuc = ck.projeyiHesapla(p);
    const d = ck.yerelDuzlem(orijin);
    const daireler = katmandaki(c, 'RP_DAIRE', 'daire');
    const beklenen = new Set(
      sonuc.yapilar.flatMap((y) => y.satirlar.filter((s) => s.gecerli && s.enYakin <= s.rp).map((s) => `${s.paratonerId}|${s.rp}`)),
    );
    expect(daireler).toHaveLength(beklenen.size);
    for (const anahtar of beklenen) {
      const [id, rp] = anahtar.split('|');
      const pr = p.paratonerler.find((x) => x.id === id);
      const merkez = d.ileri(pr);
      const daire = daireler.find((o) => Math.abs(o.merkez[0] - merkez.x) < 1e-3 && Math.abs(o.merkez[1] - merkez.y) < 1e-3 && Math.abs(o.yaricap - Number(rp)) < 1e-3);
      expect(daire, anahtar).toBeDefined();
    }
  });

  test('yazılar Türkçe karakterleri korur; yükseklik 0,3-5 m', () => {
    const yazilar = c.ogeler.filter((o) => o.tur === 'yazi');
    expect(yazilar.some((y) => y.metin.includes('Kısmi koruma'))).toBe(true);
    expect(yazilar.some((y) => y.metin.startsWith('P1 → Depo-B: Rp'))).toBe(true);
    expect(yazilar.some((y) => y.metin.includes('Koordinat: yerel'))).toBe(true);
    for (const y of yazilar) {
      expect(y.yukseklik).toBeGreaterThanOrEqual(0.18);
      expect(y.yukseklik).toBeLessThanOrEqual(6);
      expect(y.metin).not.toMatch(/[\r\n]/);
    }
  });
});

describe('DXF TUREF', () => {
  test('koordinatlar TUREF düzlemiyle aynı; ölçek katsayısı TM formülüyle uyuşur', () => {
    // Dilim kenarına yakın saha: TM30, boylam 31,45° (merkez meridyenden ~122 km).
    const p = kanitSenaryosu();
    const kaydir = (n) => ({ lat: n.lat + 0.8, lng: n.lng - 1.35 });
    p.yapilar = p.yapilar.map((y) => ({ ...y, poligon: y.poligon.map(kaydir) }));
    p.paratonerler = p.paratonerler.map((pr) => ({ ...pr, ...kaydir(pr) }));
    p.parsel_siniri = p.parsel_siniri?.map(kaydir) ?? null;
    const dilim = ck.turefDilimi(p.paratonerler[0].lng);
    expect(dilim).toBe(30);
    const c = cizim(p, { tur: 'turef', dilim });
    const d = ck.turefDuzlemi(30);
    const pr = p.paratonerler[0];
    const nokta = katmandaki(c, 'PARATONER', 'nokta')[0];
    const beklenen = d.ileri(pr);
    expect(Math.abs(nokta.konum[0] - beklenen.x)).toBeLessThan(1e-3);
    expect(Math.abs(nokta.konum[1] - beklenen.y)).toBeLessThan(1e-3);
    expect(nokta.konum[0]).toBeGreaterThan(600000); // doğuda, sahte doğu 500 000 m

    // TM ölçek katsayısı ≈ 1 + x² / (2·M·N), x: merkez meridyenden uzaklık.
    const k = ck.olcekKatsayisi(d, pr);
    const a = 6378137, e2 = 0.00669438002290, s2 = Math.sin((pr.lat * Math.PI) / 180) ** 2;
    const MN = ((a * (1 - e2)) / (1 - e2 * s2) ** 1.5) * (a / Math.sqrt(1 - e2 * s2));
    const x = beklenen.x - 500000;
    expect(Math.abs(k - (1 + (x * x) / (2 * MN)))).toBeLessThan(2e-6);
    expect(k).toBeGreaterThan(1.0001);

    // Rp daireleri bu katsayıyla büyütülür.
    const s = ck.projeyiHesapla(p).yapilar.flatMap((y) => y.satirlar).find((r) => r.gecerli && r.paratonerId === pr.id && r.enYakin <= r.rp);
    const daire = katmandaki(c, 'RP_DAIRE', 'daire').find((o) => Math.abs(o.merkez[0] - nokta.konum[0]) < 1e-3);
    expect(Math.abs(daire.yaricap - s.rp * k)).toBeLessThan(1e-3);
    expect(c.ogeler.some((o) => o.tur === 'yazi' && o.metin.includes('TUREF / TM30 (EPSG:5254)'))).toBe(true);
  });
});

describe('DXF genel', () => {
  test('20 rastgele saha: bütün sayılar sonlu, bütün öğeler tanımlı katmanda', () => {
    for (let t = 1; t <= 20; t++) {
      const p = rastgeleProje(t);
      for (const sistem of [{ tur: 'yerel', orijin: ck.projeOrtasi(p) }, { tur: 'turef', dilim: ck.turefDilimi(ck.projeOrtasi(p).lng) }]) {
        const c = cizim(p, sistem);
        const adlar = new Set(c.katmanlar.map((k) => k.ad));
        for (const o of c.ogeler) {
          expect(adlar.has(o.katman)).toBe(true);
          const sayilar = [o.noktalar?.flat(), o.merkez, o.konum, o.yaricap, o.yukseklik].flat().filter((x) => x !== undefined);
          for (const n of sayilar) expect(Number.isFinite(n), `tohum ${t}`).toBe(true);
          if (o.tur === 'daire') expect(o.yaricap).toBeGreaterThan(0);
          if (o.tur === 'cokgen') expect(o.noktalar.length).toBeGreaterThanOrEqual(3);
        }
        expect(katmandaki(c, 'PARATONER', 'nokta')).toHaveLength(p.paratonerler.length);
      }
    }
  });

  test('boş proje: başlangıç noktası yok, çizim yalnızca katmanlardan oluşur', () => {
    const p = ck.yeniProje();
    expect(ck.projeOrtasi(p)).toBeNull();
    const c = cizim(p, { tur: 'turef', dilim: 33 });
    expect(c.ogeler).toEqual([]);
    expect(c.katmanlar.length).toBeGreaterThan(5);
  });

  test('yerel başlangıç noktası proje dosyasında saklanır ve hesabı etkilemez', () => {
    const p = kanitSenaryosu();
    const q = { ...p, yerel_orijin: { lat: 39.9001, lng: 32.8008 } };
    expect(ck.hesapGirdisiAyni(p, q)).toBe(true);
    const okunan = ck.projeDosyasiOku(ck.projeDosyasiYaz(q, 'test')).proje;
    expect(okunan.yerel_orijin).toEqual({ lat: 39.9001, lng: 32.8008 });
    // Bozuk değer projeyi açmayı engellemez.
    const bozuk = JSON.parse(ck.projeDosyasiYaz(q, 'test'));
    bozuk.proje.yerel_orijin = { lat: 'x' };
    expect(ck.projeDosyasiOku(JSON.stringify(bozuk)).proje.yerel_orijin).toBeUndefined();
  });
});

/** DXF metnini (kod, değer) çiftlerine ayırır. */
function ciftler(metin) {
  const s = metin.split('\r\n');
  expect(s.pop()).toBe('');
  expect(s.length % 2).toBe(0);
  const c = [];
  for (let i = 0; i < s.length; i += 2) c.push([Number(s[i].trim()), s[i + 1]]);
  return c;
}

describe('DXF R12 yazıcı', () => {
  const p = kanitSenaryosu({ deltaT: 30 });
  const model = cizim(p, { tur: 'yerel', orijin: ck.projeOrtasi(p) });
  const metin = ck.dxfMetni(model);
  const c = ciftler(metin);

  test('bölümler, sürüm, kod sayfası ve dosya sonu', () => {
    const bolumler = c.filter(([k], i) => k === 2 && c[i - 1]?.[1] === 'SECTION').map(([, v]) => v);
    expect(bolumler).toEqual(['HEADER', 'TABLES', 'BLOCKS', 'ENTITIES']);
    const deger = (ad) => c[c.findIndex(([k, v]) => k === 9 && v === ad) + 1][1];
    expect(deger('$ACADVER')).toBe('AC1009');
    expect(deger('$DWGCODEPAGE')).toBe('ANSI_1254');
    expect(c[c.length - 1]).toEqual([0, 'EOF']);
    // R12'de R13'e özgü alt sınıf işareti (100) ve tutamaç (5) yok.
    expect(c.some(([k]) => k === 100 || k === 5)).toBe(false);
  });

  test('öğe sayıları modelle aynı; çoklu çizgi VERTEX ve SEQEND ile kapanır', () => {
    const ogeler = c.filter(([k]) => k === 0).map(([, v]) => v);
    const say = (t) => model.ogeler.filter((o) => o.tur === t).length;
    expect(ogeler.filter((v) => v === 'POLYLINE')).toHaveLength(say('cokgen'));
    expect(ogeler.filter((v) => v === 'SEQEND')).toHaveLength(say('cokgen'));
    expect(ogeler.filter((v) => v === 'VERTEX')).toHaveLength(model.ogeler.filter((o) => o.tur === 'cokgen').reduce((t, o) => t + o.noktalar.length, 0));
    expect(ogeler.filter((v) => v === 'CIRCLE')).toHaveLength(say('daire'));
    expect(ogeler.filter((v) => v === 'POINT')).toHaveLength(say('nokta'));
    expect(ogeler.filter((v) => v === 'TEXT')).toHaveLength(say('yazi'));
    // Katman tablosu: "0" + modeldeki katmanlar.
    const katmanlar = c.filter(([k], i) => k === 2 && c[i - 1]?.[1] === 'LAYER').map(([, v]) => v);
    expect(katmanlar).toEqual(['0', ...model.katmanlar.map((k) => k.ad)]);
  });

  test('metin kaçışı: Windows-1254 dışı karakterler, ^ ve satır sonu', () => {
    expect(ck.dxfMetinKacisi('Kümes Ğış → A − B')).toBe('Kümes Ğış -> A - B');
    expect(ck.dxfMetinKacisi('a^b\nc')).toBe('a^ b c');
    expect(ck.dxfMetinKacisi('ΔT 😀')).toBe(String.raw`\U+0394T ?`);
  });

  test('dosya Windows-1254 baytlarıyla yazılır: Türkçe harfler tek bayt', () => {
    const bayt = ck.dxfBaytlari(model);
    expect(new TextDecoder('windows-1254').decode(bayt)).toBe(metin);
    const kucuk = ck.dxfBaytlari({ katmanlar: [{ ad: 'ETIKET', renk: 7 }], ogeler: [{ tur: 'yazi', katman: 'ETIKET', konum: [0, 0], yukseklik: 1, metin: 'ışĞİ' }] });
    const s = new TextDecoder('windows-1254').decode(kucuk);
    expect(s).toContain('\r\nışĞİ\r\n');
    const i = s.indexOf('ışĞİ');
    expect([...kucuk.slice(i, i + 4)]).toEqual([0xfd, 0xfe, 0xd0, 0xdd]);
  });

  test('geçersiz model reddedilir', () => {
    expect(() => ck.dxfMetni({ katmanlar: [{ ad: 'A', renk: 1 }], ogeler: [{ tur: 'nokta', katman: 'B', konum: [0, 0] }] })).toThrow();
    expect(() => ck.dxfMetni({ katmanlar: [{ ad: 'ÇATI', renk: 1 }], ogeler: [] })).toThrow();
    expect(() => ck.dxfMetni({ katmanlar: [{ ad: 'A', renk: 1 }], ogeler: [{ tur: 'daire', katman: 'A', merkez: [0, NaN], yaricap: 1 }] })).toThrow();
  });
});
