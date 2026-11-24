// Saha uygulamasının yardımcıları: yapıştırılan koordinat, konum okumalarının birleştirilmesi,
// numaralandırma, sayı girişi, sayfa adresi ve metin sözlüğü.
import { describe, test, expect } from 'vitest';
import { koordinatCoz } from '../saha/src/koordinatCoz';
import { okumalariBirlestir, yakalamaKarari, YAKALAMA } from '../saha/src/konum';
import { asciiDosyaAdi, sayiOku, sonrakiNumara } from '../saha/src/veri';
import { rotaAdresi, rotaCoz } from '../saha/src/rota';
import { metinler } from '../saha/src/dil';
import { ayarlariOku, varsayilanAyarlar } from '../saha/src/ayarlar';

describe('Yapıştırılan koordinat', () => {
  test.each([
    ['39.920812, 32.854198', 39.920812, 32.854198],
    ['  39.920812,32.854198 ', 39.920812, 32.854198],
    ['39.920812 32.854198', 39.920812, 32.854198],
    ['39,920812 32,854198', 39.920812, 32.854198],
    ['39,920812; 32,854198', 39.920812, 32.854198],
    ['39,920812, 32,854198', 39.920812, 32.854198],
    ['-33.8688, 151.2093', -33.8688, 151.2093],
    [`39°55'14.9"N 32°51'15.1"E`, 39 + 55 / 60 + 14.9 / 3600, 32 + 51 / 60 + 15.1 / 3600],
    [`39°55'14,9"K 32°51'15,1"D`, 39 + 55 / 60 + 14.9 / 3600, 32 + 51 / 60 + 15.1 / 3600],
    ['https://www.google.com/maps/place/Kizilay/@39.9208,32.8541,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d39.92081!4d32.85419', 39.92081, 32.85419],
    ['https://www.google.com/maps/@39.9208,32.8541,17z', 39.9208, 32.8541],
    ['https://www.google.com/maps/search/?api=1&query=39.92,32.85', 39.92, 32.85],
    ['https://maps.google.com/?q=39.92%2C32.85', 39.92, 32.85],
    ['geo:39.92,32.85?z=17', 39.92, 32.85],
  ])('%s', (metin, lat, lng) => {
    const k = koordinatCoz(metin);
    expect(k).not.toBeNull();
    expect(k.lat).toBeCloseTo(lat, 7);
    expect(k.lng).toBeCloseTo(lng, 7);
  });

  test.each(['', 'Kızılay, Ankara', '95.1, 32.8', '39.9, 200', '0, 0', 'https://maps.app.goo.gl/abcd', '39.9'])('tanınmaz: %s', (metin) => {
    expect(koordinatCoz(metin)).toBeNull();
  });
});

describe('Konum okumalarının birleştirilmesi', () => {
  const o = (lat, lng, dogruluk, zaman = 0) => ({ lat, lng, dogruluk, zaman });

  test('okuma yoksa sonuç yok', () => {
    expect(okumalariBirlestir([])).toBeNull();
    expect(okumalariBirlestir([o(NaN, 1, 5)])).toBeNull();
  });

  test('zayıf okumalar atılır, iyi okumalar doğrulukla ağırlıklı ortalanır, doğruluk en iyi okumanınki', () => {
    const b = okumalariBirlestir([o(39.0, 32.0, 40, 1), o(39.0001, 32.0001, 4, 2), o(39.0003, 32.0003, 4, 3), o(39.0002, 32.0002, 5, 4)]);
    // 40 m'lik okuma eşiğin (max(4·1,5; 4+2) = 6 m) dışında kalır.
    expect(b.dogruluk).toBe(4);
    const w = [1 / 16, 1 / 16, 1 / 25];
    const beklenen = (39.0001 * w[0] + 39.0003 * w[1] + 39.0002 * w[2]) / (w[0] + w[1] + w[2]);
    expect(b.lat).toBeCloseTo(beklenen, 10);
    expect(b.zaman).toBe(4);
  });

  test('1 m altındaki doğruluk ağırlığı patlatmaz', () => {
    const b = okumalariBirlestir([o(39.0, 32.0, 0.2), o(39.00002, 32.00002, 0.5)]);
    expect(b.lat).toBeCloseTo(39.00001, 8);
  });
});

