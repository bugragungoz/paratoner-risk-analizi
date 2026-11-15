// Düzeltmeler (M1–M12): eski sürümdeki hata ile çekirdekteki düzeltme yan yana sınanır.
// Her test aynı girdiyle hem dondurulmuş v5 motorunu ("v5") hem yeni çekirdeği ("çekirdek")
// çalıştırır: v5'teki hatanın hâlâ göründüğünü ve çekirdekte düzeldiğini birlikte gösterir.
import { describe, test, expect } from 'vitest';
import * as ck from '../src/core';
import { C_KATSAYI_SECENEKLERI as v5C, yeniProje as v5YeniProje } from './referans-motor/model/types';
import { rpOku as v5RpOku } from './referans-motor/calc/eseTablosu';
import { projeHesapTablosuUret as v5Tablo } from './referans-motor/calc/hesapTablosu';
import { paratonerYapiMesafeleri as v5Mesafeler } from './referans-motor/calc/geo';
import { genelSonucOzeti as v5Ozet, yapiAciklamaParagrafi as v5Paragraf } from './referans-motor/report/raporIcerik';
import { haritaKapsamaV5 } from './referans-motor/harita/kapsamaV5';
import { STANDART_C } from './veri/kaynaklar';
import { kanitSenaryosu, yerelProje } from './veri/projeler';

const ckYapi = (proje, isim) => ck.projeyiHesapla(proje).yapilar.find((y) => y.yapiIsim === isim);
const v5Yapi = (proje, isim) => v5Tablo(proje).find((y) => y.yapiIsim === isim);
const v5Harita = (proje, isim) => {
  const id = proje.yapilar.find((y) => y.isim === isim).id;
  return haritaKapsamaV5(proje).find((k) => k.yapiId === id).analiz;
};
const satir = (yapiSonucu, prIsim) => yapiSonucu.satirlar.find((s) => s.paratonerIsim === prIsim);

describe('M1 — C katsayıları standart tabloya göre', () => {
  test('C2/C4/C5 seçenekleri: v5 standart dışı değer içeriyor, çekirdek içermiyor', () => {
    const v5 = (c) => v5C[c].map((s) => s.deger);
    expect(v5('C2')).toContain(1.5);
    expect(v5('C2')).not.toContain(2.5);
    expect(v5('C4')).toContain(2);
    expect(v5('C5')).toContain(2);
    expect(ck.STANDART_C_DEGERLERI.C2).toEqual(STANDART_C.C2);
    expect(ck.C4_SECENEKLERI.map((s) => s.deger)).toEqual(STANDART_C.C4);
    expect(ck.C5_SECENEKLERI.map((s) => s.deger)).toEqual(STANDART_C.C5);
  });

  test('C1 = 0,5: v5 "benzer yükseklikte" diyor, çekirdek "daha alçak yapılarla çevrili"', () => {
    expect(v5C.C1.find((s) => s.deger === 0.5).etiket).toMatch(/benzer yükseklikte/i);
    expect(ck.C1_SECENEKLERI.find((s) => s.deger === 0.5).etiket).toMatch(/alçak/i);
  });

  test('C2 yapı × çatı matrisinden seçilir', () => {
    expect(ck.c2Degeri({ yapi: 'normal', cati: 'yanici' })).toBe(2.5);
    expect(ck.c2Degeri({ yapi: 'metal', cati: 'metal' })).toBe(0.5);
    const yapi = ck.yeniYapi({ isim: 'Y', poligon: [], kot_seviyesi_id: 'k', H_m: 5, C2_secim: { yapi: 'yanici', cati: 'normal' } });
    expect(yapi.C2).toBe(2.5);
  });

  test('standart dışı C değeri: v5 hesaplıyor, çekirdek "yeniden seçin" diyerek durduruyor', () => {
    const proje = yerelProje({
      yapilar: [{ id: 'y', isim: 'Ahşap Depo', dikdortgen: [0, 0, 20, 10], H: 5, C: { C1: 1, C2: 1.5, C3: 1, C4: 1, C5: 1 } }],
      paratonerler: [{ id: 'p', x: 10, y: 5, mast: 10 }],
    });
    expect(v5Yapi(proje, 'Ahşap Depo').nihaiDurum).toBe('KORUMA YETERLİ');
    const y = ckYapi(proje, 'Ahşap Depo');
    expect(y.nihai.kod).toBe('HESAPLANAMADI');
    expect(y.hatalar.join(' ')).toMatch(/C2 = 1\.5 standart tabloda yok/);
  });

  test('yapı tipi şablonlarının bütün değerleri standart', () => {
    for (const tip of ck.YAPI_TIPLERI) {
      for (const c of ['C1', 'C3', 'C4', 'C5']) expect(ck.standartCMi(c, tip[c])).toBe(true);
      expect(ck.standartCMi('C2', ck.c2Degeri(tip.C2_secim))).toBe(true);
    }
  });
});

