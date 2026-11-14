// Kaynak doğrulama: hesap çekirdeği, Amper ve Radsan'ın yayımladığı hesaplar ile
// NF C 17-102 formülüne göre sınanır. Bu testler HER ZAMAN geçmek zorunda.
import { describe, test, expect } from 'vitest';
import {
  aeHesapla,
  yapiRiskAnalizi,
  ngHesapla,
  gerekliSeviyeBelirle,
  ESE_TABLOLARI,
  rpOku,
  gercekHHesapla,
  paratonerTepeKotu,
  STANDART_C_DEGERLERI,
  C2_MATRISI,
} from '../src/core';
import { KAYNAK_ORNEKLERI, AMPER_ESE_TABLOLARI, STANDART_C } from './veri/kaynaklar';
import { rpFormul } from './veri/nfc17102';

const SEVIYELER = ['I', 'II', 'III', 'IV'];

describe('Risk analizi — kaynak örnekleri', () => {
  test.each(KAYNAK_ORNEKLERI)('$ad', ({ L, W, H, Td, C, beklenen }) => {
    const { Ae } = aeHesapla({ manuelBoyut: true, L_m: L, W_m: W, H_m: H, poligon: [] });
    const a = yapiRiskAnalizi({ Ae, ...C }, Td);
    expect(Ae).toBeCloseTo(beklenen.Ae, 4);
    expect(a.Ng).toBeCloseTo(beklenen.Ng, 4);
    expect(a.Nd).toBeCloseTo(beklenen.Nd, 4);
    expect(a.Nc).toBeCloseTo(beklenen.Nc, 4);
    expect(a.E).toBeCloseTo(beklenen.E, 2);
    expect(a.seviye).toBe(beklenen.seviye);
    expect(a.sutun).toBe(beklenen.sutun);
  });

  test('Ng = 0,04·Td^1,25', () => {
    for (const Td of [5, 12, 30, 45, 80]) expect(ngHesapla(Td)).toBeCloseTo(0.04 * Td ** 1.25, 10);
    expect(ngHesapla(0)).toBe(0);
    expect(ngHesapla(null)).toBe(0);
  });

  test('E eşikleri (sınır değerler dahil, yuvarlanmamış E üzerinden)', () => {
    const s = (E) => gerekliSeviyeBelirle(E);
    expect(s(0.98)).toMatchObject({ seviye: 'Seviye 1', sutun: 'I' });
    expect(s(0.9801)).toMatchObject({ seviye: 'Seviye 1 + ek önlem', sutun: 'I' });
    expect(s(0.95)).toMatchObject({ seviye: 'Seviye 2', sutun: 'II' });
    expect(s(0.9501)).toMatchObject({ seviye: 'Seviye 1', sutun: 'I' });
    expect(s(0.9)).toMatchObject({ seviye: 'Seviye 3', sutun: 'III' });
    expect(s(0.9001)).toMatchObject({ seviye: 'Seviye 2', sutun: 'II' });
    expect(s(0.8)).toMatchObject({ seviye: 'Seviye 4', sutun: 'IV' });
    expect(s(0.8001)).toMatchObject({ seviye: 'Seviye 3', sutun: 'III' });
    expect(s(0.0001)).toMatchObject({ seviye: 'Seviye 4' });
    expect(s(0).seviye).toBe('İsteğe bağlı');
    expect(s(-1).seviye).toBe('İsteğe bağlı');
    expect(s(null).seviye).toBe('GEÇERSİZ VERİ');
  });

  test('ek önlem ve isteğe bağlı bayrakları', () => {
    const girdi = { Ae: 21133.2295, C1: 0.25, C2: 1, C3: 2, C4: 3, C5: 10 };
    expect(yapiRiskAnalizi(girdi, 12)).toMatchObject({ ekOnlemGerekli: true, istegeBagli: false });
    const dusuk = yapiRiskAnalizi({ Ae: 100, C1: 0.25, C2: 1, C3: 1, C4: 1, C5: 1 }, 10);
    expect(dusuk).toMatchObject({ ekOnlemGerekli: false, istegeBagli: true, seviye: 'İsteğe bağlı' });
  });

  test('Ae: dikdörtgen poligon ≈ L·W + 6H(L+W) + 9πH²', () => {
    const lat0 = 39.9, mLat = 111320, mLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
    const n = (x, y) => ({ lat: lat0 + y / mLat, lng: 32.8 + x / mLng });
    const poligon = [n(0, 0), n(60, 0), n(60, 25), n(0, 25)];
    const poligondan = aeHesapla({ poligon, H_m: 8, manuelBoyut: false }).Ae;
    const elle = aeHesapla({ manuelBoyut: true, L_m: 60, W_m: 25, H_m: 8, poligon }).Ae;
    expect(Math.abs(poligondan - elle) / elle).toBeLessThan(0.005);
  });
});

