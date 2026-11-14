// Proje dosya biçimi (.ptproj): yazma/okuma, eski sürümden aktarım, doğrulama.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PROJE_DOSYA_SURUMU,
  ProjeDosyasiHatasi,
  projeDosyasiOku,
  projeDosyasiYaz,
  projeyiDogrula,
  projeyiHesapla,
} from '../src/core';
import { deltaTAyarla } from '../src/arayuz/durum/eylemler';

const v5Metni = readFileSync(new URL('./veri/kanit_senaryosu.json', import.meta.url), 'utf8');
const v5 = () => JSON.parse(v5Metni);
const oku = (nesne) => projeDosyasiOku(JSON.stringify(nesne));

describe('Yeni biçim (.ptproj)', () => {
  test('yazılan proje aynen geri okunur', () => {
    const { proje } = oku(v5());
    const temiz = deltaTAyarla(60)(proje);
    const metin = projeDosyasiYaz(temiz, 'Paratoner Risk Analizi test', new Date('2026-10-26T10:00:00Z'));
    const dosya = JSON.parse(metin);
    expect(dosya).toMatchObject({ bicim: 'paratoner-proje', surum: PROJE_DOSYA_SURUMU, kaydedilme: '2026-10-26T10:00:00.000Z' });
    const geri = projeDosyasiOku(metin);
    expect(geri.eskiSurumdenAktarildi).toBe(false);
    expect(geri.uyarilar).toEqual([]);
    expect(geri.proje).toEqual(temiz);
  });

  test('daha yeni bir sürümle kaydedilmiş dosya reddedilir', () => {
    const metin = JSON.stringify({ bicim: 'paratoner-proje', surum: PROJE_DOSYA_SURUMU + 1, proje: v5() });
    expect(() => projeDosyasiOku(metin)).toThrow(/daha yeni bir sürümüyle/);
  });

  test('UTF-8 BOM ile kaydedilmiş dosya okunur', () => {
    expect(() => projeDosyasiOku(`﻿${v5Metni}`)).not.toThrow();
  });
});

describe('Eski sürümden (v5) aktarım', () => {
  test('ΔT = 60 olan v5 projesinde ΔT onayı istenir ve hesap yapılmaz', () => {
    const { proje, eskiSurumdenAktarildi, uyarilar } = oku(v5());
    expect(eskiSurumdenAktarildi).toBe(true);
    expect(proje.deltaT_onay_gerekli).toBe(true);
    expect(uyarilar[0]).toMatch(/ΔT değerini onaylayana kadar/);
    const sonuc = projeyiHesapla(proje);
    expect(sonuc.dogrulama.hatalar.map((h) => h.kod)).toContain('DELTA_T_ONAY');
    expect(sonuc.yapilar.every((y) => y.nihai.kod === 'HESAPLANAMADI')).toBe(true);
  });

  test('ΔT seçilince onay tamamlanır ve hesap yapılır', () => {
    const onaylandi = deltaTAyarla(60)(oku(v5()).proje);
    expect(onaylandi.deltaT_onay_gerekli).toBeUndefined();
    expect(projeyiDogrula(onaylandi).hesaplanabilir).toBe(true);
    expect(projeyiHesapla(onaylandi).yapilar.map((y) => y.nihai.kod)).toEqual(['YETERLI_KOMBINE', 'KORUYUCU_YOK']);
  });

  test('v5\'te kullanıcının bilinçli seçtiği ΔT (30/45) için onay istenmez', () => {
    const { proje, uyarilar } = oku({ ...v5(), deltaT: 30 });
    expect(proje.deltaT_onay_gerekli).toBeUndefined();
    expect(uyarilar).toEqual([]);
  });

  test('standart dışı C değerleri bildirilir', () => {
    const ham = v5();
    ham.yapilar[0].C2 = 1.5;
    expect(oku(ham).uyarilar.join(' ')).toMatch(/Depo-B: standart dışı C katsayısı/);
  });

  test('eksik isteğe bağlı alanlar güvenli varsayılanlarla tamamlanır', () => {
    const ham = v5();
    delete ham.paratonerler[0].aktif_mi;
    delete ham.paratonerler[0].h_esikleri;
    const { proje } = oku(ham);
    expect(proje.deltaT_modu).toBe('proje');
    expect(proje.tesis_adresi).toBe('');
    expect(proje.paratonerler[0]).toMatchObject({ aktif_mi: true, gorunur_mu: true, h_esikleri: [2, 3, 4, 5] });
  });
});

describe('Bozuk dosyalar açık mesajla reddedilir', () => {
  const reddet = (degistir, mesaj) => {
    const ham = v5();
    degistir(ham);
    expect(() => oku(ham)).toThrow(ProjeDosyasiHatasi);
    expect(() => oku(ham)).toThrow(mesaj);
  };

  test('JSON olmayan içerik', () => {
    expect(() => projeDosyasiOku('{bozuk')).toThrow(/geçerli bir JSON değil/);
  });
  test('proje olmayan JSON', () => {
    expect(() => projeDosyasiOku('{"merhaba": 1}')).toThrow(/paratoner projesi değil/);
  });
  test('sayı olması gereken alanda metin', () => reddet((h) => (h.yapilar[0].H_m = 'altı'), /Yapı "Depo-B" yüksekliği \(H\) geçerli bir sayı olmalı/));
  test('aralık dışı koordinat', () => reddet((h) => (h.paratonerler[1].lat = 123), /Paratoner "P2" koordinatı geçerli aralıkta değil/));
  test('tekrarlanan kimlik', () => reddet((h) => (h.paratonerler[1].id = h.paratonerler[0].id), /birden fazla öğede kullanılmış/));
  test('kot yüksekliği eksik', () => reddet((h) => delete h.kot_seviyeleri[0].taban_kottan_yukseklik_m, /Kot seviyesi #1 yüksekliği/));
  test('poligon köşesi bozuk', () => reddet((h) => (h.yapilar[1].poligon[2] = { lat: 'x', lng: 1 }), /Yapı "Silo-A", köşe 3 enlemi/));
});