describe('M2 — ΔT seçilmeden hesap yok, sessiz 60 µs yok', () => {
  test('yeni proje: v5 ΔT = 60 ile başlıyor, çekirdek boş bırakıyor', () => {
    expect(v5YeniProje().deltaT).toBe(60);
    expect(ck.yeniProje().deltaT).toBeNull();
    expect(ck.yeniProje().Nk).toBeNull();
  });

  test('tabloda olmayan ΔT: v5 60 µs değerini veriyor, çekirdek değer üretmiyor', () => {
    expect(v5RpOku(10, 'IV', 25).rp).toBe(109);
    expect(ck.rpOku(10, 'IV', 25)).toMatchObject({ tamam: false, neden: 'DELTA_T_TANIMSIZ' });
  });

  test('ΔT seçilmemişse yapılar "hesaplanamadı" olur ve doğrulama hatası verir', () => {
    const proje = kanitSenaryosu({ deltaT: null });
    const sonuc = ck.projeyiHesapla(proje);
    expect(sonuc.dogrulama.hesaplanabilir).toBe(false);
    expect(sonuc.dogrulama.hatalar.map((h) => h.kod)).toContain('DELTA_T_YOK');
    for (const y of sonuc.yapilar) {
      expect(y.nihai.kod).toBe('HESAPLANAMADI');
      expect(y.hatalar.join(' ')).toMatch(/ΔT/);
    }
  });

  test('paratoner modunda paratonerin ΔT\'si proje varsayılanını geçersiz kılar', () => {
    const proje = kanitSenaryosu();
    proje.deltaT_modu = 'paratoner';
    proje.paratonerler.find((p) => p.isim === 'P1').deltaT = 30;
    const depo = ckYapi(proje, 'Depo-B');
    expect(satir(depo, 'P1')).toMatchObject({ deltaT: 30, rp: 63 });
    expect(satir(depo, 'P2')).toMatchObject({ deltaT: 60, rp: 97 });
  });

  test('proje modunda (varsayılan) paratonerdeki ΔT dikkate alınmaz', () => {
    const proje = kanitSenaryosu();
    proje.paratonerler.find((p) => p.isim === 'P1').deltaT = 30;
    expect(satir(ckYapi(proje, 'Depo-B'), 'P1')).toMatchObject({ deltaT: 60, rp: 97 });
  });

  test('paratoner modunda proje ΔT yok ama her paratonerin kendi ΔT\'si var → hesap yapılır', () => {
    const proje = kanitSenaryosu({ deltaT: null });
    proje.deltaT_modu = 'paratoner';
    proje.paratonerler.forEach((p) => (p.deltaT = 60));
    expect(ck.projeyiHesapla(proje).dogrulama.hesaplanabilir).toBe(true);
    expect(ckYapi(proje, 'Depo-B').nihai.etiket).toBe('Koruma yeterli (birleşik)');
  });

  test('paratoner modunda yalnızca ΔT\'si belirlenemeyen paratonerler hata verir', () => {
    const proje = kanitSenaryosu({ deltaT: null });
    proje.deltaT_modu = 'paratoner';
    proje.paratonerler.find((p) => p.isim === 'P1').deltaT = 60;
    const hata = ck.projeyiDogrula(proje).hatalar.find((h) => h.kod === 'DELTA_T_YOK');
    expect(hata.mesaj).toMatch(/P2, P3/);
    expect(hata.mesaj).not.toMatch(/P1/);
  });

  test('kanıt senaryosu: ΔT 60 → kombine yeterli, ΔT 30 → kısmi (%77)', () => {
    expect(ckYapi(kanitSenaryosu({ deltaT: 60 }), 'Depo-B').nihai.kod).toBe('YETERLI_KOMBINE');
    expect(ckYapi(kanitSenaryosu({ deltaT: 30 }), 'Depo-B').nihai.etiket).toBe('Kısmi koruma (%77): açıkta alan var');
  });
});

