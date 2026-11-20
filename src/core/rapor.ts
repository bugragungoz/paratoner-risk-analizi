// Rapor içeriği: özet sayılar, genel sonuç cümleleri ve yapı bazlı açıklama paragrafları.
// Hepsi hesap motorunun nihai (kombine) sonucuna dayanır. v3.2'deki doğru mantık geri
// getirildi; v5'teki "birincil paratonere göre sayım" çelişkisi giderildi (M5, Kanıt 6/9).
// Cümlelerin dili `m` sözlüğünden gelir (varsayılan Türkçe).

import type { Metinler } from '../dil';
import { tr as TR } from '../dil/tr';
import { SEVIYE_NUMARASI } from './bicim';
import type { NihaiKod, ProjeSonucu, YapiSonucu } from './hesap';
import type { SeviyeKodu } from './risk';

export interface RaporOzeti {
  toplam: number;
  /** Tek bir paratonerle ya da birleşik koruma alanıyla tamamen korunan yapılar. */
  yeterli: number;
  /** `yeterli` içinden yalnızca birleşik (kombine) koruma alanıyla korunanlar. */
  yeterliKombine: number;
  /** Nd ≤ Nc: koruma isteğe bağlı. */
  istegeBagli: number;
  kismi: number;
  yetersiz: number;
  koruyucuYok: number;
  geometriHatasi: number;
  hesaplanamadi: number;
  /**
   * Tek bir paratonerle tamamen korunan yapılarda (koruma isteğe bağlı olanlar dahil), birincil
   * paratonerin EN UZAK noktadaki marjı. Kombine korunan yapılarda tek paratonerin marjı anlamlı
   * olmadığından dahil edilmez.
   */
  marj: { enDar: number | null; enGenis: number | null; yapiSayisi: number };
}

const EKSIK_KODLAR: readonly NihaiKod[] = ['KISMI', 'YETERSIZ', 'KORUYUCU_YOK', 'GEOMETRI_HATASI', 'HESAPLANAMADI'];

export function birincilSatir(y: YapiSonucu) {
  return y.satirlar.find((s) => s.paratonerId === y.birincilParatonerId && s.gecerli) ?? null;
}

export function raporOzeti(sonuc: ProjeSonucu): RaporOzeti {
  const say = (...kodlar: NihaiKod[]) => sonuc.yapilar.filter((y) => kodlar.includes(y.nihai.kod)).length;
  // Birincil satırı "YETERLİ" olan yapı, tek paratonerin dairesi içinde kalır (koruma isteğe bağlı olsa bile).
  const marjlar = sonuc.yapilar
    .filter((y) => y.nihai.kod !== 'GEOMETRI_HATASI')
    .map(birincilSatir)
    .filter((s) => s?.durumKod === 'YETERLI')
    .map((s) => s?.marjEnUzak as number);
  return {
    toplam: sonuc.yapilar.length,
    yeterli: say('YETERLI', 'YETERLI_KOMBINE'),
    yeterliKombine: say('YETERLI_KOMBINE'),
    istegeBagli: say('ISTEGE_BAGLI_ICINDE', 'ISTEGE_BAGLI_DISINDA'),
    kismi: say('KISMI'),
    yetersiz: say('YETERSIZ'),
    koruyucuYok: say('KORUYUCU_YOK'),
    geometriHatasi: say('GEOMETRI_HATASI'),
    hesaplanamadi: say('HESAPLANAMADI'),
    marj: {
      enDar: marjlar.length ? Math.min(...marjlar) : null,
      enGenis: marjlar.length ? Math.max(...marjlar) : null,
      yapiSayisi: marjlar.length,
    },
  };
}

/** Gerekli korumanın sağlanamadığı yapılar (isteğe bağlı olanlar hariç). */
export function eksikYapilar(sonuc: ProjeSonucu): YapiSonucu[] {
  return sonuc.yapilar.filter((y) => EKSIK_KODLAR.includes(y.nihai.kod));
}

const SEVIYE_SIRASI: readonly SeviyeKodu[] = ['EK', 'I', 'II', 'III', 'IV', 'ISTEGE_BAGLI'];

