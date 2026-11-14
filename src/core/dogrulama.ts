// Girdi doğrulama. Hata (hesabı engeller) ve uyarı (hesap yapılır, kullanıcı bilgilendirilir) üretir.

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

export const DELTA_T_ONAY_MESAJI =
  'ΔT onaylanmadı: proje eski sürümden aktarıldı ve ΔT = 60 µs eski sürümün varsayılanıydı. Kullandığınız paratonerin ΔT değerini seçin.';
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
export function yapiSorunlari(yapi: Yapi, proje: Proje): Sorun[] {
  const s: Sorun[] = [];
  const ekle = (kod: SorunKodu, mesaj: string) => s.push({ kod, mesaj: `${yapi.isim}: ${mesaj}`, yapiId: yapi.id });

  if (!proje.kot_seviyeleri.some((k) => k.id === yapi.kot_seviyesi_id)) ekle('YAPI_KOT_YOK', 'bağlı olduğu kot seviyesi bulunamadı.');
  if (!(sayiMi(yapi.H_m) && yapi.H_m > 0)) ekle('YAPI_H', 'yükseklik (H) girilmemiş ya da sıfırdan büyük değil.');
  if (yapi.manuelBoyut && !(sayiMi(yapi.L_m) && yapi.L_m > 0 && sayiMi(yapi.W_m) && yapi.W_m > 0)) {
    ekle('YAPI_BOYUT', 'manuel boyut seçili ama L ve W girilmemiş.');
  }
  if (!yapi.poligon || yapi.poligon.length < 3) ekle('YAPI_POLIGON', 'poligonun en az 3 köşesi olmalı.');
  else if (poligonKendiniKesiyorMu(yapi.poligon)) {
    ekle('YAPI_POLIGON_KESISIYOR', 'poligonun kenarları birbirini kesiyor; köşeleri kesişmeyecek şekilde düzenleyin.');
  }

  const eksik = C_ADLARI.filter((c) => !sayiMi(yapi[c]));
  if (eksik.length) ekle('YAPI_C_EKSIK', `risk katsayıları eksik (${eksik.join(', ')}).`);
  for (const c of C_ADLARI) {
    const deger = yapi[c];
    if (sayiMi(deger) && !standartCMi(c, deger)) {
      ekle('YAPI_C_STANDART_DISI', `${c} = ${deger} standart tabloda yok; yeniden seçin.`);
    }
  }
  if (yapi.C2_secim && sayiMi(yapi.C2) && c2Degeri(yapi.C2_secim) !== yapi.C2) {
    ekle('YAPI_C2_TUTARSIZ', 'C2 değeri seçilen yapı/çatı malzemesiyle uyuşmuyor; yeniden seçin.');
  }
  return s;
}

/** Bir paratonerin hesaba girmesini engelleyen sorunlar (yalnızca etkin paratonerler için anlamlı). */
export function paratonerSorunlari(pr: Paratoner, proje: Proje): Sorun[] {
  const s: Sorun[] = [];
  const ekle = (kod: SorunKodu, mesaj: string) => s.push({ kod, mesaj: `${pr.isim}: ${mesaj}`, paratonerId: pr.id });

  if (pr.yapi_id) {
    if (!proje.yapilar.some((y) => y.id === pr.yapi_id)) ekle('PARATONER_YAPI_YOK', 'üzerinde durduğu yapı bulunamadı.');
  } else if (!proje.kot_seviyeleri.some((k) => k.id === pr.kot_seviyesi_id)) {
    ekle('PARATONER_KOT_YOK', 'bağlı olduğu kot seviyesi bulunamadı.');
  }
  if (!(sayiMi(pr.mast_yuksekligi_m) && pr.mast_yuksekligi_m > 0)) ekle('PARATONER_MAST', 'mast yüksekliği sıfırdan büyük olmalı.');

  const dT = etkinDeltaT(pr, proje);
  if (dT !== null && !GECERLI_DELTA_T_DEGERLERI.includes(dT)) {
    ekle('DELTA_T_GECERSIZ', `ΔT = ${dT} µs tabloda yok (geçerli değerler: ${GECERLI_DELTA_T_DEGERLERI.join(', ')} µs).`);
  }
  return s;
}