describe('M3 — h < 2 m her yerde tanımsız', () => {
  test('rpOku(1,5 m): v5 43 m veriyor, çekirdek tanımsız', () => {
    expect(v5RpOku(1.5, 'IV', 60).rp).toBe(43);
    expect(ck.rpOku(1.5, 'IV', 60)).toMatchObject({ tamam: false, neden: 'H_2_ALTI' });
  });

  test('Silo-A: v5 haritası "korunuyor", v5 tablosu "koruyucu yok"; çekirdekte ikisi de "koruyucu yok"', () => {
    const proje = kanitSenaryosu();
    expect(v5Harita(proje, 'Silo-A').tamamenKorunuyorMu).toBe(true);
    expect(v5Yapi(proje, 'Silo-A').nihaiDurum).toBe('KORUYUCU BULUNAMADI');
    const silo = ckYapi(proje, 'Silo-A');
    expect(silo.nihai.kod).toBe('KORUYUCU_YOK');
    expect(silo.kapsama.tamamenKorunuyorMu).toBe(false);
    expect(silo.kapsama.hicKorumaYokMu).toBe(true);
  });
});

describe('M4 — gizle yalnızca görsel, devre dışı hesaptan çıkarır', () => {
  test('P2 gizli: v5 haritası ile tablosu ayrışıyor; çekirdekte sonuç gizlemeden etkilenmiyor', () => {
    const gizli = kanitSenaryosu({ gizliParatonerler: ['P2'] });
    expect(v5Harita(gizli, 'Depo-B').tamamenKorunuyorMu).toBe(false);
    expect(v5Yapi(gizli, 'Depo-B').nihaiDurum).toBe('KORUMA YETERLİ (Kombine)');

    const depo = ckYapi(gizli, 'Depo-B');
    expect(depo.nihai.kod).toBe('YETERLI_KOMBINE');
    expect(depo.kapsama.tamamenKorunuyorMu).toBe(true);
    expect(depo).toEqual(ckYapi(kanitSenaryosu(), 'Depo-B'));
  });

  test('P2 devre dışı: harita (kapsama) ve tablo (satırlar, nihai) birlikte değişiyor', () => {
    const proje = kanitSenaryosu();
    proje.paratonerler.find((p) => p.isim === 'P2').aktif_mi = false;
    const depo = ckYapi(proje, 'Depo-B');
    expect(depo.satirlar.map((s) => s.paratonerIsim)).toEqual(['P1', 'P3']);
    expect(depo.nihai.kod).toBe('KISMI');
    expect(depo.kapsama.tamamenKorunuyorMu).toBe(false);
  });
});

