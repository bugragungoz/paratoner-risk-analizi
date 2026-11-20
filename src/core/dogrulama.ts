// Girdi doğrulama. Hata (hesabı engeller) ve uyarı (hesap yapılır, kullanıcı bilgilendirilir) üretir.

import type { Metinler } from '../dil';
import { tr as TR } from '../dil/tr';
import { gercekHHesapla } from './kot';
import { GECERLI_DELTA_T_DEGERLERI, c2Degeri, standartCMi, type CAdi } from './sabitler';
import { noktaPoligondaMi, poligonAlanCevre, poligonCakismaAlani, poligonKendiniKesiyorMu } from './geometri';
import type { Paratoner, Proje, Yapi } from './tipler';

export type SorunKodu =
  | 'NK_YOK'
  | 'DELTA_T_ONAY'
  | 'DELTA_T_YOK'
  | 'DELTA_T_GECERSIZ'
  | 'YAPI_KOT_YOK'
  | 'YAPI_H'
  | 'YAPI_BOYUT'
  | 'YAPI_POLIGON'
  | 'YAPI_POLIGON_KESISIYOR'
  | 'YAPI_C_EKSIK'
  | 'YAPI_C_STANDART_DISI'
  | 'YAPI_C2_TUTARSIZ'
  | 'PARATONER_KOT_YOK'
  | 'PARATONER_YAPI_YOK'
  | 'PARATONER_MAST'
  | 'YAPI_60M'
  | 'H_60_USTU'
  | 'PARATONER_YAPI_DISINDA'
  | 'PARATONER_ZEMINDE_YAPI_ICINDE'
  | 'AD_TEKRAR'
  | 'YAPI_CAKISMA';

export interface Sorun {
  kod: SorunKodu;
  mesaj: string;
  yapiId?: string;
  paratonerId?: string;
}

export interface DogrulamaSonucu {
  hesaplanabilir: boolean;
  hatalar: Sorun[];
  uyarilar: Sorun[];
}

const C_ADLARI: readonly CAdi[] = ['C1', 'C2', 'C3', 'C4', 'C5'];

/** Türkçe mesaj (dile göre: `m.hesap.dogrulama.deltaTOnay`). */
export const DELTA_T_ONAY_MESAJI = TR.hesap.dogrulama.deltaTOnay;
const sayiMi = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Hesaba giren paratonerler: devre dışı bırakılmamış olanlar (gizli olanlar dahil). */
export function hesabaGirenParatonerler(proje: Proje): Paratoner[] {
  return proje.paratonerler.filter((p) => p.aktif_mi !== false);
}

export function paratonerBazliDeltaTMi(proje: Pick<Proje, 'deltaT_modu'>): boolean {
  return proje.deltaT_modu === 'paratoner';
}

/**
 * Paratonerin kullanacağı ΔT. Proje modunda projenin ΔT'si; paratoner modunda paratonerin
 * kendi ΔT'si, yoksa projenin ΔT'si.
 */
export function etkinDeltaT(paratoner: Pick<Paratoner, 'deltaT'>, proje: Pick<Proje, 'deltaT' | 'deltaT_modu'>): number | null {
  if (paratonerBazliDeltaTMi(proje)) return paratoner.deltaT ?? proje.deltaT ?? null;
  return proje.deltaT ?? null;
}

export function nkGecerliMi(proje: Pick<Proje, 'Nk'>): boolean {
  return sayiMi(proje.Nk) && proje.Nk > 0;
}

/** Kullanacağı ΔT belirlenemeyen etkin paratonerler. */
export function deltaTsizParatonerler(proje: Proje, paratonerler: Paratoner[] = hesabaGirenParatonerler(proje)): Paratoner[] {
  return paratonerler.filter((p) => etkinDeltaT(p, proje) === null);
}

