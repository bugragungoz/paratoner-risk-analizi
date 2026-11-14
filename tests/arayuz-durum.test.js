// Arayüzün durum mantığı: geri al/yinele, proje işlemleri, eski proje dosyalarının tamamlanması.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { projeyiHesapla, STANDART_C_DEGERLERI } from '../src/core';
import * as cp from '../src/arayuz/durum/cProfilleri';
import { BOS_DEPO, GECMIS_SINIRI, depoIndirgeyici } from '../src/arayuz/durum/depo';
import * as eylem from '../src/arayuz/durum/eylemler';
import { dosyaIceriginiAc, kayitIcerigi, sonDosyaEkle, zamanEtiketi } from '../src/arayuz/durum/kalicilik';
import { kanitSenaryosu } from './veri/projeler';

const ad = (isim) => (p) => ({ ...p, isim });

describe('Geri al / yinele', () => {
  const baslangic = depoIndirgeyici(BOS_DEPO, { tur: 'yukle', proje: kanitSenaryosu() });

  test('proje yükleme geçmişi sıfırlar (Ctrl+Z önceki projeye dönmez)', () => {
    const d1 = depoIndirgeyici(baslangic, { tur: 'guncelle', fn: ad('A') });
    expect(d1.gecmis).toHaveLength(1);
    const d2 = depoIndirgeyici(d1, { tur: 'yukle', proje: kanitSenaryosu() });
    expect(d2.gecmis).toHaveLength(0);
    expect(depoIndirgeyici(d2, { tur: 'geriAl' })).toBe(d2);
  });

  test('geri al ve yinele', () => {
    const d1 = depoIndirgeyici(baslangic, { tur: 'guncelle', fn: ad('A') });
    const d2 = depoIndirgeyici(d1, { tur: 'guncelle', fn: ad('B') });
    const geri = depoIndirgeyici(d2, { tur: 'geriAl' });
    expect(geri.proje.isim).toBe('A');
    expect(depoIndirgeyici(geri, { tur: 'yinele' }).proje.isim).toBe('B');
    // Geri alındıktan sonra yeni değişiklik ileri geçmişi siler.
    expect(depoIndirgeyici(geri, { tur: 'guncelle', fn: ad('C') }).gelecek).toHaveLength(0);
  });

  test('aynı anahtarla art arda yazma tek adımda birleşir', () => {
    let d = baslangic;
    for (const [i, harf] of ['K', 'Ka', 'Kan'].entries()) d = depoIndirgeyici(d, { tur: 'guncelle', fn: ad(harf), birlestir: 'proje-adi', zaman: 1000 + i * 200 });
    expect(d.gecmis).toHaveLength(1);
    expect(depoIndirgeyici(d, { tur: 'geriAl' }).proje.isim).toBe('Kanit Senaryosu');
    // Uzun aradan sonra yeni adım açılır.
    d = depoIndirgeyici(d, { tur: 'guncelle', fn: ad('Kanı'), birlestir: 'proje-adi', zaman: 9000 });
    expect(d.gecmis).toHaveLength(2);
  });

  test('değişmeyen güncelleme geçmişe girmez; geçmiş sınırlıdır', () => {
    expect(depoIndirgeyici(baslangic, { tur: 'guncelle', fn: (p) => p })).toBe(baslangic);
    let d = baslangic;
    for (let i = 0; i < GECMIS_SINIRI + 10; i++) d = depoIndirgeyici(d, { tur: 'guncelle', fn: ad(`v${i}`) });
    expect(d.gecmis).toHaveLength(GECMIS_SINIRI);
  });
});

