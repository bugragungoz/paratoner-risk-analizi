// Altlık çizimine paratoner yazma: var olan DXF'e öğe ekleme (hiçbir şey silinmez ya da değişmez) ve
// paratonerlerin altlık çiziminin kendi koordinatlarına çevrilmesi.
import { describe, test, expect } from 'vitest';
import fs from 'node:fs';
import * as ck from '../src/core';
import { tr as TR } from '../src/dil/tr';
import { kanitSenaryosu } from './veri/projeler';

const latin1 = (b) => Buffer.from(b).toString('latin1');
const ciftler = (metin) => {
  const s = metin.split(/\r?\n/);
  const c = [];
  for (let i = 0; i + 1 < s.length; i += 2) c.push([s[i].trim(), s[i + 1].trim()]);
  return c;
};
/** Bölümdeki "0" kayıtları: { tur, kodlar }. */
const kayitlar = (c, bolum) => {
  let i = c.findIndex(([k, v], n) => k === '2' && v === bolum && c[n - 1][1] === 'SECTION');
  const k = [];
  for (i++; c[i][1] !== 'ENDSEC' || c[i][0] !== '0'; i++) {
    if (c[i][0] === '0') k.push({ tur: c[i][1], kodlar: [] });
    else k.at(-1)?.kodlar.push(c[i]);
  }
  return k;
};
const deger = (o, kod) => o.kodlar.find(([k]) => k === kod)?.[1];

/** Proje ortasına konmuş altlık (ince ayar yapılmış gibi döndürülmüş) ve o altlığa yazılacak paratonerler. */
function hazirla(dosya) {
  const bayt = new Uint8Array(fs.readFileSync(dosya));
  const cozum = ck.dxfCoz(bayt);
  const proje = kanitSenaryosu();
  const orta = ck.projeOrtasi(proje);
  const yerlesim = ck.dondur(ck.ilkYerlesim(cozum.sinirlar, 1, orta), 17, cozum.sinirlar);
  const ayar = { yol: null, ad: 'plan.dxf', birim: 1, hizalama: yerlesim, gizliKatmanlar: [], opaklik: 0.85, gorunur: true, renk: 'katman' };
  return { bayt, cozum, proje, ayar };
}

