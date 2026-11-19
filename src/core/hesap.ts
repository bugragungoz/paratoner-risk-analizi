// Hesap motoru: bir projenin bütün yapıları için risk analizi, paratoner–yapı satırları,
// kombine kapsama ve nihai durum. Harita, hesap tablosu, CSV ve rapor YALNIZCA bu sonucu kullanır
// (v5'te harita, tablo ve rapor aynı hesabı farklı kurallarla ayrı ayrı yapıyordu — M4).

import {
  DELTA_T_ONAY_MESAJI,
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
import { yuzde } from './bicim';
import { RP_MESAJLARI, rpOku } from './ese';
import { aeHesapla, ELIPSOIT_MODELI, type GeometriModeli, type KapsamaAnalizi } from './geometri';
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

export const SATIR_ETIKETLERI: Record<SatirDurumu, { etiket: string; renk: string }> = {
  YETERLI: { etiket: 'Koruma yeterli', renk: RENK.yesil },
  KISMI: { etiket: 'Kısmi koruma', renk: RENK.sari },
  YETERSIZ: { etiket: 'Koruma yetersiz', renk: RENK.kirmizi },
};

export const UYARI_EK_ONLEM =
  "Gerekli koruma seviyesi 'Seviye 1 + ek önlem': Seviye I koruma yarıçapına ek olarak, standardın öngördüğü ek koruma önlemleri ayrıca değerlendirilmelidir.";
export const UYARI_YUKSEK_YAPI =
  "Yapı yüksekliği 60 m'yi aşıyor: NF C 17-102'nin yüksek yapılara ilişkin ek hükümleri (yan darbelere karşı koruma) ayrıca değerlendirilmelidir.";

const NEDEN_KOT_EKSIK = 'Kot verisi eksik (kot seviyesi veya yapı tanımı bulunamadı)';
const NEDEN_YAPI_YUKSEK = 'Yapı, paratonerden daha yüksekte veya aynı boyda — korunamaz';

function gecersizSatir(pr: Paratoner, neden: string, gercekH?: number): ParatonerSatiri {
  const satir: ParatonerSatiri = { paratonerId: pr.id, paratonerIsim: pr.isim, gecerli: false, neden };
  if (gercekH !== undefined) satir.gercekH = gercekH;
  return satir;
}

/** Bir paratoner–yapı çifti. Kontrol sırası v5 ile aynıdır. */
function satirUret(pr: Paratoner, yapi: Yapi, proje: Proje, sutun: Seviye, model: GeometriModeli): ParatonerSatiri {
  const engel = paratonerSorunlari(pr, proje).find((s) => s.kod !== 'DELTA_T_GECERSIZ');
  const gercekH = gercekHHesapla(pr, yapi, proje);
  if (gercekH === null) return gecersizSatir(pr, NEDEN_KOT_EKSIK);
  if (engel) return gecersizSatir(pr, engel.mesaj, gercekH);
  if (gercekH < 2) return gecersizSatir(pr, gercekH <= 0 ? NEDEN_YAPI_YUKSEK : RP_MESAJLARI.H_2_ALTI, gercekH);

  const deltaT = etkinDeltaT(pr, proje);
  const okuma = rpOku(gercekH, sutun, deltaT);
  if (!okuma.tamam) return gecersizSatir(pr, okuma.mesaj, gercekH);

  const mesafe = model.mesafeler(pr, yapi.poligon);
  if (!mesafe) return gecersizSatir(pr, 'Yapı poligonu geçersiz.', gercekH);
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
    durum: SATIR_ETIKETLERI[durumKod].etiket,
    durumRenk: SATIR_ETIKETLERI[durumKod].renk,
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

function nihaiBelirle(gecerliSatirlar: ParatonerSatiri[], kapsama: KapsamaAnalizi, risk: RiskAnalizi): NihaiDurum {
  let nihai: NihaiDurum;
  if (gecerliSatirlar.length === 0) {
    nihai = { kod: 'KORUYUCU_YOK', etiket: 'Koruyucu bulunamadı', renk: RENK.gri };
  } else if (kapsama.geometriHatasi) {
    nihai = { kod: 'GEOMETRI_HATASI', etiket: 'Geometri hatası', renk: RENK.kirmizi };
  } else if (kapsama.tamamenKorunuyorMu) {
    nihai = gecerliSatirlar.some((s) => s.durumKod === 'YETERLI')
      ? { kod: 'YETERLI', etiket: 'Koruma yeterli', renk: RENK.yesil }
      : { kod: 'YETERLI_KOMBINE', etiket: 'Koruma yeterli (birleşik)', renk: RENK.yesil };
  } else if (kapsama.hicKorumaYokMu) {
    nihai = { kod: 'YETERSIZ', etiket: 'Koruma yetersiz', renk: RENK.kirmizi };
  } else {
    nihai = { kod: 'KISMI', etiket: `Kısmi koruma (${yuzde(kapsama.kapsamaOrani)}): açıkta alan var`, renk: RENK.kirmizi };
  }

  // Nd ≤ Nc: koruma isteğe bağlı.
  if (risk.istegeBagli) {
    if (nihai.kod === 'YETERSIZ' || nihai.kod === 'KISMI' || nihai.kod === 'KORUYUCU_YOK') {
      return { kod: 'ISTEGE_BAGLI_DISINDA', etiket: 'Koruma isteğe bağlı (yapının tamamı korunmuyor)', renk: RENK.acikYesil };
    }
    if (nihai.kod === 'YETERLI' || nihai.kod === 'YETERLI_KOMBINE') {
      return { kod: 'ISTEGE_BAGLI_ICINDE', etiket: 'Koruma isteğe bağlı (yapının tamamı korunuyor)', renk: RENK.acikYesil };
    }
  }
  return nihai;
}

function hesaplanamadi(yapi: Yapi, hatalar: string[]): YapiSonucu {
  return {
    yapiId: yapi.id,
    yapiIsim: yapi.isim,
    alan: null,
    cevre: null,
    risk: null,
    satirlar: [],
    birincilParatonerId: null,
    kapsama: null,
    nihai: { kod: 'HESAPLANAMADI', etiket: 'Hesaplanamadı', renk: RENK.gri },
    hatalar,
    uyarilar: [],
  };
}

export function yapiyiHesapla(
  yapi: Yapi,
  proje: Proje,
  paratonerler: Paratoner[] = hesabaGirenParatonerler(proje),
  model: GeometriModeli = ELIPSOIT_MODELI,
): YapiSonucu {
  const hatalar = yapiSorunlari(yapi, proje).map((s) => s.mesaj);
  const deltaTsiz = deltaTsizParatonerler(proje, paratonerler);
  if (deltaTsiz.length) {
    hatalar.unshift(
      paratonerBazliDeltaTMi(proje)
        ? `ΔT (paratoner yayılım süresi) seçilmemiş: ${deltaTsiz.map((p) => p.isim).join(', ')}.`
        : 'ΔT (paratoner yayılım süresi) seçilmemiş.',
    );
  }
  if (proje.deltaT_onay_gerekli) hatalar.unshift(DELTA_T_ONAY_MESAJI);
  if (!nkGecerliMi(proje)) hatalar.unshift('Nk (yıldırımlı gün sayısı) girilmemiş.');
  if (hatalar.length) return hesaplanamadi(yapi, hatalar);

  const { alan, cevre, Ae } = aeHesapla(yapi, model);
  const risk = yapiRiskAnalizi(
    { Ae, C1: yapi.C1 as number, C2: yapi.C2 as number, C3: yapi.C3 as number, C4: yapi.C4 as number, C5: yapi.C5 as number },
    proje.Nk,
  );
  if (!risk.sutun) return hesaplanamadi(yapi, ['Risk analizi geçersiz: Nd hesaplanamadı.']);
  const sutun = risk.sutun;

  const satirlar = paratonerler.map((pr) => satirUret(pr, yapi, proje, sutun, model));
  const gecerliSatirlar = satirlar.filter((s) => s.gecerli);
  const birincil = birincilSec(satirlar);

  const daireler = gecerliSatirlar.map((s) => {
    const pr = paratonerler.find((p) => p.id === s.paratonerId) as Paratoner;
    return { merkez: { lat: pr.lat, lng: pr.lng }, yaricapM: s.rp as number };
  });
  const kapsama = model.kapsama(daireler, yapi.poligon);
  const nihai = nihaiBelirle(gecerliSatirlar, kapsama, risk);

  const uyarilar: string[] = [];
  if (risk.ekOnlemGerekli) uyarilar.push(UYARI_EK_ONLEM);
  if ((yapi.H_m as number) > 60) uyarilar.push(UYARI_YUKSEK_YAPI);

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

export function projeyiHesapla(proje: Proje, model: GeometriModeli = ELIPSOIT_MODELI): ProjeSonucu {
  const paratonerler = hesabaGirenParatonerler(proje);
  return {
    dogrulama: projeyiDogrula(proje),
    yapilar: proje.yapilar.map((yapi) => yapiyiHesapla(yapi, proje, paratonerler, model)),
  };
}

/**
 * Son hesabı hatırlayan `projeyiHesapla`: proje yalnızca hesaba girmeyen alanlarda değiştiyse
 * önceki sonucu (aynı nesneyi) döndürür.
 */
export function onbellekliHesap(): (proje: Proje) => ProjeSonucu {
  let onceki: { proje: Proje; sonuc: ProjeSonucu } | null = null;
  return (proje) => {
    const sonuc = onceki && hesapGirdisiAyni(onceki.proje, proje) ? onceki.sonuc : projeyiHesapla(proje);
    onceki = { proje, sonuc };
    return sonuc;
  };
}