describe('Proje işlemleri', () => {
  test('kullanımdaki kot seviyesi silinemez', () => {
    const p = kanitSenaryosu();
    const { silinebilir, bagimlilar } = eylem.kotSilinebilirMi(p, 'kot_0');
    expect(silinebilir).toBe(false);
    expect(bagimlilar).toEqual(['Depo-B', 'Silo-A', 'P1', 'P2', 'P3']);
    expect(eylem.kotSil('kot_0')(p)).toBe(p);
  });

  test('yapı, üzerindeki paratonerlerle birlikte silinir', () => {
    const p = kanitSenaryosu();
    p.paratonerler[0].yapi_id = 'yp_silo';
    p.paratonerler[0].kot_seviyesi_id = null;
    const sonra = eylem.yapiSil('yp_silo')(p);
    expect(sonra.yapilar.map((y) => y.isim)).toEqual(['Depo-B']);
    expect(sonra.paratonerler.map((pr) => pr.isim)).toEqual(['P2', 'P3']);
  });

  test('gizle yalnızca görsel, devre dışı hesaptan çıkarır', () => {
    const p = kanitSenaryosu();
    const depo = (proje) => projeyiHesapla(proje).yapilar.find((y) => y.yapiIsim === 'Depo-B').nihai.kod;
    const gizli = eylem.paratonerGorunurlukGecis('pr_2')(p);
    expect(gizli.paratonerler[1].gorunur_mu).toBe(false);
    expect(depo(gizli)).toBe('YETERLI_KOMBINE');
    const pasif = eylem.paratonerEtkinlikGecis('pr_2')(p);
    expect(pasif.paratonerler[1].aktif_mi).toBe(false);
    expect(depo(pasif)).toBe('KISMI');
    expect(eylem.paratonerEtkinlikGecis('pr_2')(pasif).paratonerler[1].aktif_mi).toBe(true);
  });

  test('ΔT modu ve değeri', () => {
    const p = eylem.deltaTModuAyarla('paratoner')(eylem.deltaTAyarla(45)(kanitSenaryosu()));
    expect(p).toMatchObject({ deltaT: 45, deltaT_modu: 'paratoner' });
  });
});

describe('Eski (v5) proje dosyaları', () => {
  test('eksik alanlar tamamlanır, mevcut değerler korunur', () => {
    const ham = JSON.parse(readFileSync(new URL('./veri/kanit_senaryosu.json', import.meta.url), 'utf8'));
    delete ham.paratonerler[0].aktif_mi;
    const a = dosyaIceriginiAc(JSON.stringify(ham), 'C:\\Projeler\\eski.json', 'eski.json');
    const p = a.proje;
    expect(a.eskiSurumdenAktarildi).toBe(true);
    expect(a.dosyaYolu).toBeNull(); // eski .json dosyasının üzerine yazılmaz
    expect(p.deltaT_modu).toBe('proje');
    expect(p.deltaT).toBe(60);
    expect(p.Nk).toBe(30);
    expect(p.paratonerler[0].aktif_mi).toBe(true);
    expect(p.tesis_adresi).toBe('');
    // ΔT onaylanana kadar hesap yapılmaz; onaydan sonra v5 ile aynı sonuç.
    expect(p.deltaT_onay_gerekli).toBe(true);
    expect(projeyiHesapla(p).yapilar.every((y) => y.nihai.kod === 'HESAPLANAMADI')).toBe(true);
    const onayli = eylem.deltaTAyarla(60)(p);
    expect(onayli.deltaT_onay_gerekli).toBeUndefined();
    expect(projeyiHesapla(onayli).yapilar.map((y) => y.nihai.kod)).toEqual(['YETERLI_KOMBINE', 'KORUYUCU_YOK']);
  });

  test('yeni biçim .ptproj yolu korunur, kurtarma kaydı kaydedilmemiş sayılır', () => {
    const icerik = kayitIcerigi(kanitSenaryosu());
    const a = dosyaIceriginiAc(icerik, 'C:\\Projeler\\saha.ptproj', 'saha.ptproj');
    expect(a.eskiSurumdenAktarildi).toBe(false);
    expect(a.dosyaYolu).toBe('C:\\Projeler\\saha.ptproj');
    expect(a.kaydedilmemis).toBe(false);
    const k = dosyaIceriginiAc(icerik, 'C:\\Masaustu\\saha (abc).ptproj', 'saha (abc).ptproj', true);
    expect(k.dosyaYolu).toBeNull();
    expect(k.kaydedilmemis).toBe(true);
  });

  test('proje olmayan dosya reddedilir', () => {
    expect(() => dosyaIceriginiAc('null', null, 'x.json')).toThrow();
    expect(() => dosyaIceriginiAc('{"isim":"x"}', null, 'x.json')).toThrow(/yapı, paratoner veya kot/);
  });
});