describe('Rp tablosu', () => {
  test.each([15, 30, 45, 60])('ΔT = %i µs: Amper tablosuyla hücre hücre aynı', (dT) => {
    expect(ESE_TABLOLARI[dT]).toEqual(AMPER_ESE_TABLOLARI[dT]);
  });

  test.each([15, 30, 45, 60])('ΔT = %i µs: tablo NF C 17-102 formülüyle en fazla 0,5 m farklı', (dT) => {
    for (const satir of ESE_TABLOLARI[dT]) {
      for (const sv of SEVIYELER) {
        expect(Math.abs(satir[sv] - rpFormul(satir.h, sv, dT))).toBeLessThanOrEqual(0.5);
      }
    }
  });

  test('ara değer doğrusal enterpolasyonla okunur', () => {
    expect(rpOku(3, 'IV', 60)).toEqual({ tamam: true, rp: 64, enterpoleEdildi: true });
    expect(rpOku(15, 'IV', 60)).toEqual({ tamam: true, rp: 111, enterpoleEdildi: true });
    expect(rpOku(5, 'IV', 60)).toEqual({ tamam: true, rp: 107, enterpoleEdildi: false });
    expect(rpOku(60, 'I', 15)).toEqual({ tamam: true, rp: 35, enterpoleEdildi: false });
  });

  test('enterpolasyon, standart formüle göre hiçbir zaman 1,5 metreden fazla sapmaz', () => {
    for (const dT of [15, 30, 45, 60]) {
      for (const sv of SEVIYELER) {
        for (let h = 2; h <= 60; h += 0.25) {
          const okuma = rpOku(h, sv, dT);
          expect(Math.abs(okuma.rp - rpFormul(h, sv, dT))).toBeLessThan(1.5);
        }
      }
    }
  });

  test('tanımsız durumlar değer üretmez', () => {
    expect(rpOku(61, 'IV', 60)).toMatchObject({ tamam: false, neden: 'H_60_USTU' });
    expect(rpOku(1.5, 'IV', 60)).toMatchObject({ tamam: false, neden: 'H_2_ALTI' });
    expect(rpOku(10, 'IV', 25)).toMatchObject({ tamam: false, neden: 'DELTA_T_TANIMSIZ' });
    expect(rpOku(10, 'IV', null)).toMatchObject({ tamam: false, neden: 'DELTA_T_TANIMSIZ' });
    expect(rpOku(NaN, 'IV', 60)).toMatchObject({ tamam: false, neden: 'GECERSIZ_H' });
  });
});

describe('Kot zinciri', () => {
  const proje = {
    kot_seviyeleri: [{ id: 'k0', taban_kottan_yukseklik_m: 0 }, { id: 'k2', taban_kottan_yukseklik_m: 2 }],
    yapilar: [
      { id: 'y1', kot_seviyesi_id: 'k2', H_m: 8 },
      { id: 'y2', kot_seviyesi_id: 'k0', H_m: 4 },
    ],
  };

  test('yapı üzerindeki paratonerin tepe kotu = kot + H + mast', () => {
    expect(paratonerTepeKotu({ yapi_id: 'y1', kot_seviyesi_id: null, mast_yuksekligi_m: 5 }, proje)).toBe(15);
  });

  test('h = paratoner tepe kotu − korunan yapının çatı kotu', () => {
    const pr = { yapi_id: 'y1', kot_seviyesi_id: null, mast_yuksekligi_m: 5 };
    expect(gercekHHesapla(pr, proje.yapilar[1], proje)).toBe(11);
    expect(gercekHHesapla(pr, proje.yapilar[0], proje)).toBe(5);
    expect(gercekHHesapla({ yapi_id: null, kot_seviyesi_id: 'k0', mast_yuksekligi_m: 6 }, proje.yapilar[0], proje)).toBe(-4);
  });
});

describe('C katsayıları — standart değerler', () => {
  test.each(['C1', 'C3', 'C4', 'C5'])('%s', (c) => {
    expect(STANDART_C_DEGERLERI[c]).toEqual(STANDART_C[c]);
  });
  test('C2 değerleri ve matrisi', () => {
    expect(STANDART_C_DEGERLERI.C2).toEqual(STANDART_C.C2);
    const { degerler } = STANDART_C.C2_MATRIS;
    const sira = ['metal', 'normal', 'yanici'];
    sira.forEach((yapi, i) => sira.forEach((cati, j) => expect(C2_MATRISI[yapi][cati]).toBe(degerler[j][i])));
  });
});
