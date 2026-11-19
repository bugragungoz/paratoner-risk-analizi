// Eski (dondurulmuş v5) motor ile yeni çekirdeğin karşılaştırılması.
//
// Her yapının risk değerleri, her paratoner satırı, nihai durum ve harita kapsaması iki motorda
// karşılaştırılır. Fark YALNIZCA bilinçli düzeltmelerde kabul edilir ve her biri kendi kuralıyla
// doğrulanır:
//   M3  — v5 haritası 0 < h < 2 m paratoneri kapsamaya katıyordu; çekirdek katmaz.
//   M4  — v5 haritası gizli paratoneri kapsamadan çıkarıyordu; çekirdekte gizlemek hesabı etkilemez.
//   M5  — birincil paratoner en uzak noktadaki marja göre seçilir (yeni birincilin marjı eskisinden kötü olamaz).
//   M10 — paratoner yapı poligonunun içindeyse en yakın mesafe 0'dır.
//   M13 — kot zinciri mikrometreye yuvarlanır: v5'te (0,3 + 2) − 0,3 = 1,9999999999999998 çıkıyordu.
//         h yalnızca kayan nokta gürültüsü kadar, Rp ve marj en fazla enterpolasyon yuvarlaması (0,1 m) kadar değişir.
//   M14 — çekirdek mesafe, alan ve kapsamayı elipsoit üzerinde hesaplar; v5 Dünya'yı küre kabul ediyordu.
//         Karşılaştırma bu yüzden çekirdeğe eski küresel modeli (tests/veri/kureModeli.js) vererek yapılır;
//         elipsoit modeli bağımsız-doğrulama ve koordinat testlerinde ayrıca doğrulanır.
//   M15 — bir paratoner yapının bütün köşelerini kapsıyorsa (satır "yeterli") yapı tamamen korunur;
//         v5 dairenin çokgen yaklaşımı yüzünden böyle bir yapıya "kısmi koruma" diyebiliyordu.
// Bunların dışındaki her fark "beklenmeyen" sayılır ve test başarısız olur.
import { describe, test, expect } from 'vitest';
import { booleanPointInPolygon, point } from '@turf/turf';
import { projeyiHesapla, raporOzeti, poligonaDonustur, gercekHHesapla } from '../src/core';
import { projeHesapTablosuUret as referansTablo } from './referans-motor/calc/hesapTablosu';
import { haritaKapsamaV5 } from './referans-motor/harita/kapsamaV5';
import { kanitSenaryosu, rastgeleProje } from './veri/projeler';
import { KURE_MODELI } from './veri/kureModeli';

const RASTGELE_PROJE_SAYISI = 200;
const tohumlar = Array.from({ length: RASTGELE_PROJE_SAYISI }, (_, i) => 1000 + i);

const RISK_ALANLARI = ['Ae', 'Nd', 'Nc', 'E', 'seviye', 'sutun'];
const SATIR_ALANLARI = ['gercekH', 'rp', 'enterpoleEdildi', 'enUzak', 'marjEnUzak'];

// v5 etiketleri büyük harfliydi; çekirdek cümle düzeni kullanır. Karşılaştırma için çekirdeğin durum
// kodu v5'in yazacağı etikete çevrilir (kısmi korumada oran aynı kuralla yuvarlanır).
const V5_NIHAI = {
  YETERLI: 'KORUMA YETERLİ',
  YETERLI_KOMBINE: 'KORUMA YETERLİ (Kombine)',
  YETERSIZ: 'KORUMA YETERSİZ',
  KORUYUCU_YOK: 'KORUYUCU BULUNAMADI',
  GEOMETRI_HATASI: 'GEOMETRİ HATASI',
  ISTEGE_BAGLI_ICINDE: 'KORUMA İSTEĞE BAĞLI (Menzil İçinde)',
  ISTEGE_BAGLI_DISINDA: 'KORUMA İSTEĞE BAĞLI (Menzil Dışı)',
  HESAPLANAMADI: 'HESAPLANAMADI',
};
const V5_SATIR = { YETERLI: 'KORUMA YETERLİ', KISMI: 'KISMİ KORUMA', YETERSIZ: 'KORUMA YETERSİZ' };
const v5Nihai = (y) =>
  y.nihai.kod === 'KISMI' ? `DİKKAT: KISMİ KORUMA (%${Math.floor(y.kapsama.kapsamaOrani * 1000) / 10}) - AÇIKTA ALAN VAR` : V5_NIHAI[y.nihai.kod];