describe('M5 — rapor kombine nihai duruma göre (v3.2 mantığı)', () => {
  test('kanıt senaryosu özeti: v5 "0 yeterli", çekirdek "1 yeterli (1 kombine)"', () => {
    const proje = kanitSenaryosu();
    expect(v5Ozet(proje).yeterli).toBe(0);
    const ozet = ck.raporOzeti(ck.projeyiHesapla(proje));
    expect(ozet).toMatchObject({ toplam: 2, yeterli: 1, yeterliKombine: 1, koruyucuYok: 1, kismi: 0 });
    expect(ck.eksikYapilar(ck.projeyiHesapla(proje)).map((y) => y.yapiIsim)).toEqual(['Silo-A']);
  });

  test('kombine korunan yapının paragrafı: v5 revizyon istiyor, çekirdek birleşik korumayı açıklıyor', () => {
    const proje = kanitSenaryosu();
    expect(v5Paragraf(v5Yapi(proje, 'Depo-B'))).toMatch(/revizyon/);
    const metin = ck.yapiAciklamaParagrafi(ckYapi(proje, 'Depo-B'));
    expect(metin).toMatch(/birleşik koruma alanı/);
    expect(metin).not.toMatch(/revizyon/);
  });

  test('"en dar marj": v5 en yakın noktadan (+92 m), çekirdek kombine yapıyı katmıyor', () => {
    const proje = kanitSenaryosu();
    expect(v5Ozet(proje).marjMin).toBeCloseTo(92.0, 0);
    expect(ck.raporOzeti(ck.projeyiHesapla(proje)).marj).toEqual({ enDar: null, enGenis: null, yapiSayisi: 0 });
  });

  test('tek paratonerle korunan yapıda marj en uzak noktadan hesaplanır', () => {
    const proje = yerelProje({
      yapilar: [{ id: 'y', isim: 'Ofis', dikdortgen: [0, 0, 20, 10], H: 5 }],
      paratonerler: [{ id: 'p', x: 10, y: 5, mast: 10 }],
    });
    const sonuc = ck.projeyiHesapla(proje);
    const p = satir(sonuc.yapilar[0], 'p');
    expect(sonuc.yapilar[0].nihai.kod).toBe('ISTEGE_BAGLI_ICINDE'); // küçük yapı: Nd ≤ Nc
    expect(ck.raporOzeti(sonuc).marj).toEqual({ enDar: p.marjEnUzak, enGenis: p.marjEnUzak, yapiSayisi: 1 });
    expect(p.marjEnUzak).toBeLessThan(p.marjEnYakin);
  });

  test('birincil paratoner: v5 en yakın noktaya, çekirdek en uzak noktaya göre seçiyor', () => {
    const proje = yerelProje({
      yapilar: [{ id: 'y', isim: 'Hangar', dikdortgen: [0, 0, 100, 20], H: 6 }],
      paratonerler: [
        { id: 'pa', isim: 'Kenar', x: -1, y: 10, mast: 9 },
        { id: 'pb', isim: 'Orta', x: 50, y: 30, mast: 9 },
      ],
    });
    expect(v5Tablo(proje)[0].birincilParatonerId).toBe('pa');
    const y = ck.projeyiHesapla(proje).yapilar[0];
    expect(y.birincilParatonerId).toBe('pb');
    expect(satir(y, 'Orta').marjEnUzak).toBeGreaterThan(satir(y, 'Kenar').marjEnUzak);
  });

  test('genel sonuç cümleleri tutarlı', () => {
    const cumleler = ck.genelSonucCumleleri(ck.projeyiHesapla(kanitSenaryosu())).join(' ');
    expect(cumleler).toMatch(/2 adet yapı/);
    expect(cumleler).toMatch(/1 tanesinde yıldırımdan korunma sistemi yeterli/);
    expect(cumleler).toMatch(/birleşik koruma alanıyla/);
    expect(cumleler).not.toMatch(/marj/);
  });
});

