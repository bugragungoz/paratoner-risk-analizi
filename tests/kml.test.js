// KML dışa aktarma, okuma ve projeye aktarma.
import { describe, test, expect } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import * as ck from '../src/core';
import { metinler } from '../src/dil';
import { kanitSenaryosu, rastgeleProje } from './veri/projeler';

const ayristirici = new DOMParser();
const m = metinler('tr');
const coz = (xml) => ck.kmlCoz(xml, ayristirici);
const uret = (proje) => ck.kmlUret(proje, ck.projeyiHesapla(proje), m, 'Paratoner Risk Analizi test');

/** Projeyi KML'e yazar, okur ve boş bir projeye aktarır. */
function gidisDonus(proje) {
  const belge = coz(uret(proje));
  const bos = { ...ck.yeniProje('Boş'), Nk: proje.Nk, deltaT: proje.deltaT, deltaT_modu: proje.deltaT_modu };
  const oneri = ck.aktarimOnerisi(belge, bos);
  return { belge, oneri, sonuc: ck.projeyeAktar(bos, oneri) };
}

/** Yapı sonuçlarını ada göre karşılaştırılabilir biçime getirir. */
function ozet(proje) {
  const s = ck.projeyiHesapla(proje);
  return Object.fromEntries(
    s.yapilar.map((y) => [
      y.yapiIsim,
      {
        nihai: y.nihai.kod,
        seviye: y.risk?.seviye ?? null,
        satirlar: Object.fromEntries(y.satirlar.map((r) => [r.paratonerIsim, { gecerli: r.gecerli, rp: r.rp, enUzak: r.enUzak, h: r.gercekH }])),
      },
    ]),
  );
}

function ayniSonuc(a, b) {
  const oa = ozet(a);
  const ob = ozet(b);
  expect(Object.keys(ob).sort()).toEqual(Object.keys(oa).sort());
  for (const [ad, y] of Object.entries(oa)) {
    expect(ob[ad].nihai, ad).toBe(y.nihai);
    expect(ob[ad].seviye, ad).toBe(y.seviye);
    for (const [pr, r] of Object.entries(y.satirlar)) {
      const r2 = ob[ad].satirlar[pr];
      expect(r2.gecerli, `${ad}/${pr}`).toBe(r.gecerli);
      if (!r.gecerli) continue;
      expect(r2.rp, `${ad}/${pr}`).toBe(r.rp);
      expect(r2.h, `${ad}/${pr}`).toBeCloseTo(r.h, 6);
      // Koordinatlar 8 ondalıkla yazılır (~1 mm).
      expect(Math.abs(r2.enUzak - r.enUzak), `${ad}/${pr}`).toBeLessThan(0.003);
    }
  }
}

describe('KML dışa aktarma', () => {
  test('geçerli XML; klasörler, şema sürümü ve alanlar', () => {
    const xml = uret(kanitSenaryosu());
    const belge = coz(xml);
    expect(belge.ad).toBe('Kanit Senaryosu');
    expect(belge.veri.pt_surum).toBe('1');
    const turler = belge.ogeler.map((o) => o.veri.pt_tur);
    expect(turler.filter((t) => t === 'yapi')).toHaveLength(2);
    expect(turler.filter((t) => t === 'paratoner')).toHaveLength(3);
    expect(turler).toContain('rp_daire');
    expect(xml).toContain('<Folder><name>Yapılar</name>');
    expect(xml).toContain('<LookAt>');
  });

  test('özel karakterler kaçırılır, renk KML sırasına (aabbggrr) çevrilir', () => {
    const p = kanitSenaryosu();
    p.isim = 'A & B <Tesis>';
    p.yapilar[0].isim = 'Depo "1" & <2>';
    const xml = uret(p);
    const belge = coz(xml);
    expect(belge.ad).toBe('A & B <Tesis>');
    expect(belge.ogeler.find((o) => o.veri.pt_kimlik === p.yapilar[0].id).ad).toBe('Depo "1" & <2>');
    // Yeşil #16a34a → ff4aa316
    expect(xml).toContain('<color>ff4aa316</color>');
  });

  test('Rp daireleri: her köşe paratonerden Rp uzaklıkta, yalnızca yapıya değen geçerli satırlar', () => {
    const p = kanitSenaryosu();
    const sonuc = ck.projeyiHesapla(p);
    const daireler = coz(uret(p)).ogeler.filter((o) => o.veri.pt_tur === 'rp_daire');
    const beklenen = sonuc.yapilar.flatMap((y) => y.satirlar.filter((s) => s.gecerli && s.enYakin <= s.rp));
    expect(daireler).toHaveLength(beklenen.length);
    for (const d of daireler) {
      const pr = p.paratonerler.find((x) => x.id === d.veri.pt_paratoner);
      const rp = Number(d.veri.pt_rp_m);
      for (const n of d.geometri.poligon) expect(Math.abs(ck.elipsoitMesafe(pr, n) - rp)).toBeLessThan(0.002);
    }
  });
});