/** Bir yapının hesaplanmasını engelleyen sorunlar. */
export function yapiSorunlari(yapi: Yapi, proje: Proje, m: Metinler = TR): Sorun[] {
  const s: Sorun[] = [];
  const d = m.hesap.dogrulama;
  const ekle = (kod: SorunKodu, mesaj: string) => s.push({ kod, mesaj: d.onEk(yapi.isim, mesaj), yapiId: yapi.id });

  if (!proje.kot_seviyeleri.some((k) => k.id === yapi.kot_seviyesi_id)) ekle('YAPI_KOT_YOK', d.yapiKotYok);
  if (!(sayiMi(yapi.H_m) && yapi.H_m > 0)) ekle('YAPI_H', d.yapiH);
  if (yapi.manuelBoyut && !(sayiMi(yapi.L_m) && yapi.L_m > 0 && sayiMi(yapi.W_m) && yapi.W_m > 0)) ekle('YAPI_BOYUT', d.yapiBoyut);
  if (!yapi.poligon || yapi.poligon.length < 3) ekle('YAPI_POLIGON', d.yapiPoligon);
  else if (poligonKendiniKesiyorMu(yapi.poligon)) ekle('YAPI_POLIGON_KESISIYOR', d.yapiPoligonKesisiyor);

  const eksik = C_ADLARI.filter((c) => !sayiMi(yapi[c]));
  if (eksik.length) ekle('YAPI_C_EKSIK', d.yapiCEksik(eksik.join(', ')));
  for (const c of C_ADLARI) {
    const deger = yapi[c];
    if (sayiMi(deger) && !standartCMi(c, deger)) ekle('YAPI_C_STANDART_DISI', d.yapiCStandartDisi(c, String(deger)));
  }
  if (yapi.C2_secim && sayiMi(yapi.C2) && c2Degeri(yapi.C2_secim) !== yapi.C2) ekle('YAPI_C2_TUTARSIZ', d.yapiC2Tutarsiz);
  return s;
}

/** Bir paratonerin hesaba girmesini engelleyen sorunlar (yalnızca etkin paratonerler için anlamlı). */
export function paratonerSorunlari(pr: Paratoner, proje: Proje, m: Metinler = TR): Sorun[] {
  const s: Sorun[] = [];
  const d = m.hesap.dogrulama;
  const ekle = (kod: SorunKodu, mesaj: string) => s.push({ kod, mesaj: d.onEk(pr.isim, mesaj), paratonerId: pr.id });

  if (pr.yapi_id) {
    if (!proje.yapilar.some((y) => y.id === pr.yapi_id)) ekle('PARATONER_YAPI_YOK', d.paratonerYapiYok);
  } else if (!proje.kot_seviyeleri.some((k) => k.id === pr.kot_seviyesi_id)) {
    ekle('PARATONER_KOT_YOK', d.paratonerKotYok);
  }
  if (!(sayiMi(pr.mast_yuksekligi_m) && pr.mast_yuksekligi_m > 0)) ekle('PARATONER_MAST', d.paratonerMast);

  const dT = etkinDeltaT(pr, proje);
  if (dT !== null && !GECERLI_DELTA_T_DEGERLERI.includes(dT)) ekle('DELTA_T_GECERSIZ', d.deltaTGecersiz(dT, GECERLI_DELTA_T_DEGERLERI.join(', ')));
  return s;
}

export function projeyiDogrula(proje: Proje, m: Metinler = TR): DogrulamaSonucu {
  const hatalar: Sorun[] = [];
  const uyarilar: Sorun[] = [];
  const d = m.hesap.dogrulama;

  if (!nkGecerliMi(proje)) hatalar.push({ kod: 'NK_YOK', mesaj: d.nkYok });
  if (proje.deltaT_onay_gerekli) hatalar.push({ kod: 'DELTA_T_ONAY', mesaj: d.deltaTOnay });

  const paratonerler = hesabaGirenParatonerler(proje);
  const deltaTsiz = deltaTsizParatonerler(proje, paratonerler);
  if (deltaTsiz.length) {
    hatalar.push({
      kod: 'DELTA_T_YOK',
      mesaj: paratonerBazliDeltaTMi(proje) ? d.deltaTYokParatoner(deltaTsiz.map((p) => p.isim).join(', ')) : d.deltaTYok,
    });
  }
  if (proje.deltaT !== null && proje.deltaT !== undefined && !GECERLI_DELTA_T_DEGERLERI.includes(proje.deltaT)) {
    hatalar.push({ kod: 'DELTA_T_GECERSIZ', mesaj: d.projeDeltaTGecersiz(proje.deltaT) });
  }

  for (const yapi of proje.yapilar) {
    hatalar.push(...yapiSorunlari(yapi, proje, m));
    if (sayiMi(yapi.H_m) && yapi.H_m > 60) uyarilar.push({ kod: 'YAPI_60M', mesaj: d.yuksekYapi(yapi.isim), yapiId: yapi.id });
  }
  for (const pr of paratonerler) {
    // Projenin geçersiz ΔT'si yukarıda bir kez bildirildi; burada yalnızca paratonerin kendi ΔT'si.
    const kendiDeltaT = paratonerBazliDeltaTMi(proje) && pr.deltaT !== null && pr.deltaT !== undefined;
    hatalar.push(...paratonerSorunlari(pr, proje, m).filter((s) => s.kod !== 'DELTA_T_GECERSIZ' || kendiDeltaT));
    for (const yapi of proje.yapilar) {
      const h = gercekHHesapla(pr, yapi, proje);
      if (h !== null && h > 60) {
        uyarilar.push({ kod: 'H_60_USTU', mesaj: d.h60(pr.isim, yapi.isim, m.bicim.sayi(h)), yapiId: yapi.id, paratonerId: pr.id });
      }
    }
  }

  uyarilar.push(...konumVeAdUyarilari(proje, paratonerler, m));
  return { hesaplanabilir: hatalar.length === 0, hatalar, uyarilar };
}