describe('M8–M12 ve ek bulgular', () => {
  test('M8: "Seviye 1 + ek önlem" yapıda uyarı ve paragraf notu', () => {
    const proje = yerelProje({
      Nk: 12,
      yapilar: [{ id: 'y', isim: 'Fabrika', dikdortgen: [0, 0, 95, 25], H: 16, C: { C1: 0.25, C2: 1, C3: 2, C4: 3, C5: 10 } }],
      paratonerler: [{ id: 'p', x: 47.5, y: 12.5, mast: 6, yapi: 'y' }],
    });
    const y = ck.projeyiHesapla(proje).yapilar[0];
    expect(y.risk.seviye).toBe('Seviye 1 + ek önlem');
    expect(y.uyarilar).toContain(ck.UYARI_EK_ONLEM);
    expect(ck.yapiAciklamaParagrafi(y)).toMatch(/ek önlem/);
  });

  test('M9: 60 m üzeri yapı uyarısı', () => {
    const proje = yerelProje({
      yapilar: [{ id: 'y', isim: 'Baca', dikdortgen: [0, 0, 6, 6], H: 65 }],
      paratonerler: [{ id: 'p', x: 3, y: 3, mast: 5, yapi: 'y' }],
    });
    const sonuc = ck.projeyiHesapla(proje);
    expect(sonuc.dogrulama.uyarilar.map((u) => u.kod)).toContain('YAPI_60M');
    expect(sonuc.yapilar[0].uyarilar).toContain(ck.UYARI_YUKSEK_YAPI);
  });

  test('M10: çatıdaki paratonerin yapıya en yakın mesafesi 0 (v5: en yakın kenara uzaklık)', () => {
    const proje = yerelProje({
      yapilar: [{ id: 'y', isim: 'Depo', dikdortgen: [0, 0, 40, 20], H: 5 }],
      paratonerler: [{ id: 'p', x: 20, y: 10, mast: 5, yapi: 'y' }],
    });
    const pr = proje.paratonerler[0];
    expect(v5Mesafeler(pr, proje.yapilar[0].poligon).enYakin).toBeCloseTo(10, 0);
    expect(satir(ck.projeyiHesapla(proje).yapilar[0], 'p').enYakin).toBe(0);
  });

  test('M11: ondalık virgül, negatif değerler ve kesişen poligon', () => {
    expect(ck.ondalikSayi('3,5')).toBe(3.5);
    expect(ck.ondalikSayi(' 12.25 ')).toBe(12.25);
    expect(ck.ondalikSayi('abc')).toBeNull();
    expect(ck.ondalikSayi('')).toBeNull();

    const proje = yerelProje({
      yapilar: [
        { id: 'neg', isim: 'Negatif', dikdortgen: [0, 0, 10, 10], H: -3 },
        { id: 'bow', isim: 'Papyon', koseler: [[100, 0], [120, 20], [120, 0], [100, 20]], H: 5 },
      ],
      paratonerler: [{ id: 'p', x: 5, y: 5, mast: -2 }],
    });
    const kodlar = ck.projeyiDogrula(proje).hatalar.map((h) => h.kod);
    expect(kodlar).toEqual(expect.arrayContaining(['YAPI_H', 'YAPI_POLIGON_KESISIYOR', 'PARATONER_MAST']));
    expect(ck.projeyiHesapla(proje).yapilar.map((y) => y.nihai.kod)).toEqual(['HESAPLANAMADI', 'HESAPLANAMADI']);
  });

  test('M12: silinecek kot/yapıya bağlı öğeler ve yetim paratoner', () => {
    const proje = yerelProje({
      kotlar: [['kot_0', 0], ['kot_1', 3]],
      yapilar: [{ id: 'y', dikdortgen: [0, 0, 10, 10], H: 5, kot: 'kot_1' }],
      paratonerler: [
        { id: 'p1', x: 5, y: 5, mast: 4, yapi: 'y' },
        { id: 'p2', x: 30, y: 5, mast: 12, kot: 'kot_0' },
      ],
    });
    expect(ck.bagimliOgeler(proje, { kotId: 'kot_1' }).yapilar.map((y) => y.id)).toEqual(['y']);
    expect(ck.bagimliOgeler(proje, { kotId: 'kot_0' }).paratonerler.map((p) => p.id)).toEqual(['p2']);
    expect(ck.bagimliOgeler(proje, { yapiId: 'y' }).paratonerler.map((p) => p.id)).toEqual(['p1']);

    proje.yapilar = [];
    expect(ck.projeyiDogrula(proje).hatalar.map((h) => h.kod)).toContain('PARATONER_YAPI_YOK');
  });

  test('ek bulgu: Nk girilmemişken v5 "isteğe bağlı" diyor, çekirdek "hesaplanamadı"', () => {
    const proje = kanitSenaryosu();
    proje.Nk = null;
    expect(v5Yapi(proje, 'Depo-B').nihaiDurum).toBe('KORUMA İSTEĞE BAĞLI (Menzil Dışı)');
    const depo = ckYapi(proje, 'Depo-B');
    expect(depo.nihai.kod).toBe('HESAPLANAMADI');
    expect(depo.hatalar[0]).toMatch(/Nk/);
  });
});