describe('KML gidiş-dönüş: dışa aktarılan proje aynı sonucu verir', () => {
  test('kanıt senaryosu (ΔT 60 ve 30)', () => {
    for (const deltaT of [60, 30]) {
      const p = kanitSenaryosu({ deltaT });
      const { oneri, sonuc } = gidisDonus(p);
      expect(oneri.satirlar.filter((s) => s.al).map((s) => s.tur).sort()).toEqual(['paratoner', 'paratoner', 'paratoner', 'parsel', 'yapi', 'yapi']);
      expect(sonuc.proje.parsel_siniri).toHaveLength(p.parsel_siniri.length);
      ayniSonuc(p, sonuc.proje);
    }
  });

  test('40 rastgele saha: kotlar, çatıdaki paratonerler ve katsayılar korunur', () => {
    let catida = 0;
    for (let t = 1; t <= 40; t++) {
      const p = rastgeleProje(t);
      const { oneri, sonuc } = gidisDonus(p);
      for (const s of oneri.satirlar) expect(ck.satirHatasi(s, oneri, sonuc.proje), `tohum ${t} ${s.ad}`).toBeNull();
      catida += sonuc.proje.paratonerler.filter((x) => x.yapi_id).length;
      // Kullanılan kotlar aynı yükseklikte yeniden oluşur.
      const kotlar = (q) => [...new Set(q.kot_seviyeleri.map((k) => k.taban_kottan_yukseklik_m))].sort();
      for (const h of kotlar(sonuc.proje)) expect(kotlar(p)).toContain(h);
      ayniSonuc(p, sonuc.proje);
    }
    expect(catida).toBeGreaterThan(0);
  });
});

const GOOGLE_EARTH = `﻿<?xml version="1.0" encoding="UTF-8"?>
<kml:kml xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
<kml:Document>
  <kml:name>Saha keşfi</kml:name>
  <kml:Folder><kml:name>Binalar</kml:name>
    <kml:Placemark>
      <kml:name>Ahır</kml:name>
      <kml:description><![CDATA[<b>Not:</b> çatı sac<br>yükseklik ~6 m]]></kml:description>
      <kml:Polygon><kml:outerBoundaryIs><kml:LinearRing><kml:coordinates>
        30.10000,40.20000,312 30.10060,40.20000,312
        30.10060,40.20030,312 30.10000,40.20030,312 30.10000,40.20000,312
      </kml:coordinates></kml:LinearRing></kml:outerBoundaryIs>
      <kml:innerBoundaryIs><kml:LinearRing><kml:coordinates>30.1002,40.2001,0 30.1003,40.2001,0 30.1003,40.2002,0 30.1002,40.2001,0</kml:coordinates></kml:LinearRing></kml:innerBoundaryIs>
      </kml:Polygon>
    </kml:Placemark>
    <kml:Placemark>
      <kml:name>Silo ve direk</kml:name>
      <kml:ExtendedData><kml:SchemaData schemaUrl="#s"><kml:SimpleData name="pt_H_m">14,5</kml:SimpleData></kml:SchemaData></kml:ExtendedData>
      <kml:MultiGeometry>
        <kml:Point><kml:coordinates>30.1010,40.2005,0</kml:coordinates></kml:Point>
        <kml:Polygon><kml:outerBoundaryIs><kml:LinearRing><kml:coordinates>30.1012,40.2004 30.1014,40.2004 30.1014,40.2006 30.1012,40.2004</kml:coordinates></kml:LinearRing></kml:outerBoundaryIs></kml:Polygon>
      </kml:MultiGeometry>
    </kml:Placemark>
  </kml:Folder>
  <kml:Placemark><kml:name>Yol</kml:name><kml:LineString><kml:coordinates>30.1,40.2 30.2,40.3</kml:coordinates></kml:LineString></kml:Placemark>
  <kml:Placemark><kml:name>Boş</kml:name></kml:Placemark>
</kml:Document>
</kml:kml>`;

