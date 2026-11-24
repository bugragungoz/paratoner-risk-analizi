// Hesap motoru: bir projenin bütün yapıları için risk analizi, paratoner–yapı satırları,
// kombine kapsama ve nihai durum. Harita, hesap tablosu, CSV ve rapor YALNIZCA bu sonucu kullanır
// (v5'te harita, tablo ve rapor aynı hesabı farklı kurallarla ayrı ayrı yapıyordu — M4).

import {
  deltaTsizParatonerler,
  etkinDeltaT,
  hesabaGirenParatonerler,
  nkGecerliMi,
  paratonerBazliDeltaTMi,
  paratonerSorunlari,
  projeyiDogrula,
  yapiSorunlari,
  type DogrulamaSonucu,
} from './dogrulama';
import type { Metinler } from '../dil';
import { tr as TR } from '../dil/tr';
import { rpOku } from './ese';
import { aeHesapla, ELIPSOIT_MODELI, tamKapsama, type GeometriModeli, type KapsamaAnalizi } from './geometri';
import { gercekHHesapla } from './kot';
import { yapiRiskAnalizi, type RiskAnalizi } from './risk';
import type { Paratoner, Proje, Seviye, Yapi } from './tipler';

export type SatirDurumu = 'YETERLI' | 'KISMI' | 'YETERSIZ';

export interface ParatonerSatiri {
  paratonerId: string;
  paratonerIsim: string;
  gecerli: boolean;
  /** Geçersizse nedeni. */
  neden?: string;
  gercekH?: number;
  deltaT?: number | null;
  sutun?: Seviye;
  rp?: number;
  enterpoleEdildi?: boolean;
  enYakin?: number;
  enUzak?: number;
  marjEnYakin?: number;
  marjEnUzak?: number;
  durumKod?: SatirDurumu;
  durum?: string;
  durumRenk?: string;
}

export type NihaiKod =
  | 'YETERLI'
  | 'YETERLI_KOMBINE'
  | 'KISMI'
  | 'YETERSIZ'
  | 'KORUYUCU_YOK'
  | 'ISTEGE_BAGLI_ICINDE'
  | 'ISTEGE_BAGLI_DISINDA'
  | 'GEOMETRI_HATASI'
  | 'HESAPLANAMADI';

export interface NihaiDurum {
  kod: NihaiKod;
  etiket: string;
  renk: string;
}

export interface YapiSonucu {
  yapiId: string;
  yapiIsim: string;
  alan: number | null;
  cevre: number | null;
  risk: RiskAnalizi | null;
  satirlar: ParatonerSatiri[];
  birincilParatonerId: string | null;
  kapsama: KapsamaAnalizi | null;
  nihai: NihaiDurum;
  /** Hesabı engelleyen sorunlar (nihai = HESAPLANAMADI). */
  hatalar: string[];
  /** Hesap yapıldı ama mühendisin dikkat etmesi gereken durumlar. */
  uyarilar: string[];
}

export interface ProjeSonucu {
  dogrulama: DogrulamaSonucu;
  yapilar: YapiSonucu[];
}

export const RENK = {
  yesil: '#16a34a',
  sari: '#eab308',
  kirmizi: '#dc2626',
  gri: '#71717a',
  acikYesil: '#84cc16',
} as const;

export const SATIR_RENKLERI: Record<SatirDurumu, string> = { YETERLI: RENK.yesil, KISMI: RENK.sari, YETERSIZ: RENK.kirmizi };

/** Satır durumu etiketleri ve renkleri (Türkçe; dile göre: `m.hesap.satir`). */
export const SATIR_ETIKETLERI: Record<SatirDurumu, { etiket: string; renk: string }> = {
  YETERLI: { etiket: TR.hesap.satir.YETERLI, renk: RENK.yesil },
  KISMI: { etiket: TR.hesap.satir.KISMI, renk: RENK.sari },
  YETERSIZ: { etiket: TR.hesap.satir.YETERSIZ, renk: RENK.kirmizi },
};