function karsilastir(proje) {
  const eski = referansTablo(proje);
  const yeni = projeyiHesapla(proje, KURE_MODELI);
  const farklar = { M3: 0, M4: 0, M5: 0, M10: 0, M13: 0, M15: 0 };
  const beklenmeyen = [];
  const not = (yapi, mesaj) => beklenmeyen.push(`${proje.id} / ${yapi}: ${mesaj}`);

  eski.forEach((e, i) => {
    const y = yeni.yapilar[i];
    const yapi = proje.yapilar[i];
    if (!y || y.yapiId !== e.yapiId) return not(e.yapiIsim, 'yapı sırası farklı');

    // v5 seviye adları büyük harfliydi ("Seviye 1 + Ek Önlem", "İsteğe Bağlı"); çekirdek cümle düzeni kullanır.
    const v5Seviye = (s) => (s === 'Seviye 1 + ek önlem' ? 'Seviye 1 + Ek Önlem' : s === 'İsteğe bağlı' ? 'İsteğe Bağlı' : s);
    for (const k of RISK_ALANLARI) {
      const yeniDeger = k === 'seviye' ? v5Seviye(y.risk?.[k]) : y.risk?.[k];
      if (e[k] !== yeniDeger) not(e.yapiIsim, `risk.${k}: ${e[k]} ≠ ${yeniDeger}`);
    }
    const tekDaireKapsiyor = y.satirlar.some((s) => s.gecerli && s.durumKod === 'YETERLI');
    if (e.nihaiDurum !== v5Nihai(y)) {
      if (tekDaireKapsiyor && e.nihaiDurum.includes('KISMİ') && y.nihai.kod === 'YETERLI') farklar.M15++;
      else not(e.yapiIsim, `nihai: "${e.nihaiDurum}" ≠ "${v5Nihai(y)}"`);
    }
    if (e.satirlar.length !== y.satirlar.length) return not(e.yapiIsim, 'satır sayısı farklı');

    e.satirlar.forEach((es, j) => {
      const ys = y.satirlar[j];
      const yer = `${e.yapiIsim}/${es.paratonerIsim}`;
      if (es.paratonerId !== ys.paratonerId) return not(yer, 'satır sırası farklı');
      if (es.gecerliMi !== ys.gecerli) return not(yer, `geçerlilik ${es.gecerliMi} ≠ ${ys.gecerli}`);
      if (!es.gecerliMi) {
        if (es.neden !== ys.neden) not(yer, `neden "${es.neden}" ≠ "${ys.neden}"`);
        return;
      }
      // M13: h yalnızca kayan nokta gürültüsü kadar farklıysa Rp/marj en fazla 0,1 m oynayabilir.
      const hGurultu = es.gercekH !== ys.gercekH && Math.abs(es.gercekH - ys.gercekH) < 1e-9;
      if (hGurultu) farklar.M13++;
      for (const k of SATIR_ALANLARI) {
        if (es[k] === ys[k]) continue;
        if (hGurultu && k === 'gercekH') continue;
        // v5, h = 5,000000000000001 için "enterpolasyon" diyordu; yuvarlanmış h tam tablo satırıdır.
        if (hGurultu && k === 'enterpoleEdildi' && es[k] === true && ys[k] === false) continue;
        if (hGurultu && (k === 'rp' || k === 'marjEnUzak') && Math.abs(es[k] - ys[k]) < 0.1 + 1e-9) continue;
        not(yer, `${k}: ${es[k]} ≠ ${ys[k]}`);
      }
      if (es.enYakin !== ys.enYakin || es.durum !== V5_SATIR[ys.durumKod]) {
        const pr = proje.paratonerler.find((p) => p.id === es.paratonerId);
        const icinde = booleanPointInPolygon(point([pr.lng, pr.lat]), poligonaDonustur(yapi.poligon));
        if (icinde && ys.enYakin === 0) farklar.M10++;
        else not(yer, `enYakin/durum farkı açıklanamadı (${es.enYakin}/${es.durum} ≠ ${ys.enYakin}/${ys.durum})`);
      }
    });

    if (e.birincilParatonerId !== y.birincilParatonerId) {
      const marj = (id) => y.satirlar.find((s) => s.paratonerId === id)?.marjEnUzak;
      if (marj(y.birincilParatonerId) >= marj(e.birincilParatonerId)) farklar.M5++;
      else not(e.yapiIsim, 'birincil değişti ama yeni seçimin en uzak noktadaki marjı daha kötü');
    }
  });

  for (const { yapiId, analiz } of haritaKapsamaV5(proje)) {
    const y = yeni.yapilar.find((s) => s.yapiId === yapiId);
    if (analiz.tamamenKorunuyorMu === y.kapsama?.tamamenKorunuyorMu) continue;
    const yapi = proje.yapilar.find((s) => s.id === yapiId);
    const kisaVar = proje.paratonerler.some((p) => {
      const h = gercekHHesapla(p, yapi, proje);
      return h !== null && h > 0 && h < 2;
    });
    const gizliVar = proje.paratonerler.some((p) => p.gorunur_mu === false);
    const tekDaire = y.satirlar.some((s) => s.gecerli && s.durumKod === 'YETERLI');
    if (kisaVar) farklar.M3++;
    else if (gizliVar) farklar.M4++;
    else if (tekDaire && y.kapsama.tamamenKorunuyorMu) farklar.M15++;
    else not(yapi.isim, 'v5 haritası ile çekirdek kapsaması açıklanamayan biçimde farklı');
  }

  // Rapor sayımı v5 TABLOSUNUN (doğru kaynak) nihai durumlarıyla tutarlı olmalı (M5).
  const eskiYeterli = eski.filter((e) => e.nihaiDurum.startsWith('KORUMA YETERLİ')).length;
  if (raporOzeti(yeni).yeterli !== eskiYeterli) not('özet', `yeterli sayısı ${raporOzeti(yeni).yeterli} ≠ ${eskiYeterli}`);

  return { farklar, beklenmeyen };
}