describe('Google Earth dosyası', () => {
  const belge = coz(GOOGLE_EARTH);

  test('ad alanı öneki, klasör, MultiGeometry, SchemaData, açıklama ve yükseklikler', () => {
    expect(belge.ad).toBe('Saha keşfi');
    expect(belge.ogeler.map((o) => [o.ad, o.geometri.tur])).toEqual([
      ['Ahır', 'poligon'],
      ['Silo ve direk (1)', 'nokta'],
      ['Silo ve direk (2)', 'poligon'],
      ['Yol', 'cizgi'],
    ]);
    const ahir = belge.ogeler[0];
    expect(ahir.geometri.poligon).toHaveLength(4); // kapanış noktası atılır
    expect(ahir.geometri.delikVar).toBe(true);
    expect(ahir.aciklama).toBe('Not: çatı sac\nyükseklik ~6 m');
    expect(belge.ogeler[2].veri.pt_H_m).toBe('14,5');
  });

  test('öneri: poligon yapı, nokta paratoner; çizgi listelenmez; mast girilmeden paratoner eklenmez', () => {
    const proje = ck.yeniProje();
    const oneri = ck.aktarimOnerisi(belge, proje);
    expect(oneri.atlanan).toBe(1);
    expect(oneri.satirlar.map((s) => s.tur)).toEqual(['yapi', 'paratoner', 'yapi']);
    expect(oneri.satirlar[0].notlar).toContain('DELIK');
    expect(oneri.satirlar[0].yukseklik).toBeNull(); // KML yüksekliği (312 m) alınmaz
    expect(oneri.satirlar[2].yukseklik).toBe(14.5);
    // Projede kot yok: varsayılan "Zemin ±0" yeni kot olarak önerilir.
    expect(oneri.tabanlar.filter((t) => t.tur === 'yeniKot').map((t) => [t.isim, t.yukseklik])).toEqual([['Zemin', 0]]);
    expect(ck.satirHatasi(oneri.satirlar[1], oneri, proje)).toBe('MAST');
    expect(() => ck.projeyeAktar(proje, oneri)).toThrow();

    oneri.satirlar[1].yukseklik = 12;
    const sonuc = ck.projeyeAktar(proje, oneri);
    expect([sonuc.yapi, sonuc.paratoner, sonuc.kot]).toEqual([2, 1, 1]);
    const ahir = sonuc.proje.yapilar.find((y) => y.isim === 'Ahır');
    expect(ahir.H_m).toBeNull();
    // Eksik yükseklik ve katsayılar: yapı eklenir ama hesaplanamaz.
    expect(ck.projeyiHesapla({ ...sonuc.proje, Nk: 30, deltaT: 60 }).yapilar.find((y) => y.yapiIsim === 'Ahır').nihai.kod).toBe('HESAPLANAMADI');
  });
});