describe('Altlık çizimine paratoner yazma', () => {
  test('R2018: paratonerler çizimin kendi koordinatlarında; dosyanın geri kalanı aynen kalır', () => {
    const { bayt, cozum, proje, ayar } = hazirla('tests/veri/dxf/ornek-r2018.dxf');
    const cizim = ck.altlikParatonerCizimi(proje, ayar, TR);
    const cikti = ck.dxfeEkle(bayt, cizim);

    // Yeni dosya yine okunur; eski katmanlar ve çizgiler yerinde, PT_PARATONER eklendi.
    const yeni = ck.dxfCoz(cikti);
    const pt = yeni.katmanlar.find((k) => k.ad === 'PT_PARATONER');
    expect(pt?.parca).toBe(proje.paratonerler.length);
    for (const k of cozum.katmanlar) expect(yeni.katmanlar.find((x) => x.ad === k.ad)?.parca).toBe(k.parca);

    // Paratoner sembolünün merkezi, haritadaki konumun altlık çizimindeki karşılığı.
    const c = ciftler(latin1(cikti));
    const daireler = kayitlar(c, 'ENTITIES').filter((o) => o.tur === 'CIRCLE' && deger(o, '8') === 'PT_PARATONER');
    proje.paratonerler.forEach((p, i) => {
      const beklenen = ck.cizimKoordinati(ayar.hizalama, ayar.birim, p);
      expect(Number(deger(daireler[i], '10'))).toBeCloseTo(beklenen.x, 5);
      expect(Number(deger(daireler[i], '20'))).toBeCloseTo(beklenen.y, 5);
    });

    // Orijinal satırlar sırasıyla korunur; yalnızca eklemeler ve $HANDSEED değişir.
    const eski = latin1(bayt).split(/\r?\n/);
    const yeniSatir = latin1(cikti).split(/\r?\n/);
    let j = 0;
    for (let i = 0; i < eski.length; i++) {
      while (j < yeniSatir.length && yeniSatir[j] !== eski[i] && !(eski[i - 1]?.trim() === '5' && eski[i - 2]?.trim() === '$HANDSEED')) j++;
      expect(j).toBeLessThan(yeniSatir.length);
      j++;
    }
  });

  test('tanıtıcılar benzersiz, $HANDSEED en büyüğünden büyük; yeni öğelerin sahibi model uzayı', () => {
    const { bayt, proje, ayar } = hazirla('tests/veri/dxf/ornek-r2018.dxf');
    const c = ciftler(latin1(ck.dxfeEkle(bayt, ck.altlikParatonerCizimi(proje, ayar, TR))));
    const tanitici = c.filter(([k]) => k === '5' || k === '105').map(([, v]) => v);
    const handseed = c[c.findIndex(([k, v]) => k === '9' && v === '$HANDSEED') + 1][1];
    const sayisal = tanitici.filter((h) => h !== handseed).map((h) => BigInt(`0x${h}`));
    expect(new Set(tanitici.filter((h) => h !== handseed)).size).toBe(sayisal.length);
    expect(BigInt(`0x${handseed}`) > sayisal.reduce((a, b) => (b > a ? b : a), 0n)).toBe(true);

    const model = kayitlar(c, 'TABLES').find((o) => o.tur === 'BLOCK_RECORD' && deger(o, '2').toUpperCase() === '*MODEL_SPACE');
    const yeniler = kayitlar(c, 'ENTITIES').filter((o) => deger(o, '8') === 'PT_PARATONER');
    expect(yeniler.length).toBeGreaterThan(0);
    for (const o of yeniler) {
      expect(deger(o, '330')).toBe(deger(model, '5'));
      expect(o.kodlar.some(([k, v]) => k === '100' && v === 'AcDbEntity')).toBe(true);
    }
    // Katman kaydı "0" katmanından türetildi: tablo sahibi ve alt sınıflar yerinde.
    const katman = kayitlar(c, 'TABLES').find((o) => o.tur === 'LAYER' && deger(o, '2') === 'PT_PARATONER');
    expect(deger(katman, '62')).toBe('1');
    expect(katman.kodlar.filter(([k]) => k === '100').map(([, v]) => v)).toEqual(['AcDbSymbolTableRecord', 'AcDbLayerTableRecord']);
  });

  test('UTF-8 BOM ile başlayan R2018 dosyası R12 sanılmaz: tanıtıcılı öğeler yazılır, BOM korunur', () => {
    const { bayt, proje, ayar } = hazirla('tests/veri/dxf/ornek-r2018.dxf');
    const bomlu = new Uint8Array([0xef, 0xbb, 0xbf, ...bayt]);
    const cikti = ck.dxfeEkle(bomlu, ck.altlikParatonerCizimi(proje, ayar, TR));
    expect([...cikti.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const c = ciftler(latin1(cikti.subarray(3)));
    const yeniler = kayitlar(c, 'ENTITIES').filter((o) => deger(o, '8') === 'PT_PARATONER');
    expect(yeniler.length).toBeGreaterThan(0);
    for (const o of yeniler) {
      expect(deger(o, '5')).toBeTruthy();
      expect(o.kodlar.some(([k, v]) => k === '100' && v === 'AcDbEntity')).toBe(true);
    }
  });

  test('ikinci kez yazınca hiçbir şey silinmez: yeni paratonerler eskilerin yanına eklenir, katman tekrarlanmaz', () => {
    const { bayt, proje, ayar } = hazirla('tests/veri/dxf/ornek-r2018.dxf');
    const ilk = ck.dxfeEkle(bayt, ck.altlikParatonerCizimi(proje, ayar, TR));
    const tasinmis = { ...proje, paratonerler: proje.paratonerler.map((p) => ({ ...p, lat: p.lat + 0.0001 })) };
    const ikinci = ck.dxfeEkle(ilk, ck.altlikParatonerCizimi(tasinmis, ayar, TR));
    const c = ck.dxfCoz(ikinci);
    expect(c.katmanlar.filter((k) => k.ad === 'PT_PARATONER')).toHaveLength(1);
    expect(c.katmanlar.find((k) => k.ad === 'PT_PARATONER').parca).toBe(2 * proje.paratonerler.length);
  });

  test('Windows-1254 kod sayfalı R2000 dosyası: Türkçe baytlar bozulmaz, eklenen yazılar ASCII kaçışlı', () => {
    const { bayt, proje, ayar } = hazirla('tests/veri/dxf/ornek-r2000-1254.dxf');
    const p = { ...proje, paratonerler: proje.paratonerler.map((x, i) => (i === 0 ? { ...x, isim: 'Çatı Şİ-1' } : x)) };
    const cikti = ck.dxfeEkle(bayt, ck.altlikParatonerCizimi(p, ayar, TR));
    const yuksek = (b) => [...b].filter((x) => x >= 128).length;
    expect(yuksek(cikti)).toBe(yuksek(bayt));
    expect(latin1(cikti)).toContain('\\U+00C7at\\U+0131 \\U+015E\\U+0130-1');
    expect(ck.dxfCoz(cikti).katmanlar.find((k) => k.ad === 'PT_PARATONER')).toBeTruthy();
  });

  test('R12 dosyası: tanıtıcısız ve alt sınıfsız öğeler', () => {
    const proje = kanitSenaryosu();
    const r12 = new Uint8Array(fs.readFileSync('tests/veri/dxf/ornek-r12.dxf'));
    const cozum = ck.dxfCoz(r12);
    const ayar = { yol: null, ad: 'r12.dxf', birim: 1, hizalama: ck.ilkYerlesim(cozum.sinirlar, 1, ck.projeOrtasi(proje)), gizliKatmanlar: [], opaklik: 1, gorunur: true, renk: 'katman' };
    const cikti = ck.dxfeEkle(r12, ck.altlikParatonerCizimi(proje, ayar, TR));
    const c = ciftler(latin1(cikti));
    const yeniler = kayitlar(c, 'ENTITIES').filter((o) => deger(o, '8') === 'PT_PARATONER');
    expect(yeniler.length).toBe(4 * proje.paratonerler.length);
    for (const o of yeniler) expect(o.kodlar.some(([k]) => k === '5' || k === '100' || k === '330')).toBe(false);
    expect(ck.dxfCoz(cikti).katmanlar.find((k) => k.ad === 'PT_PARATONER')?.parca).toBe(proje.paratonerler.length);
  });

  test('proje ortası: yapı, paratoner ve parsel köşelerinin ortası; boş projede yok', () => {
    const p = kanitSenaryosu();
    const n = [...p.yapilar.flatMap((y) => y.poligon), ...p.paratonerler, ...(p.parsel_siniri ?? [])];
    const orta = ck.projeOrtasi(p);
    expect(orta.lat).toBeCloseTo((Math.min(...n.map((x) => x.lat)) + Math.max(...n.map((x) => x.lat))) / 2, 6);
    expect(orta.lng).toBeCloseTo((Math.min(...n.map((x) => x.lng)) + Math.max(...n.map((x) => x.lng))) / 2, 6);
    expect(ck.projeOrtasi({ ...p, yapilar: [], paratonerler: [], parsel_siniri: null })).toBeNull();
  });

  test('ikili DXF ve bölümü eksik dosya reddedilir', () => {
    const cizim = { katmanlar: [{ ad: 'PT_PARATONER', renk: 1 }], ogeler: [] };
    expect(() => ck.dxfeEkle(new TextEncoder().encode('AutoCAD Binary DXF\r\n\x1a\x00'), cizim)).toThrow(ck.DxfEklemeHatasi);
    expect(() => ck.dxfeEkle(new TextEncoder().encode('0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF\n'), cizim)).toThrow(ck.DxfEklemeHatasi);
  });
});