describe('CSV', () => {
  test('noktalı virgül ayraç, ondalık virgül, nihai durum sütunu', () => {
    const csv = ck.hesapTablosuCsv(ck.projeyiHesapla(kanitSenaryosu()));
    const satirlar = csv.split('\r\n');
    expect(satirlar[0].split(';')).toEqual([...ck.CSV_BASLIKLARI]);
    const p1 = satirlar.find((s) => s.startsWith('Depo-B;') && s.includes(';P1;')).split(';');
    expect(p1[10]).toBe('97,0');
    expect(p1.at(-1)).toBe('Koruma yeterli (birleşik)');
  });
});

describe('Giriş hatası uyarıları (hesabı engellemez)', () => {
  const uyariKodlari = (proje) => ck.projeyiDogrula(proje).uyarilar.map((u) => u.kod);

  test('çatıda seçilen paratoner yapının dışında → uyarı', () => {
    const proje = yerelProje({
      yapilar: [{ id: 'y', isim: 'Depo', dikdortgen: [0, 0, 20, 10], H: 6 }],
      paratonerler: [{ id: 'p', isim: 'P1', x: 50, y: 5, mast: 5, yapi: 'y' }],
    });
    expect(uyariKodlari(proje)).toContain('PARATONER_YAPI_DISINDA');
    proje.paratonerler[0].lng = proje.yapilar[0].poligon[0].lng + 0.00005;
    proje.paratonerler[0].lat = proje.yapilar[0].poligon[0].lat + 0.00003;
    expect(uyariKodlari(proje)).not.toContain('PARATONER_YAPI_DISINDA');
  });

  test('zeminden ölçülen paratoner bir yapının içinde → uyarı', () => {
    const proje = yerelProje({
      yapilar: [{ id: 'y', isim: 'Depo', dikdortgen: [0, 0, 20, 10], H: 6 }],
      paratonerler: [{ id: 'p', isim: 'P1', x: 10, y: 5, mast: 12 }],
    });
    expect(uyariKodlari(proje)).toContain('PARATONER_ZEMINDE_YAPI_ICINDE');
  });

  test('aynı adlı yapı ya da paratoner → uyarı (büyük/küçük harf ve boşluk farkı sayılmaz)', () => {
    const proje = yerelProje({
      yapilar: [
        { id: 'a', isim: 'Depo', dikdortgen: [0, 0, 10, 10], H: 6 },
        { id: 'b', isim: ' depo ', dikdortgen: [40, 0, 50, 10], H: 6 },
      ],
      paratonerler: [
        { id: 'p1', isim: 'P1', x: 25, y: 5, mast: 8 },
        { id: 'p2', isim: 'P2', x: 30, y: 5, mast: 8 },
      ],
    });
    const u = ck.projeyiDogrula(proje).uyarilar.filter((x) => x.kod === 'AD_TEKRAR');
    expect(u).toHaveLength(1);
    expect(u[0].mesaj).toMatch(/yapılar/);
  });

  test('üst üste binen yapılar → uyarı; yalnızca kenarı değenler → uyarı yok', () => {
    const cakisan = yerelProje({
      yapilar: [
        { id: 'a', isim: 'A', dikdortgen: [0, 0, 20, 10], H: 6 },
        { id: 'b', isim: 'B', dikdortgen: [5, 0, 25, 10], H: 6 },
      ],
    });
    expect(uyariKodlari(cakisan)).toContain('YAPI_CAKISMA');
    const bitisik = yerelProje({
      yapilar: [
        { id: 'a', isim: 'A', dikdortgen: [0, 0, 20, 10], H: 6 },
        { id: 'b', isim: 'B', dikdortgen: [20, 0, 40, 10], H: 6 },
      ],
    });
    expect(uyariKodlari(bitisik)).not.toContain('YAPI_CAKISMA');
  });

  test('kanıt senaryosunda bu uyarılardan hiçbiri yok', () => {
    const kodlar = uyariKodlari(kanitSenaryosu());
    for (const k of ['PARATONER_YAPI_DISINDA', 'PARATONER_ZEMINDE_YAPI_ICINDE', 'AD_TEKRAR', 'YAPI_CAKISMA']) expect(kodlar).not.toContain(k);
  });

  test('kot gösterimi: +, − ve ±', () => {
    expect(ck.kotMetni(2)).toBe('+2,0');
    expect(ck.kotMetni(-3)).toBe('−3,0');
    expect(ck.kotMetni(0)).toBe('±0,0');
    expect(ck.kotMetni(-0.001, 2)).toBe('±0,00');
    expect(ck.kotMetni(11.5, 2)).toBe('+11,50');
  });
});