describe('Yardımcılar', () => {
  test('sonraki paratoner numarası', () => {
    expect(sonrakiNumara([])).toBe(1);
    expect(sonrakiNumara(['Paratoner 1', 'Paratoner 2'])).toBe(3);
    expect(sonrakiNumara(['Paratoner 1', 'Kuzey direği', 'P7 '])).toBe(8);
  });

  test('sayı girişi: virgül ya da nokta; boş null; geçersiz NaN', () => {
    expect(sayiOku('3,5')).toBe(3.5);
    expect(sayiOku(' 12.25 ')).toBe(12.25);
    expect(sayiOku('-1,5')).toBe(-1.5);
    expect(sayiOku('')).toBeNull();
    expect(sayiOku('3,5,1')).toBeNaN();
    expect(sayiOku('abc')).toBeNaN();
  });

  test('dosya adı ASCII: Türkçe harfler sadeleşir, ayraçlar tireye döner', () => {
    expect(asciiDosyaAdi('Keşif 22.11.2026')).toBe('Kesif-22-11-2026');
    expect(asciiDosyaAdi('İĞÜŞÖÇ ığüşöç: Çatı katı / 1')).toBe('IGUSOC-igusoc-Cati-kati-1');
    expect(asciiDosyaAdi('Café façade')).toBe('Cafe-facade');
    expect(asciiDosyaAdi('  ...  ')).toBe('kesif');
    expect(asciiDosyaAdi('x'.repeat(200))).toHaveLength(80);
  });

  test('sayfa adresi gidiş-dönüş', () => {
    for (const r of [{ tur: 'liste' }, { tur: 'ayarlar' }, { tur: 'kesif', id: 'kesif_a b' }, { tur: 'paratoner', id: 'k1', pid: 'p/1' }]) expect(rotaCoz(rotaAdresi(r))).toEqual(r);
    expect(rotaCoz('')).toEqual({ tur: 'liste' });
    expect(rotaCoz('#/bilinmeyen')).toEqual({ tur: 'liste' });
  });

  test('sözlük: Türkçe ve İngilizce aynı anahtarlar; sayı ve kot biçimi', () => {
    const tr = metinler('tr');
    const en = metinler('en');
    expect(Object.keys(en).sort()).toEqual(Object.keys(tr).sort());
    expect([tr.sayi(3.5, 2), tr.sayi(3, 2), tr.kot(3.5), tr.kot(0), tr.kot(-1.25)]).toEqual(['3,5', '3', '+3,5', '±0', '−1,25']);
    expect([en.sayi(3.5, 2), en.kot(3.5)]).toEqual(['3.5', '+3.5']);
    expect(en.kesifOzeti(1, 2)).toBe('1 air terminal · 2 levels');
  });
});

describe('Arka planda konum alma kararı', () => {
  const o = (dogruluk, lat = 39.92, lng = 32.85) => ({ lat, lng, dogruluk, zaman: 0 });

  test('hızlı: ilk ±15 m okumada hemen kaydeder', () => {
    expect(yakalamaKarari([o(40)], 500, 'hizli').tur).toBe('bekle');
    const k = yakalamaKarari([o(40), o(12)], 900, 'hizli');
    expect(k.tur).toBe('tamam');
    expect(k.okuma.dogruluk).toBe(12);
  });

  test('hızlı: ±30 m için 4 sn, sonra en geç 12 sn bekler', () => {
    expect(yakalamaKarari([o(25)], YAKALAMA.hizliOrtaSure - 1, 'hizli').tur).toBe('bekle');
    expect(yakalamaKarari([o(25)], YAKALAMA.hizliOrtaSure, 'hizli').tur).toBe('tamam');
    expect(yakalamaKarari([o(60)], YAKALAMA.hizliEnCok - 1, 'hizli').tur).toBe('bekle');
    expect(yakalamaKarari([o(60)], YAKALAMA.hizliEnCok, 'hizli').tur).toBe('tamam');
  });

  test('hassas: en az 6 sn ve 3 okuma, ±10 m; en geç 20 sn', () => {
    expect(yakalamaKarari([o(5), o(5), o(5)], 3000, 'hassas').tur).toBe('bekle');
    expect(yakalamaKarari([o(5), o(5)], 7000, 'hassas').tur).toBe('bekle');
    expect(yakalamaKarari([o(5), o(6), o(5)], 7000, 'hassas').tur).toBe('tamam');
    expect(yakalamaKarari([o(20), o(20), o(20)], YAKALAMA.hassasEnCok, 'hassas').tur).toBe('tamam');
  });

  test('hiç okuma gelmezse vazgeçer', () => {
    expect(yakalamaKarari([], 5000, 'hizli').tur).toBe('bekle');
    expect(yakalamaKarari([], YAKALAMA.hicOkumaYok, 'hizli').tur).toBe('yok');
  });
});

describe('Ayarlar', () => {
  test('kayıt yokken varsayılanlar: hızlı konum, eklenince konumu al, kurulum gösterilir', () => {
    const v = varsayilanAyarlar();
    expect([v.tema, v.konumModu, v.otomatikKonum, v.onEk, v.varsayilanMast, v.kurulumTamam]).toEqual(['sistem', 'hizli', true, '', null, false]);
    // Node'da localStorage yok: okuma varsayılanlara düşer.
    expect(ayarlariOku().konumModu).toBe('hizli');
  });
});
