// Proje dosya biçimi (.ptproj): doğrulama, eski (v5) projelerden aktarım ve yazma.
//
// Bozuk veya eksik bir dosya, hangi alanın hatalı olduğu söylenerek REDDEDİLİR; mühendislik
// verisinde sessizce öğe atıp devam etmek yanlış sonuca götürebilir.

import { MALZEMELER, standartCMi, type CAdi } from './sabitler';
import type { C2Secimi, DeltaTModu, KotSeviyesi, LatLng, Paratoner, Proje, Revizyon, Yapi } from './tipler';

export const PROJE_DOSYA_BICIMI = 'paratoner-proje';
export const PROJE_DOSYA_SURUMU = 2;
export const PROJE_UZANTISI = 'ptproj';
/** Dosya boyutu üst sınırı (bayt): olağan bir proje birkaç yüz KB'tır. */
export const PROJE_DOSYA_SINIRI = 20 * 1024 * 1024;

export interface ProjeDosyasi {
  bicim: typeof PROJE_DOSYA_BICIMI;
  surum: number;
  uygulama: string;
  kaydedilme: string;
  proje: Proje;
}

export interface ProjeOkumaSonucu {
  proje: Proje;
  /** v5 (biçimsiz ham JSON) dosyasından aktarıldı. */
  eskiSurumdenAktarildi: boolean;
  /** Kullanıcıya gösterilecek bilgiler (ör. ΔT onayı, standart dışı C). */
  uyarilar: string[];
}

export class ProjeDosyasiHatasi extends Error {
  override name = 'ProjeDosyasiHatasi';
}

const hata = (mesaj: string): never => {
  throw new ProjeDosyasiHatasi(mesaj);
};

const nesneMi = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const sayiMi = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

function metin(x: unknown, yer: string, varsayilan?: string): string {
  if (typeof x === 'string') return x.slice(0, 500);
  if (x === undefined && varsayilan !== undefined) return varsayilan;
  return hata(`${yer} metin olmalı.`);
}

function sayi(x: unknown, yer: string): number {
  return sayiMi(x) ? x : hata(`${yer} geçerli bir sayı olmalı.`);
}

function sayiYaDaBos(x: unknown, yer: string): number | null {
  if (x === null || x === undefined || x === '') return null;
  return sayi(x, yer);
}

function mantiksal(x: unknown, varsayilan: boolean): boolean {
  return typeof x === 'boolean' ? x : varsayilan;
}

function kimlik(x: unknown, yer: string, kullanilan: Set<string>): string {
  const id = metin(x, `${yer} kimliği`);
  if (!id) hata(`${yer} kimliği boş.`);
  if (kullanilan.has(id)) hata(`${yer} kimliği (${id}) birden fazla öğede kullanılmış.`);
  kullanilan.add(id);
  return id;
}

function nokta(x: unknown, yer: string): LatLng {
  if (!nesneMi(x)) return hata(`${yer} koordinat olmalı.`);
  const lat = sayi(x.lat, `${yer} enlemi`);
  const lng = sayi(x.lng, `${yer} boylamı`);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) hata(`${yer} koordinatı geçerli aralıkta değil.`);
  return { lat, lng };
}

function noktaListesi(x: unknown, yer: string): LatLng[] {
  if (!Array.isArray(x)) return hata(`${yer} köşe listesi olmalı.`);
  return x.map((n, i) => nokta(n, `${yer}, köşe ${i + 1}`));
}

function pozitifListe(x: unknown, varsayilan: number[]): number[] {
  if (!Array.isArray(x)) return varsayilan;
  const liste = [...new Set(x.filter((n): n is number => sayiMi(n) && n > 0))].sort((a, b) => a - b);
  return liste.length ? liste : varsayilan;
}

function c2Secimi(x: unknown): C2Secimi | null {
  if (!nesneMi(x)) return null;
  const yapi = MALZEMELER.find((m) => m === x.yapi);
  const cati = MALZEMELER.find((m) => m === x.cati);
  return yapi && cati ? { yapi, cati } : null;
}

function kotOku(x: unknown, i: number, kimlikler: Set<string>): KotSeviyesi {
  const yer = `Kot seviyesi #${i + 1}`;
  if (!nesneMi(x)) return hata(`${yer} geçersiz.`);
  return {
    id: kimlik(x.id, yer, kimlikler),
    isim: metin(x.isim, `${yer} adı`, ''),
    taban_kottan_yukseklik_m: sayi(x.taban_kottan_yukseklik_m, `${yer} yüksekliği`),
    aciklama: metin(x.aciklama, `${yer} açıklaması`, ''),
  };
}

