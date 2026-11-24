// Saha uygulamasının KML çıktısı masaüstündeki içe aktarmayla doğru açılır: koordinatlar, kot
// seviyeleri (paratoner konmamış olanlar dahil), mast yüksekliği, konum doğruluğu ve not.
import { describe, test, expect } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import * as ck from '../src/core';

const ETIKET = {
  klasor: 'Paratonerler',
  kot: (ad, kot) => `Kot: ${ad} (${kot} m)`,
  mast: (m) => `Mast: ${m} m`,
  dogruluk: (m) => `Doğruluk: ±${m} m`,
  elle: 'Koordinat elle girildi',
  zaman: (z) => `Zaman: ${z}`,
  not: (n) => `Not: ${n}`,
  kotMetni: (m) => (m === 0 ? '±0,0' : `+${m}`),
  sayi: (x) => String(x),
};

const kesif = () => ({
  id: 'kesif_1',
  ad: 'Örnek <keşif> & saha',
  olusturma: '2026-11-20T10:00:00.000Z',
  guncelleme: '2026-11-20T11:00:00.000Z',
  kotlar: [
    { id: 'k0', ad: 'Zemin', yukseklik_m: 0 },
    { id: 'k1', ad: '1. kot', yukseklik_m: 3.5 },
    { id: 'k2', ad: '2. kot', yukseklik_m: 7.25 },
  ],
  paratonerler: [
    { id: 'p1', ad: 'Paratoner 1', kot_id: 'k0', konum: { lat: 39.9208123, lng: 32.8541987, dogruluk_m: 3.24, zaman: '2026-11-20T10:30:00.000Z', kaynak: 'gps' }, mast_m: 9, not: 'Trafo yanında, "kuzey" köşe' },
    { id: 'p2', ad: 'Paratoner 2', kot_id: 'k1', konum: { lat: 39.9211, lng: 32.8549, dogruluk_m: null, zaman: '2026-11-20T10:40:00.000Z', kaynak: 'elle' }, mast_m: null, not: '' },
    { id: 'p3', ad: 'Paratoner 3', kot_id: 'k1', konum: null, mast_m: 6, not: '' },
  ],
});

const bosProje = () => ({ ...ck.yeniProje('Masaüstü'), kot_seviyeleri: [], yapilar: [], paratonerler: [] });

describe('Saha KML', () => {
  const { kml, konumsuz } = ck.sahaKmlUret(kesif(), ETIKET, 'Paratoner Saha 1.0.0');
  const belge = ck.kmlCoz(kml, new DOMParser());

  test('konumu olmayan paratoner yazılmaz, adı bildirilir', () => {
    expect(konumsuz).toEqual(['Paratoner 3']);
    expect(belge.ogeler.map((o) => o.ad)).toEqual(['Paratoner 1', 'Paratoner 2']);
    expect(belge.ad).toBe('Örnek <keşif> & saha');
  });

  test('belge şema alanları ve kot listesi', () => {
    expect(belge.veri.pt_surum).toBe('1');
    expect(ck.kotListesiOku(belge.veri.pt_kotlar)).toEqual([
      { ad: 'Zemin', m: 0 },
      { ad: '1. kot', m: 3.5 },
      { ad: '2. kot', m: 7.25 },
    ]);
    expect(ck.kotListesiOku('bozuk')).toEqual([]);
    expect(ck.kotListesiOku('[{"ad":"","m":1},{"ad":"A","m":"x"},{"ad":"B","m":2}]')).toEqual([{ ad: 'B', m: 2 }]);
  });

  test('boş projeye aktarım: koordinat, kotlar (boş kot dahil), mast, doğruluk, not', () => {
    const proje = bosProje();
    const oneri = ck.aktarimOnerisi(belge, proje);
    const [p1, p2] = oneri.satirlar;
    expect(oneri.belgeKotlari).toHaveLength(3);
    expect(p1.tur).toBe('paratoner');
    expect(p1.yukseklik).toBe(9);
    expect(p2.yukseklik).toBeNull();
    expect(p1.oge.veri.pt_dogruluk_m).toBe('3.2');
    expect(p1.oge.veri.pt_not).toBe('Trafo yanında, "kuzey" köşe');
    expect(p2.oge.veri.pt_konum_kaynagi).toBe('elle');
    // Mast yüksekliği girilmeyen paratoner önizlemede tamamlanır.
    expect(ck.satirHatasi(p2, oneri, proje)).toBe('MAST');
    const tamam = { ...oneri, satirlar: oneri.satirlar.map((s) => (s.yukseklik === null ? { ...s, yukseklik: 4 } : s)) };
    const sonuc = ck.projeyeAktar(proje, tamam);
    const kotlar = new Map(sonuc.proje.kot_seviyeleri.map((k) => [k.id, k]));
    expect([...kotlar.values()].map((k) => [k.isim, k.taban_kottan_yukseklik_m])).toEqual([
      ['Zemin', 0],
      ['1. kot', 3.5],
      ['2. kot', 7.25],
    ]);
    const [a, b] = sonuc.proje.paratonerler;
    expect([a.isim, a.lat, a.lng, a.mast_yuksekligi_m, kotlar.get(a.kot_seviyesi_id).isim]).toEqual(['Paratoner 1', 39.9208123, 32.8541987, 9, 'Zemin']);
    expect([b.isim, b.mast_yuksekligi_m, kotlar.get(b.kot_seviyesi_id).isim]).toEqual(['Paratoner 2', 4, '1. kot']);
  });

  test('projede aynı kot varsa yenisi açılmaz', () => {
    const proje = { ...bosProje(), kot_seviyeleri: [ck.yeniKotSeviyesi('Zemin', 0), ck.yeniKotSeviyesi('Çatı arası', 3.5)] };
    const oneri = ck.aktarimOnerisi(belge, proje);
    const tamam = { ...oneri, satirlar: oneri.satirlar.map((s) => ({ ...s, yukseklik: s.yukseklik ?? 4 })) };
    const sonuc = ck.projeyeAktar(proje, tamam);
    expect(sonuc.proje.kot_seviyeleri.map((k) => [k.isim, k.taban_kottan_yukseklik_m])).toEqual([
      ['Zemin', 0],
      ['Çatı arası', 3.5],
      ['2. kot', 7.25],
    ]);
  });

  test('Google Earth balonu ve özel karakterler', () => {
    expect(kml).toContain('<name>Örnek &lt;keşif&gt; &amp; saha</name>');
    expect(belge.ogeler[0].aciklama).toContain('Doğruluk: ±3.24 m');
    expect(belge.ogeler[1].aciklama).toContain('Koordinat elle girildi');
  });
});