describe('Rastgele proje üreticisi', () => {
  test('aynı tohum aynı projeyi üretir', () => {
    expect(rastgeleProje(42)).toEqual(rastgeleProje(42));
    expect(rastgeleProje(42)).not.toEqual(rastgeleProje(43));
  });
});

describe('Çekirdek ↔ v5 referans motor', () => {
  test.each([
    ['kanıt senaryosu', kanitSenaryosu()],
    ['kanıt senaryosu, ΔT = 30', kanitSenaryosu({ deltaT: 30 })],
    ['kanıt senaryosu, P2 gizli', kanitSenaryosu({ gizliParatonerler: ['P2'] })],
  ])('%s: yalnızca bilinçli farklar', (_, proje) => {
    expect(karsilastir(proje).beklenmeyen).toEqual([]);
  });

  test(`${RASTGELE_PROJE_SAYISI} rastgele proje: yalnızca bilinçli farklar`, () => {
    const toplam = { M3: 0, M4: 0, M5: 0, M10: 0, M13: 0 };
    const beklenmeyen = [];
    const durumlar = new Set();
    let gecerliSatir = 0;
    for (const t of tohumlar) {
      const proje = rastgeleProje(t);
      const sonuc = karsilastir(proje);
      beklenmeyen.push(...sonuc.beklenmeyen);
      for (const k of Object.keys(toplam)) toplam[k] += sonuc.farklar[k];
      for (const y of projeyiHesapla(proje).yapilar) {
        durumlar.add(y.nihai.kod);
        gecerliSatir += y.satirlar.filter((s) => s.gecerli).length;
      }
    }

    expect(beklenmeyen).toEqual([]);
    // Karşılaştırmanın anlamlı olması için senaryolar çeşitli olmalı ve düzeltmeler gerçekten sınanmalı.
    expect(gecerliSatir).toBeGreaterThan(100);
    expect([...durumlar]).toEqual(expect.arrayContaining(['YETERLI', 'KISMI', 'YETERSIZ', 'KORUYUCU_YOK']));
    expect(toplam.M3).toBeGreaterThan(0);
    expect(toplam.M4).toBeGreaterThan(0);
    expect(toplam.M5).toBeGreaterThan(0);
    expect(toplam.M13).toBeGreaterThan(0);
    console.info(`Bilinçli farklar (${RASTGELE_PROJE_SAYISI} proje): ${JSON.stringify(toplam)}; nihai durumlar: ${[...durumlar].join(', ')}`);
  }, 120_000);
});