function yapiOku(x: unknown, i: number, kimlikler: Set<string>): Yapi {
  if (!nesneMi(x)) return hata(`Yapı #${i + 1} geçersiz.`);
  const yer = `Yapı "${typeof x.isim === 'string' ? x.isim : i + 1}"`;
  const yapi: Yapi = {
    id: kimlik(x.id, yer, kimlikler),
    isim: metin(x.isim, `${yer} adı`, ''),
    tip: metin(x.tip, `${yer} tipi`, 'diger'),
    poligon: noktaListesi(x.poligon, yer),
    kot_seviyesi_id: metin(x.kot_seviyesi_id, `${yer} kot bağlantısı`, ''),
    H_m: sayiYaDaBos(x.H_m, `${yer} yüksekliği (H)`),
    L_m: sayiYaDaBos(x.L_m, `${yer} boyu (L)`),
    W_m: sayiYaDaBos(x.W_m, `${yer} eni (W)`),
    manuelBoyut: mantiksal(x.manuelBoyut, false),
    C1: sayiYaDaBos(x.C1, `${yer} C1`),
    C2: sayiYaDaBos(x.C2, `${yer} C2`),
    C3: sayiYaDaBos(x.C3, `${yer} C3`),
    C4: sayiYaDaBos(x.C4, `${yer} C4`),
    C5: sayiYaDaBos(x.C5, `${yer} C5`),
    C2_secim: c2Secimi(x.C2_secim),
    kritik_mi: mantiksal(x.kritik_mi, false),
    gorunur_mu: mantiksal(x.gorunur_mu, true),
  };
  return yapi;
}

function paratonerOku(x: unknown, i: number, kimlikler: Set<string>): Paratoner {
  if (!nesneMi(x)) return hata(`Paratoner #${i + 1} geçersiz.`);
  const yer = `Paratoner "${typeof x.isim === 'string' ? x.isim : i + 1}"`;
  const konum = nokta(x, yer);
  const yapiId = x.yapi_id === null || x.yapi_id === undefined || x.yapi_id === '' ? null : metin(x.yapi_id, `${yer} yapı bağlantısı`);
  const kotId = yapiId ? null : x.kot_seviyesi_id === null || x.kot_seviyesi_id === undefined ? null : metin(x.kot_seviyesi_id, `${yer} kot bağlantısı`);
  return {
    id: kimlik(x.id, yer, kimlikler),
    isim: metin(x.isim, `${yer} adı`, ''),
    lat: konum.lat,
    lng: konum.lng,
    kot_seviyesi_id: kotId,
    yapi_id: yapiId,
    mast_yuksekligi_m: sayi(x.mast_yuksekligi_m, `${yer} mast yüksekliği`),
    aktif_mi: mantiksal(x.aktif_mi, true),
    gorunur_mu: mantiksal(x.gorunur_mu, true),
    h_esikleri: pozitifListe(x.h_esikleri, [2, 3, 4, 5]),
    deltaT: sayiYaDaBos(x.deltaT, `${yer} ΔT`),
    cihaz: metin(x.cihaz, `${yer} cihaz bilgisi`, ''),
  };
}

function revizyonlarOku(x: unknown): Revizyon[] {
  if (x === undefined || x === null) return [];
  if (!Array.isArray(x)) return hata('Revizyon listesi geçersiz.');
  return x.slice(0, 50).map((r, i) => {
    const yer = `Revizyon #${i + 1}`;
    if (!nesneMi(r)) return hata(`${yer} geçersiz.`);
    return { no: metin(r.no, `${yer} numarası`, ''), tarih: metin(r.tarih, `${yer} tarihi`, ''), aciklama: metin(r.aciklama, `${yer} açıklaması`, '') };
  });
}