/** Türkçe uyarı metinleri (dile göre: `m.hesap.uyariEkOnlem`, `m.hesap.uyariYuksekYapi`). */
export const UYARI_EK_ONLEM = TR.hesap.uyariEkOnlem;
export const UYARI_YUKSEK_YAPI = TR.hesap.uyariYuksekYapi;

function gecersizSatir(pr: Paratoner, neden: string, gercekH?: number): ParatonerSatiri {
  const satir: ParatonerSatiri = { paratonerId: pr.id, paratonerIsim: pr.isim, gecerli: false, neden };
  if (gercekH !== undefined) satir.gercekH = gercekH;
  return satir;
}

/** Bir paratoner–yapı çifti. Kontrol sırası v5 ile aynıdır. */
function satirUret(pr: Paratoner, yapi: Yapi, proje: Proje, sutun: Seviye, model: GeometriModeli, m: Metinler): ParatonerSatiri {
  const engel = paratonerSorunlari(pr, proje, m).find((s) => s.kod !== 'DELTA_T_GECERSIZ');
  const gercekH = gercekHHesapla(pr, yapi, proje);
  if (gercekH === null) return gecersizSatir(pr, m.hesap.nedenKotEksik);
  if (engel) return gecersizSatir(pr, engel.mesaj, gercekH);
  if (gercekH < 2) return gecersizSatir(pr, gercekH <= 0 ? m.hesap.nedenYapiYuksek : m.hesap.rp.H_2_ALTI, gercekH);

  const deltaT = etkinDeltaT(pr, proje);
  const okuma = rpOku(gercekH, sutun, deltaT, m);
  if (!okuma.tamam) return gecersizSatir(pr, okuma.mesaj, gercekH);

  const mesafe = model.mesafeler(pr, yapi.poligon);
  if (!mesafe) return gecersizSatir(pr, m.hesap.nedenPoligon, gercekH);
  const marjEnYakin = okuma.rp - mesafe.enYakin;
  const marjEnUzak = okuma.rp - mesafe.enUzak;
  const durumKod: SatirDurumu = marjEnYakin >= 0 && marjEnUzak >= 0 ? 'YETERLI' : marjEnYakin >= 0 ? 'KISMI' : 'YETERSIZ';

  return {
    paratonerId: pr.id,
    paratonerIsim: pr.isim,
    gecerli: true,
    gercekH,
    deltaT,
    sutun,
    rp: okuma.rp,
    enterpoleEdildi: okuma.enterpoleEdildi,
    enYakin: mesafe.enYakin,
    enUzak: mesafe.enUzak,
    marjEnYakin,
    marjEnUzak,
    durumKod,
    durum: m.hesap.satir[durumKod],
    durumRenk: SATIR_RENKLERI[durumKod],
  };
}

/** Birincil koruyucu: yapının en uzak noktasını en büyük marjla koruyan paratoner (M5). */
function birincilSec(satirlar: ParatonerSatiri[]): ParatonerSatiri | null {
  let en: ParatonerSatiri | null = null;
  for (const s of satirlar) {
    if (!s.gecerli) continue;
    if (
      !en ||
      (s.marjEnUzak as number) > (en.marjEnUzak as number) ||
      ((s.marjEnUzak as number) === (en.marjEnUzak as number) && (s.marjEnYakin as number) > (en.marjEnYakin as number))
    ) {
      en = s;
    }
  }
  return en;
}