describe('Son dosyalar ve yedek adları', () => {
  test('aynı yol tekrarlanmaz (büyük/küçük harf duyarsız), liste sınırlıdır', () => {
    let l = [];
    for (let i = 0; i < 10; i++) l = sonDosyaEkle(l, { yol: `C:\\p${i}.ptproj`, ad: `p${i}`, zaman: i });
    expect(l).toHaveLength(8);
    l = sonDosyaEkle(l, { yol: 'c:\\P5.PTPROJ', ad: 'p5', zaman: 99 });
    expect(l[0].zaman).toBe(99);
    expect(l.filter((d) => d.yol.toLowerCase() === 'c:\\p5.ptproj')).toHaveLength(1);
  });

  test('yedek zaman etiketi dosya adına uygun', () => {
    expect(zamanEtiketi(new Date(2026, 9, 5, 7, 3, 9))).toBe('2026-10-05 07-03-09');
  });
});

describe('C profilleri', () => {
  const bos = { C: { C1: null, C3: null, C4: null, C5: null }, c2Secim: {} };

  test('kayıt yoksa örnek profiller gelir; örneklerde C1 boştur ve değerler standarttır', () => {
    const ornekler = cp.profilleriOku(undefined);
    expect(ornekler.length).toBeGreaterThan(3);
    for (const p of ornekler) {
      expect(p.C1).toBeNull();
      expect(p.ad).toBeTruthy();
      for (const k of ['C3', 'C4', 'C5']) expect(STANDART_C_DEGERLERI[k]).toContain(p[k]);
    }
    expect(new Set(ornekler.map((p) => p.id)).size).toBe(ornekler.length);
  });

  test('kullanıcı hepsini sildiyse boş liste korunur (örnekler geri gelmez)', () => {
    expect(cp.profilleriOku([])).toEqual([]);
  });

  test('standart dışı değer, bozuk malzeme ve adsız kayıt alınmaz', () => {
    const okunan = cp.profilleriOku([
      { id: 'a', ad: '  Kümes  ', C1: 0.5, C2_secim: { yapi: 'normal', cati: 'metal' }, C3: 1.5, C4: 3, C5: 7 },
      { id: 'b', ad: '', C3: 1 },
      { id: 'a', ad: 'Silo', C2_secim: { yapi: 'çelik', cati: 'metal' }, C3: '2' },
      'bozuk',
      null,
    ]);
    expect(okunan).toHaveLength(2);
    expect(okunan[0]).toEqual({ id: 'a', ad: 'Kümes', C1: 0.5, C2_secim: { yapi: 'normal', cati: 'metal' }, C3: null, C4: 3, C5: null });
    expect(okunan[1]).toMatchObject({ ad: 'Silo', C2_secim: null, C3: null });
    expect(okunan[1].id).not.toBe('a');
  });

  test('profil yalnızca tanımlı katsayıları yazar; boş olanlar formdaki değeri korur', () => {
    const profil = { id: 'p', ad: 'Depo', C1: null, C2_secim: { yapi: 'normal', cati: 'metal' }, C3: 2, C4: null, C5: 5 };
    const mevcut = { C: { C1: 2, C3: 1, C4: 3, C5: 1 }, c2Secim: { yapi: 'yanici', cati: 'yanici' } };
    expect(cp.profiliUygula(profil, mevcut)).toEqual({ C: { C1: 2, C3: 2, C4: 3, C5: 5 }, c2Secim: { yapi: 'normal', cati: 'metal' } });
    expect(mevcut.C.C3).toBe(1);
    expect(cp.profiliUygula(cp.bosProfil(), mevcut)).toEqual(mevcut);
    expect(cp.profiliUygula(profil, bos).C).toEqual({ C1: null, C3: 2, C4: null, C5: 5 });
    expect(cp.tanimliKatsayiSayisi(profil)).toBe(3);
  });

  test('eski projedeki yerleşik tip anahtarı profil adına çevrilir', () => {
    expect(cp.tiptenProfilAdi('kumes')).toBe('Kümes');
    expect(cp.tiptenProfilAdi('diger')).toBe('');
    expect(cp.tiptenProfilAdi(undefined)).toBe('');
    expect(cp.tiptenProfilAdi('Trafo binası')).toBe('Trafo binası');
  });
});