/** Ham proje nesnesini doğrular ve eksik alanları güvenli varsayılanlarla tamamlar. */
export function projeyiDogrulaVeTamamla(ham: unknown): Proje {
  if (!nesneMi(ham)) return hata('Dosya bir proje içermiyor.');
  for (const alan of ['kot_seviyeleri', 'yapilar', 'paratonerler'] as const) {
    if (!Array.isArray(ham[alan])) hata('Dosyada yapı, paratoner veya kot listesi yok; bir paratoner projesi değil.');
  }
  const kimlikler = new Set<string>();
  const deltaTModu: DeltaTModu = ham.deltaT_modu === 'paratoner' ? 'paratoner' : 'proje';
  const proje: Proje = {
    id: typeof ham.id === 'string' && ham.id ? ham.id : `proj_${Date.now().toString(36)}`,
    isim: metin(ham.isim, 'Proje adı', 'Proje'),
    olusturma_tarihi: metin(ham.olusturma_tarihi, 'Oluşturma tarihi', new Date().toISOString()),
    Nk: sayiYaDaBos(ham.Nk, 'Nk'),
    deltaT: sayiYaDaBos(ham.deltaT, 'Proje ΔT'),
    deltaT_modu: deltaTModu,
    tesis_adresi: metin(ham.tesis_adresi, 'Tesis adresi', ''),
    cihaz: metin(ham.cihaz, 'Cihaz bilgisi', ''),
    rapor_no: metin(ham.rapor_no, 'Rapor numarası', ''),
    revizyonlar: revizyonlarOku(ham.revizyonlar),
    h_esikleri_varsayilan: pozitifListe(ham.h_esikleri_varsayilan, [2, 3, 4, 5]),
    parsel_siniri: ham.parsel_siniri === null || ham.parsel_siniri === undefined ? null : noktaListesi(ham.parsel_siniri, 'Parsel sınırı'),
    kot_seviyeleri: (ham.kot_seviyeleri as unknown[]).map((k, i) => kotOku(k, i, kimlikler)),
    yapilar: (ham.yapilar as unknown[]).map((y, i) => yapiOku(y, i, kimlikler)),
    paratonerler: (ham.paratonerler as unknown[]).map((p, i) => paratonerOku(p, i, kimlikler)),
  };
  if (ham.deltaT_onay_gerekli === true) proje.deltaT_onay_gerekli = true;
  for (const alan of ['harita_merkez_lat', 'harita_merkez_lng', 'harita_zoom'] as const) {
    if (sayiMi(ham[alan])) proje[alan] = ham[alan];
  }
  // Yalnızca DXF çıktısı için: geçersizse projeyi açmayı engellemez, yok sayılır.
  if (nesneMi(ham.yerel_orijin)) {
    try {
      proje.yerel_orijin = nokta(ham.yerel_orijin, 'Yerel başlangıç noktası');
    } catch {
      // yok say
    }
  }
  return proje;
}

const C_ADLARI: readonly CAdi[] = ['C1', 'C2', 'C3', 'C4', 'C5'];

/** Projede standart dışı C değeri olan yapıların adları. */
export function standartDisiCYapilari(proje: Proje): string[] {
  return proje.yapilar.filter((y) => C_ADLARI.some((c) => sayiMi(y[c]) && !standartCMi(c, y[c] as number))).map((y) => y.isim);
}

/**
 * Proje dosyasını okur. Yeni biçimi (.ptproj) ve eski v5 ham JSON'unu tanır.
 * v5'ten aktarılan ve ΔT'si 60 µs olan projelerde ΔT onayı istenir.
 */
export function projeDosyasiOku(metinIcerik: string): ProjeOkumaSonucu {
  if (metinIcerik.length > PROJE_DOSYA_SINIRI) hata('Dosya bir proje dosyası için fazla büyük.');
  let ham: unknown;
  try {
    ham = JSON.parse(metinIcerik.replace(/^﻿/, ''));
  } catch {
    return hata('Dosya okunamadı: geçerli bir JSON değil.');
  }
  return projeVerisiOku(ham);
}

/** Ayrıştırılmış veriden (dosya ya da tarayıcı belleği) proje okur. */
export function projeVerisiOku(ham: unknown): ProjeOkumaSonucu {
  const uyarilar: string[] = [];
  let projeHam: unknown = ham;
  let eskiSurumdenAktarildi = false;

  if (nesneMi(ham) && ham.bicim === PROJE_DOSYA_BICIMI) {
    const surum = sayi(ham.surum, 'Dosya sürümü');
    if (surum > PROJE_DOSYA_SURUMU) hata('Bu dosya programın daha yeni bir sürümüyle kaydedilmiş. Programı güncelleyin.');
    projeHam = ham.proje;
  } else {
    eskiSurumdenAktarildi = true;
  }

  const proje = projeyiDogrulaVeTamamla(projeHam);

  if (eskiSurumdenAktarildi && proje.deltaT === 60) {
    proje.deltaT_onay_gerekli = true;
    uyarilar.push(
      'Bu proje programın eski sürümünden aktarıldı. Eski sürüm ΔT değerini kendiliğinden 60 µs olarak kaydediyordu; kullandığınız paratonerin ΔT değerini onaylayana kadar hesap yapılmaz.',
    );
  }
  const standartDisi = standartDisiCYapilari(proje);
  if (standartDisi.length) {
    uyarilar.push(`${standartDisi.join(', ')}: standart dışı C katsayısı var. Bu yapılar, katsayılar standart değerlerden yeniden seçilene kadar hesaplanmaz.`);
  }
  return { proje, eskiSurumdenAktarildi, uyarilar };
}

export function projeDosyasiNesnesi(proje: Proje, uygulama: string, simdi: Date = new Date()): ProjeDosyasi {
  return { bicim: PROJE_DOSYA_BICIMI, surum: PROJE_DOSYA_SURUMU, uygulama, kaydedilme: simdi.toISOString(), proje };
}

export function projeDosyasiYaz(proje: Proje, uygulama: string, simdi: Date = new Date()): string {
  return JSON.stringify(projeDosyasiNesnesi(proje, uygulama, simdi), null, 2);
}