/** Gerekli koruma seviyesine göre gruplanmış yapı adları (seviye adı sözlükten). */
export function seviyeDagilimi(sonuc: ProjeSonucu, m: Metinler = TR): { seviye: string; yapilar: string[] }[] {
  const gruplar = new Map<SeviyeKodu, string[]>();
  for (const y of sonuc.yapilar) {
    if (!y.risk) continue;
    gruplar.set(y.risk.seviyeKod, [...(gruplar.get(y.risk.seviyeKod) ?? []), y.yapiIsim]);
  }
  return SEVIYE_SIRASI.filter((s) => gruplar.has(s)).map((kod) => ({ seviye: m.hesap.seviye[kod], yapilar: gruplar.get(kod) ?? [] }));
}

/** Yapı bazlı otomatik değerlendirme paragrafı. */
export function yapiAciklamaParagrafi(y: YapiSonucu, m: Metinler = TR): string {
  const c = m.rapor.cumle;
  const { sayi, yuzde } = m.bicim;
  const t = y.yapiIsim;
  if (y.nihai.kod === 'HESAPLANAMADI') return c.hesaplanamadi(t, y.hatalar.join(' '));
  if (y.nihai.kod === 'GEOMETRI_HATASI') return c.geometriHatasi(t);

  const parcalar: string[] = [];
  if (y.risk?.istegeBagli) parcalar.push(c.istegeBagli(t));

  const b = birincilSatir(y);
  if (!b) {
    parcalar.push(c.koruyucuYok(t));
  } else {
    const hMetin = `${sayi(b.gercekH)} m${b.enterpoleEdildi ? c.enterpolasyon : ''}`;
    const seviyeNo = b.sutun ? String(SEVIYE_NUMARASI[b.sutun]) : '-';
    const giris = c.giris(b.paratonerIsim, t, hMetin, seviyeNo, sayi(b.rp));
    const tamamenKorunuyor = y.nihai.kod === 'YETERLI' || y.nihai.kod === 'YETERLI_KOMBINE' || y.nihai.kod === 'ISTEGE_BAGLI_ICINDE';

    if (tamamenKorunuyor && b.durumKod !== 'YETERLI') {
      parcalar.push(giris + c.birlesik(y.nihai.etiket));
    } else if (b.durumKod === 'YETERLI') {
      parcalar.push(giris + c.yeterli(sayi(b.enUzak), sayi(b.marjEnYakin), sayi(b.marjEnUzak)));
    } else if (b.durumKod === 'KISMI') {
      let metin = giris + c.kismi(sayi(Math.abs(b.marjEnUzak as number)));
      if (y.kapsama && !y.kapsama.hicKorumaYokMu) metin += c.kismiOran(yuzde(y.kapsama.kapsamaOrani));
      metin += c.kismiOneri;
      parcalar.push(metin);
    } else {
      parcalar.push(giris + c.yetersiz(sayi(Math.abs(b.marjEnYakin as number))));
    }
  }

  if (y.risk?.ekOnlemGerekli) parcalar.push(m.hesap.uyariEkOnlem);
  return parcalar.join(' ');
}

/** "Genel Sonuç" bölümünün cümleleri (eksik yapıların listesi ayrıca `eksikYapilar` ile verilir). */
export function genelSonucCumleleri(sonuc: ProjeSonucu, m: Metinler = TR): string[] {
  const c = m.rapor.cumle;
  const o = raporOzeti(sonuc);
  const s: string[] = [c.genelToplam(o.toplam), c.genelYeterli(o.yeterli, o.yeterliKombine)];
  if (o.istegeBagli > 0) s.push(c.genelIstegeBagli(o.istegeBagli));
  if (o.hesaplanamadi > 0) s.push(c.genelHesaplanamadi(o.hesaplanamadi));
  if (o.marj.yapiSayisi > 0) s.push(c.genelMarj(m.bicim.sayi(o.marj.enDar), m.bicim.sayi(o.marj.enGenis)));
  const ekOnlem = sonuc.yapilar.filter((y) => y.risk?.ekOnlemGerekli).map((y) => y.yapiIsim);
  if (ekOnlem.length) s.push(c.genelEkOnlem(ekOnlem.join(', ')));
  return s;
}