function nihaiBelirle(gecerliSatirlar: ParatonerSatiri[], kapsama: KapsamaAnalizi, risk: RiskAnalizi, m: Metinler): NihaiDurum {
  const e = m.hesap.nihai;
  let nihai: NihaiDurum;
  if (gecerliSatirlar.length === 0) {
    nihai = { kod: 'KORUYUCU_YOK', etiket: e.KORUYUCU_YOK, renk: RENK.gri };
  } else if (kapsama.geometriHatasi) {
    nihai = { kod: 'GEOMETRI_HATASI', etiket: e.GEOMETRI_HATASI, renk: RENK.kirmizi };
  } else if (kapsama.tamamenKorunuyorMu) {
    nihai = gecerliSatirlar.some((s) => s.durumKod === 'YETERLI')
      ? { kod: 'YETERLI', etiket: e.YETERLI, renk: RENK.yesil }
      : { kod: 'YETERLI_KOMBINE', etiket: e.YETERLI_KOMBINE, renk: RENK.yesil };
  } else if (kapsama.hicKorumaYokMu) {
    nihai = { kod: 'YETERSIZ', etiket: e.YETERSIZ, renk: RENK.kirmizi };
  } else {
    nihai = { kod: 'KISMI', etiket: e.KISMI(m.bicim.yuzde(kapsama.kapsamaOrani)), renk: RENK.kirmizi };
  }

  // Nd ≤ Nc: koruma isteğe bağlı.
  if (risk.istegeBagli) {
    if (nihai.kod === 'YETERSIZ' || nihai.kod === 'KISMI' || nihai.kod === 'KORUYUCU_YOK') {
      return { kod: 'ISTEGE_BAGLI_DISINDA', etiket: e.ISTEGE_BAGLI_DISINDA, renk: RENK.acikYesil };
    }
    if (nihai.kod === 'YETERLI' || nihai.kod === 'YETERLI_KOMBINE') {
      return { kod: 'ISTEGE_BAGLI_ICINDE', etiket: e.ISTEGE_BAGLI_ICINDE, renk: RENK.acikYesil };
    }
  }
  return nihai;
}

function hesaplanamadi(yapi: Yapi, hatalar: string[], m: Metinler): YapiSonucu {
  return {
    yapiId: yapi.id,
    yapiIsim: yapi.isim,
    alan: null,
    cevre: null,
    risk: null,
    satirlar: [],
    birincilParatonerId: null,
    kapsama: null,
    nihai: { kod: 'HESAPLANAMADI', etiket: m.hesap.nihai.HESAPLANAMADI, renk: RENK.gri },
    hatalar,
    uyarilar: [],
  };
}

export function yapiyiHesapla(
  yapi: Yapi,
  proje: Proje,
  paratonerler: Paratoner[] = hesabaGirenParatonerler(proje),
  model: GeometriModeli = ELIPSOIT_MODELI,
  m: Metinler = TR,
): YapiSonucu {
  const hatalar = yapiSorunlari(yapi, proje, m).map((s) => s.mesaj);
  const deltaTsiz = deltaTsizParatonerler(proje, paratonerler);
  if (deltaTsiz.length) {
    hatalar.unshift(paratonerBazliDeltaTMi(proje) ? m.hesap.deltaTYokParatoner(deltaTsiz.map((p) => p.isim).join(', ')) : m.hesap.deltaTYok);
  }
  if (proje.deltaT_onay_gerekli) hatalar.unshift(m.hesap.dogrulama.deltaTOnay);
  if (!nkGecerliMi(proje)) hatalar.unshift(m.hesap.nkYok);
  if (hatalar.length) return hesaplanamadi(yapi, hatalar, m);

  const { alan, cevre, Ae } = aeHesapla(yapi, model);
  const risk = yapiRiskAnalizi(
    { Ae, C1: yapi.C1 as number, C2: yapi.C2 as number, C3: yapi.C3 as number, C4: yapi.C4 as number, C5: yapi.C5 as number },
    proje.Nk,
    m,
  );
  if (!risk.sutun) return hesaplanamadi(yapi, [m.hesap.riskGecersiz], m);
  const sutun = risk.sutun;

  const satirlar = paratonerler.map((pr) => satirUret(pr, yapi, proje, sutun, model, m));
  const gecerliSatirlar = satirlar.filter((s) => s.gecerli);
  const birincil = birincilSec(satirlar);

  const daireler = gecerliSatirlar.map((s) => {
    const pr = paratonerler.find((p) => p.id === s.paratonerId) as Paratoner;
    return { merkez: { lat: pr.lat, lng: pr.lng }, yaricapM: s.rp as number };
  });
  let kapsama = model.kapsama(daireler, yapi.poligon);
  // M15: bir paratoner yapının bütün köşelerini kapsıyorsa (satır "yeterli") yapı kesin olarak tamamen
  // korunur; dairenin çokgen yaklaşımı köşe daireye birkaç santim yakınsa "kısmi %99,9" diyebiliyordu.
  if (!kapsama.tamamenKorunuyorMu && !kapsama.geometriHatasi && gecerliSatirlar.some((s) => s.durumKod === 'YETERLI')) {
    kapsama = tamKapsama(yapi.poligon);
  }
  const nihai = nihaiBelirle(gecerliSatirlar, kapsama, risk, m);

  const uyarilar: string[] = [];
  if (risk.ekOnlemGerekli) uyarilar.push(m.hesap.uyariEkOnlem);
  if ((yapi.H_m as number) > 60) uyarilar.push(m.hesap.uyariYuksekYapi);

  return {
    yapiId: yapi.id,
    yapiIsim: yapi.isim,
    alan,
    cevre,
    risk,
    satirlar,
    birincilParatonerId: birincil?.paratonerId ?? null,
    kapsama,
    nihai,
    hatalar: [],
    uyarilar,
  };
}