/** Üst üste binen yapılar için eşik: ortak alan 1 m²'den ve küçük yapının %5'inden büyükse. */
const CAKISMA_ESIGI_M2 = 1;
const CAKISMA_ORANI = 0.05;

/**
 * Hesabı engellemeyen ama çoğunlukla giriş hatası olan durumlar:
 * - çatıda seçilen paratoner o yapının dışında (h çatıdan, mesafe bulunduğu yerden hesaplanıyor),
 * - zeminden ölçülen paratoner bir yapının içinde (çatıda olması gerekiyor olabilir),
 * - aynı adlı yapı ya da paratoner (tablo ve raporda karışır),
 * - üst üste binen yapılar (aynı yapı iki kez çizilmiş olabilir).
 */
function konumVeAdUyarilari(proje: Proje, paratonerler: Paratoner[], m: Metinler): Sorun[] {
  const u: Sorun[] = [];
  const d = m.hesap.dogrulama;
  for (const pr of paratonerler) {
    const konum = { lat: pr.lat, lng: pr.lng };
    if (pr.yapi_id) {
      const yapi = proje.yapilar.find((y) => y.id === pr.yapi_id);
      if (yapi && yapi.poligon.length >= 3 && !noktaPoligondaMi(konum, yapi.poligon)) {
        u.push({
          kod: 'PARATONER_YAPI_DISINDA',
          mesaj: d.catiDisinda(pr.isim, yapi.isim),
          paratonerId: pr.id,
          yapiId: yapi.id,
        });
      }
    } else {
      const ici = proje.yapilar.find((y) => y.poligon.length >= 3 && noktaPoligondaMi(konum, y.poligon));
      if (ici) {
        u.push({
          kod: 'PARATONER_ZEMINDE_YAPI_ICINDE',
          mesaj: d.yapiIcinde(pr.isim, ici.isim),
          paratonerId: pr.id,
          yapiId: ici.id,
        });
      }
    }
  }

  const tekrarlar = (adlar: string[]) => {
    const say = new Map<string, { ad: string; n: number }>();
    for (const ad of adlar) {
      const anahtar = ad.trim().toLocaleLowerCase(m.bicim.yerel);
      if (!anahtar) continue;
      const k = say.get(anahtar);
      say.set(anahtar, { ad: k?.ad ?? ad.trim(), n: (k?.n ?? 0) + 1 });
    }
    return [...say.values()].filter((k) => k.n > 1).map((k) => k.ad);
  };
  const yapiTekrar = tekrarlar(proje.yapilar.map((y) => y.isim));
  if (yapiTekrar.length) u.push({ kod: 'AD_TEKRAR', mesaj: d.adTekrarYapi(yapiTekrar.join(', ')) });
  const prTekrar = tekrarlar(proje.paratonerler.map((p) => p.isim));
  if (prTekrar.length) u.push({ kod: 'AD_TEKRAR', mesaj: d.adTekrarParatoner(prTekrar.join(', ')) });

  const yapilar = proje.yapilar.filter((y) => y.poligon.length >= 3 && !poligonKendiniKesiyorMu(y.poligon));
  for (let i = 0; i < yapilar.length; i++) {
    for (let j = i + 1; j < yapilar.length; j++) {
      const a = yapilar[i] as Yapi;
      const b = yapilar[j] as Yapi;
      const ortak = poligonCakismaAlani(a.poligon, b.poligon);
      const kucuk = Math.min(poligonAlanCevre(a.poligon).alan, poligonAlanCevre(b.poligon).alan);
      if (ortak > CAKISMA_ESIGI_M2 && ortak > kucuk * CAKISMA_ORANI) {
        u.push({
          kod: 'YAPI_CAKISMA',
          mesaj: d.ustUste(a.isim, b.isim, m.bicim.sayi(ortak, 0)),
          yapiId: a.id,
        });
      }
    }
  }
  return u;
}