export function projeyiDogrula(proje: Proje): DogrulamaSonucu {
  const hatalar: Sorun[] = [];
  const uyarilar: Sorun[] = [];

  if (!nkGecerliMi(proje)) {
    hatalar.push({ kod: 'NK_YOK', mesaj: 'Nk (yıldırımlı gün sayısı) girilmemiş.' });
  }

  if (proje.deltaT_onay_gerekli) {
    hatalar.push({ kod: 'DELTA_T_ONAY', mesaj: DELTA_T_ONAY_MESAJI });
  }

  const paratonerler = hesabaGirenParatonerler(proje);
  const deltaTsiz = deltaTsizParatonerler(proje, paratonerler);
  if (deltaTsiz.length) {
    hatalar.push({
      kod: 'DELTA_T_YOK',
      mesaj: paratonerBazliDeltaTMi(proje)
        ? `ΔT (paratoner yayılım süresi) seçilmemiş: ${deltaTsiz.map((p) => p.isim).join(', ')}. Paratonerin ΔT'sini ya da projenin varsayılan ΔT'sini seçin.`
        : 'ΔT (paratoner yayılım süresi) seçilmemiş. Ayarlar\'dan projenin ΔT değerini seçin.',
    });
  }
  if (proje.deltaT !== null && proje.deltaT !== undefined && !GECERLI_DELTA_T_DEGERLERI.includes(proje.deltaT)) {
    hatalar.push({ kod: 'DELTA_T_GECERSIZ', mesaj: `Proje ΔT = ${proje.deltaT} µs tabloda yok.` });
  }

  for (const yapi of proje.yapilar) {
    hatalar.push(...yapiSorunlari(yapi, proje));
    if (sayiMi(yapi.H_m) && yapi.H_m > 60) {
      uyarilar.push({
        kod: 'YAPI_60M',
        mesaj: `${yapi.isim}: yükseklik 60 m'yi aşıyor. NF C 17-102'nin yüksek yapılara ilişkin ek hükümleri (yan darbelere karşı koruma) ayrıca değerlendirilmelidir.`,
        yapiId: yapi.id,
      });
    }
  }
  for (const pr of paratonerler) {
    // Projenin geçersiz ΔT'si yukarıda bir kez bildirildi; burada yalnızca paratonerin kendi ΔT'si.
    const kendiDeltaT = paratonerBazliDeltaTMi(proje) && pr.deltaT !== null && pr.deltaT !== undefined;
    hatalar.push(...paratonerSorunlari(pr, proje).filter((s) => s.kod !== 'DELTA_T_GECERSIZ' || kendiDeltaT));
    for (const yapi of proje.yapilar) {
      const h = gercekHHesapla(pr, yapi, proje);
      if (h !== null && h > 60) {
        uyarilar.push({
          kod: 'H_60_USTU',
          mesaj: `${pr.isim} → ${yapi.isim}: h = ${h.toFixed(1)} m > 60 m. Standart Rp üretilemez; özel mühendislik değerlendirmesi gerekir.`,
          yapiId: yapi.id,
          paratonerId: pr.id,
        });
      }
    }
  }

  uyarilar.push(...konumVeAdUyarilari(proje, paratonerler));
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
function konumVeAdUyarilari(proje: Proje, paratonerler: Paratoner[]): Sorun[] {
  const u: Sorun[] = [];
  for (const pr of paratonerler) {
    const konum = { lat: pr.lat, lng: pr.lng };
    if (pr.yapi_id) {
      const yapi = proje.yapilar.find((y) => y.id === pr.yapi_id);
      if (yapi && yapi.poligon.length >= 3 && !noktaPoligondaMi(konum, yapi.poligon)) {
        u.push({
          kod: 'PARATONER_YAPI_DISINDA',
          mesaj: `${pr.isim}: tabanı "${yapi.isim}" çatısı seçili ama konumu bu yapının dışında. Yükseklik çatıdan, mesafeler bulunduğu yerden hesaplanıyor; konumu ya da tabanı düzeltin.`,
          paratonerId: pr.id,
          yapiId: yapi.id,
        });
      }
    } else {
      const ici = proje.yapilar.find((y) => y.poligon.length >= 3 && noktaPoligondaMi(konum, y.poligon));
      if (ici) {
        u.push({
          kod: 'PARATONER_ZEMINDE_YAPI_ICINDE',
          mesaj: `${pr.isim}: "${ici.isim}" yapısının içinde ama yüksekliği kot seviyesinden ölçülüyor. Paratoner çatıdaysa tabanını "Bir yapının üzerinde" olarak seçin.`,
          paratonerId: pr.id,
          yapiId: ici.id,
        });
      }
    }
  }

  const tekrarlar = (adlar: string[]) => {
    const say = new Map<string, { ad: string; n: number }>();
    for (const ad of adlar) {
      const anahtar = ad.trim().toLocaleLowerCase('tr-TR');
      if (!anahtar) continue;
      const k = say.get(anahtar);
      say.set(anahtar, { ad: k?.ad ?? ad.trim(), n: (k?.n ?? 0) + 1 });
    }
    return [...say.values()].filter((k) => k.n > 1).map((k) => k.ad);
  };
  const yapiTekrar = tekrarlar(proje.yapilar.map((y) => y.isim));
  if (yapiTekrar.length) u.push({ kod: 'AD_TEKRAR', mesaj: `Aynı adlı yapılar var: ${yapiTekrar.join(', ')}. Hesap tablosunda ve raporda ayırt edilebilmeleri için adlarını değiştirin.` });
  const prTekrar = tekrarlar(proje.paratonerler.map((p) => p.isim));
  if (prTekrar.length) u.push({ kod: 'AD_TEKRAR', mesaj: `Aynı adlı paratonerler var: ${prTekrar.join(', ')}. Hesap tablosunda ve raporda ayırt edilebilmeleri için adlarını değiştirin.` });

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
          mesaj: `${a.isim} ve ${b.isim} üst üste biniyor (ortak alan ${ortak.toFixed(0)} m²). Aynı yapı iki kez çizilmiş olabilir; Ae ve sonuçlar her yapı için ayrı hesaplanır.`,
          yapiId: a.id,
        });
      }
    }
  }
  return u;
}