describe('hesaba girmeyen alanlar', () => {
  test('rapor bilgileri ve proje adı değişince hesap girdisi aynı sayılır, sonuç da aynıdır', () => {
    const p = kanitSenaryosu();
    const q = { ...p, isim: 'Başka ad', rapor_no: 'R-1', tesis_adresi: 'Adres', revizyonlar: [{ no: '1', tarih: '', aciklama: '' }], harita_zoom: 3 };
    expect(ck.hesapGirdisiAyni(p, q)).toBe(true);
    expect(ck.projeyiHesapla(q)).toEqual(ck.projeyiHesapla(p));
  });

  test('hesaba giren her alan girdiyi değiştirir', () => {
    const p = kanitSenaryosu();
    expect(ck.hesapGirdisiAyni(p, { ...p, Nk: (p.Nk ?? 0) + 1 })).toBe(false);
    expect(ck.hesapGirdisiAyni(p, { ...p, deltaT: 45 })).toBe(false);
    expect(ck.hesapGirdisiAyni(p, { ...p, yapilar: [...p.yapilar] })).toBe(false);
    expect(ck.hesapGirdisiAyni(p, { ...p, paratonerler: [...p.paratonerler] })).toBe(false);
    expect(ck.hesapGirdisiAyni(p, { ...p, kot_seviyeleri: [...p.kot_seviyeleri] })).toBe(false);
    expect(ck.hesapGirdisiAyni(p, { ...p, bilinmeyen_alan: 1 })).toBe(false);
  });

  test('önbellekli hesap: rapor alanı değişince aynı sonuç nesnesi, hesap alanı değişince yeni sonuç', () => {
    const hesapla = ck.onbellekliHesap();
    const p = kanitSenaryosu();
    const s1 = hesapla(p);
    expect(hesapla({ ...p, rapor_no: 'R-2' })).toBe(s1);
    const s2 = hesapla({ ...p, rapor_no: 'R-2', deltaT: 30 });
    expect(s2).not.toBe(s1);
    expect(s2).toEqual(ck.projeyiHesapla({ ...p, deltaT: 30 }));
  });
});