describe('Projeye aktarma kuralları', () => {
  test('aynı kimlikli öğe projede varsa varsayılan olarak alınmaz', () => {
    const p = kanitSenaryosu();
    const oneri = ck.aktarimOnerisi(coz(uret(p)), p);
    // Parselin kimliği yoktur; projede parsel varsa yerine geçeceği belirtilir (ayrı test).
    for (const s of oneri.satirlar.filter((x) => x.tur === 'yapi' || x.tur === 'paratoner')) {
      expect(s.notlar).toContain('VAR');
      expect(s.al).toBe(false);
    }
  });

  test('kot eşleşmesi: aynı ad ve yükseklik var olan kotu kullanır, yeni yükseklik bir kez oluşturulur', () => {
    const p = ck.yeniProje();
    const zemin = ck.yeniKotSeviyesi('Zemin', 0);
    p.kot_seviyeleri = [zemin];
    const xml = `<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
      <Placemark><name>A</name><ExtendedData><Data name="pt_kot"><value>Zemin</value></Data><Data name="pt_kot_m"><value>0</value></Data></ExtendedData>
        <Polygon><outerBoundaryIs><LinearRing><coordinates>30,40 30.001,40 30.001,40.001 30,40</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
      <Placemark><name>B</name><ExtendedData><Data name="pt_kot"><value>Teras</value></Data><Data name="pt_kot_m"><value>3.5</value></Data></ExtendedData>
        <Polygon><outerBoundaryIs><LinearRing><coordinates>30.002,40 30.003,40 30.003,40.001 30.002,40</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
      <Placemark><name>C</name><ExtendedData><Data name="pt_kot"><value>Teras</value></Data><Data name="pt_kot_m"><value>3.5</value></Data></ExtendedData>
        <Polygon><outerBoundaryIs><LinearRing><coordinates>30.004,40 30.005,40 30.005,40.001 30.004,40</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
    </Document></kml>`;
    const oneri = ck.aktarimOnerisi(coz(xml), p);
    expect(oneri.satirlar[0].taban).toBe(zemin.id);
    expect(oneri.satirlar[1].taban).toBe(oneri.satirlar[2].taban);
    const sonuc = ck.projeyeAktar(p, oneri);
    expect(sonuc.kot).toBe(1);
    const teras = sonuc.proje.kot_seviyeleri.find((k) => k.isim === 'Teras');
    expect(teras.taban_kottan_yukseklik_m).toBe(3.5);
    expect(sonuc.proje.yapilar.filter((y) => y.kot_seviyesi_id === teras.id)).toHaveLength(2);
  });

  test('çatıdaki paratoner: yapısı seçimden çıkarılırsa hata verir, sessizce zemine inmez', () => {
    let t = 1;
    while (!rastgeleProje(t).paratonerler.some((x) => x.yapi_id)) t++;
    const p = rastgeleProje(t);
    const cati = p.paratonerler.find((x) => x.yapi_id);
    expect(cati).toBeDefined();
    const bos = ck.yeniProje();
    const oneri = ck.aktarimOnerisi(coz(uret(p)), bos);
    const prSatiri = oneri.satirlar.find((s) => s.oge.veri.pt_kimlik === cati.id);
    expect(oneri.tabanlar.find((t) => t.anahtar === prSatiri.taban).tur).toBe('cati');
    oneri.satirlar.find((s) => s.oge.veri.pt_kimlik === cati.yapi_id).al = false;
    expect(ck.satirHatasi(prSatiri, oneri, bos)).toBe('CATI');
  });

  test('ikinci parsel sınırı alınmaz; var olan parselin yerine geçeceği belirtilir', () => {
    const p = kanitSenaryosu();
    const parsel = `<Placemark><ExtendedData><Data name="pt_tur"><value>parsel</value></Data></ExtendedData><Polygon><outerBoundaryIs><LinearRing><coordinates>32.79,39.89 32.81,39.89 32.81,39.91 32.79,39.89</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
    const oneri = ck.aktarimOnerisi(coz(`<kml xmlns="http://www.opengis.net/kml/2.2"><Document>${parsel}${parsel}</Document></kml>`), p);
    expect(oneri.satirlar.map((s) => [s.tur, s.al])).toEqual([['parsel', true], ['parsel', false]]);
    expect(oneri.satirlar[0].notlar).toContain('PARSEL_DEGISIR');
    expect(oneri.satirlar[1].notlar).toContain('PARSEL_FAZLA');
  });

  test('geçersiz dosyalar', () => {
    expect(() => coz('bu xml değil <')).toThrow(ck.KmlHatasi);
    expect(() => coz('<gpx><wpt/></gpx>')).toThrow(ck.KmlHatasi);
  });
});

describe('KMZ', () => {
  test('arşivdeki doc.kml okunur; KML yoksa hata; düz KML UTF-8 (BOM atılır)', async () => {
    const JSZip = (await import('jszip')).default;
    const { kmlMetni, KmzBosHatasi } = await import('../src/arayuz/aktarim/kmz');
    const zip = new JSZip();
    zip.file('files/ikon.png', new Uint8Array([1, 2, 3]));
    zip.file('a.kml', '<kml>a</kml>');
    zip.file('doc.kml', '<kml>Çatı</kml>');
    expect(await kmlMetni(await zip.generateAsync({ type: 'uint8array' }))).toBe('<kml>Çatı</kml>');

    const bos = new JSZip();
    bos.file('resim.jpg', 'x');
    await expect(kmlMetni(await bos.generateAsync({ type: 'uint8array' }))).rejects.toBeInstanceOf(KmzBosHatasi);

    const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('<kml>Ğ</kml>')]);
    expect(await kmlMetni(bom)).toBe('<kml>Ğ</kml>');
  });

  test('dışa aktarılan KML, KMZ içinden okunup aynı belgeyi verir', async () => {
    const JSZip = (await import('jszip')).default;
    const { kmlMetni } = await import('../src/arayuz/aktarim/kmz');
    const xml = uret(kanitSenaryosu());
    const zip = new JSZip();
    zip.file('doc.kml', xml);
    const belge = coz(await kmlMetni(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })));
    expect(belge).toEqual(coz(xml));
  });
});

describe('KML 2.2 şema sırası', () => {
  test('Placemark: name → description → styleUrl → ExtendedData → geometri; Document: Style → ExtendedData → Folder', () => {
    const xml = uret(kanitSenaryosu());
    const belge = new DOMParser().parseFromString(xml, 'application/xml');
    const adlar = (e) => [...e.childNodes].filter((c) => c.nodeType === 1).map((c) => c.localName);
    const SIRA = ['name', 'open', 'description', 'LookAt', 'styleUrl', 'Style', 'ExtendedData', 'Folder', 'Placemark', 'Point', 'Polygon'];
    const siraliMi = (liste) => liste.every((a, i) => i === 0 || SIRA.indexOf(liste[i - 1]) <= SIRA.indexOf(a));
    const dokuman = belge.getElementsByTagName('Document')[0];
    expect(siraliMi(adlar(dokuman)), adlar(dokuman).join(',')).toBe(true);
    for (const pm of [...belge.getElementsByTagName('Placemark')]) expect(siraliMi(adlar(pm)), adlar(pm).join(',')).toBe(true);
  });
});