/** Projenin tamamı: doğrulama + her yapının sonucu. */
/** Projenin hesaba girmeyen alanları: ad, rapor bilgileri ve harita görünümü. */
const HESABA_GIRMEYEN: ReadonlySet<string> = new Set([
  'isim',
  'tesis_adresi',
  'cihaz',
  'rapor_no',
  'revizyonlar',
  'harita_merkez_lat',
  'harita_merkez_lng',
  'harita_zoom',
  'altlik',
]);

/**
 * İki proje yalnızca hesaba girmeyen alanlarda farklıysa true döner; o zaman `projeyiHesapla`
 * sonucu aynıdır ve yeniden hesap gerekmez. Diğer bütün alanlar başvuru eşitliğiyle karşılaştırılır,
 * yani listede olmayan yeni bir alan kendiliğinden "hesaba girer" sayılır.
 */
export function hesapGirdisiAyni(a: Proje, b: Proje): boolean {
  if (a === b) return true;
  const x = a as unknown as Record<string, unknown>;
  const y = b as unknown as Record<string, unknown>;
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
    if (!HESABA_GIRMEYEN.has(k) && x[k] !== y[k]) return false;
  }
  return true;
}

/** `m`: sonuçtaki etiket ve mesajların dili (varsayılan Türkçe). */
export function projeyiHesapla(proje: Proje, model: GeometriModeli = ELIPSOIT_MODELI, m: Metinler = TR): ProjeSonucu {
  const paratonerler = hesabaGirenParatonerler(proje);
  return {
    dogrulama: projeyiDogrula(proje, m),
    yapilar: proje.yapilar.map((yapi) => yapiyiHesapla(yapi, proje, paratonerler, model, m)),
  };
}

/**
 * Son hesabı hatırlayan `projeyiHesapla`: proje yalnızca hesaba girmeyen alanlarda değiştiyse
 * önceki sonucu (aynı nesneyi) döndürür.
 */
export function onbellekliHesap(): (proje: Proje, m?: Metinler) => ProjeSonucu {
  let onceki: { proje: Proje; m: Metinler; sonuc: ProjeSonucu } | null = null;
  return (proje, m = TR) => {
    const sonuc = onceki && onceki.m === m && hesapGirdisiAyni(onceki.proje, proje) ? onceki.sonuc : projeyiHesapla(proje, ELIPSOIT_MODELI, m);
    onceki = { proje, m, sonuc };
    return sonuc;
  };
}
