// Proje dosya biçimi (.ptproj): doğrulama, eski (v5) projelerden aktarım ve yazma.
//
// Bozuk veya eksik bir dosya, hangi alanın hatalı olduğu söylenerek REDDEDİLİR; mühendislik
// verisinde sessizce öğe atıp devam etmek yanlış sonuca götürebilir.

import type { Metinler } from '../dil';
import { tr as TR } from '../dil/tr';
import type { AltlikAyari, AltlikHizalamasi } from './altlik';
import { TUREF_DILIMLERI, type TurefDilimi } from './koordinat';
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

function mantiksal(x: unknown, varsayilan: boolean): boolean {
  return typeof x === 'boolean' ? x : varsayilan;
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

type DosyaMetinleri = Metinler['dosya'];

/** Alan denetleyicileri; hata mesajları `d` sözlüğünün dilindedir. */
function denetleyiciler(d: DosyaMetinleri) {
  function metin(x: unknown, yer: string, varsayilan?: string): string {
    if (typeof x === 'string') return x.slice(0, 500);
    if (x === undefined && varsayilan !== undefined) return varsayilan;
    return hata(d.metinOlmali(yer));
  }
  function sayi(x: unknown, yer: string): number {
    return sayiMi(x) ? x : hata(d.sayiOlmali(yer));
  }
  function sayiYaDaBos(x: unknown, yer: string): number | null {
    if (x === null || x === undefined || x === '') return null;
    return sayi(x, yer);
  }
  function kimlik(x: unknown, yer: string, kullanilan: Set<string>): string {
    const id = metin(x, d.kimligi(yer));
    if (!id) hata(d.kimlikBos(yer));
    if (kullanilan.has(id)) hata(d.kimlikTekrar(yer, id));
    kullanilan.add(id);
    return id;
  }
  function nokta(x: unknown, yer: string): LatLng {
    if (!nesneMi(x)) return hata(d.koordinatOlmali(yer));
    const lat = sayi(x.lat, d.enlemi(yer));
    const lng = sayi(x.lng, d.boylami(yer));
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) hata(d.koordinatAralikDisi(yer));
    return { lat, lng };
  }
  function noktaListesi(x: unknown, yer: string): LatLng[] {
    if (!Array.isArray(x)) return hata(d.koseListesiOlmali(yer));
    return x.map((n, i) => nokta(n, d.kose(yer, i + 1)));
  }
  return { d, metin, sayi, sayiYaDaBos, kimlik, nokta, noktaListesi };
}

type Denetleyiciler = ReturnType<typeof denetleyiciler>;

function kotOku(o: Denetleyiciler, x: unknown, i: number, kimlikler: Set<string>): KotSeviyesi {
  const { d } = o;
  const yer = d.kotNo(i + 1);
  if (!nesneMi(x)) return hata(d.gecersiz(yer));
  return {
    id: o.kimlik(x.id, yer, kimlikler),
    isim: o.metin(x.isim, d.adi(yer), ''),
    taban_kottan_yukseklik_m: o.sayi(x.taban_kottan_yukseklik_m, d.yuksekligi(yer)),
    aciklama: o.metin(x.aciklama, d.aciklamasi(yer), ''),
  };
}

function yapiOku(o: Denetleyiciler, x: unknown, i: number, kimlikler: Set<string>): Yapi {
  const { d } = o;
  if (!nesneMi(x)) return hata(d.gecersiz(d.yapiNo(i + 1)));
  const yer = d.yapi(typeof x.isim === 'string' ? x.isim : String(i + 1));
  const yapi: Yapi = {
    id: o.kimlik(x.id, yer, kimlikler),
    isim: o.metin(x.isim, d.adi(yer), ''),
    tip: o.metin(x.tip, d.tipi(yer), 'diger'),
    poligon: o.noktaListesi(x.poligon, yer),
    kot_seviyesi_id: o.metin(x.kot_seviyesi_id, d.kotBaglantisi(yer), ''),
    H_m: o.sayiYaDaBos(x.H_m, d.yukseklikH(yer)),
    L_m: o.sayiYaDaBos(x.L_m, d.boyuL(yer)),
    W_m: o.sayiYaDaBos(x.W_m, d.eniW(yer)),
    manuelBoyut: mantiksal(x.manuelBoyut, false),
    C1: o.sayiYaDaBos(x.C1, `${yer} C1`),
    C2: o.sayiYaDaBos(x.C2, `${yer} C2`),
    C3: o.sayiYaDaBos(x.C3, `${yer} C3`),
    C4: o.sayiYaDaBos(x.C4, `${yer} C4`),
    C5: o.sayiYaDaBos(x.C5, `${yer} C5`),
    C2_secim: c2Secimi(x.C2_secim),
    kritik_mi: mantiksal(x.kritik_mi, false),
    gorunur_mu: mantiksal(x.gorunur_mu, true),
  };
  return yapi;
}

function paratonerOku(o: Denetleyiciler, x: unknown, i: number, kimlikler: Set<string>): Paratoner {
  const { d } = o;
  if (!nesneMi(x)) return hata(d.gecersiz(d.paratonerNo(i + 1)));
  const yer = d.paratoner(typeof x.isim === 'string' ? x.isim : String(i + 1));
  const konum = o.nokta(x, yer);
  const yapiId = x.yapi_id === null || x.yapi_id === undefined || x.yapi_id === '' ? null : o.metin(x.yapi_id, d.yapiBaglantisi(yer));
  const kotId = yapiId ? null : x.kot_seviyesi_id === null || x.kot_seviyesi_id === undefined ? null : o.metin(x.kot_seviyesi_id, d.kotBaglantisi(yer));
  return {
    id: o.kimlik(x.id, yer, kimlikler),
    isim: o.metin(x.isim, d.adi(yer), ''),
    lat: konum.lat,
    lng: konum.lng,
    kot_seviyesi_id: kotId,
    yapi_id: yapiId,
    mast_yuksekligi_m: o.sayi(x.mast_yuksekligi_m, d.mastYuksekligi(yer)),
    aktif_mi: mantiksal(x.aktif_mi, true),
    gorunur_mu: mantiksal(x.gorunur_mu, true),
    h_esikleri: pozitifListe(x.h_esikleri, [2, 3, 4, 5]),
    deltaT: o.sayiYaDaBos(x.deltaT, `${yer} ΔT`),
    cihaz: o.metin(x.cihaz, d.cihazBilgisi(yer), ''),
  };
}

function revizyonlarOku(o: Denetleyiciler, x: unknown): Revizyon[] {
  const { d } = o;
  if (x === undefined || x === null) return [];
  if (!Array.isArray(x)) return hata(d.revizyonListesi);
  return x.slice(0, 50).map((r, i) => {
    const yer = d.revizyonNo(i + 1);
    if (!nesneMi(r)) return hata(d.gecersiz(yer));
    return { no: o.metin(r.no, d.numarasi(yer), ''), tarih: o.metin(r.tarih, d.tarihi(yer), ''), aciklama: o.metin(r.aciklama, d.aciklamasi(yer), '') };
  });
}

/** Altlık ayarı (yalnızca görsel): geçersizse yok sayılır, projeyi açmayı engellemez. */
function altlikOku(x: unknown): AltlikAyari | null {
  if (!nesneMi(x) || !nesneMi(x.hizalama)) return null;
  const h = x.hizalama;
  const sayilar = (...a: unknown[]) => a.every((v) => typeof v === 'number' && Number.isFinite(v));
  let hizalama: AltlikHizalamasi;
  if (h.tur === 'turef' && (TUREF_DILIMLERI as readonly unknown[]).includes(h.dilim)) hizalama = { tur: 'turef', dilim: h.dilim as TurefDilimi };
  else if (h.tur === 'benzerlik' && nesneMi(h.orijin) && sayilar(h.orijin.lat, h.orijin.lng, h.aci, h.olcek, h.tx, h.ty) && (h.olcek as number) > 0) {
    hizalama = { tur: 'benzerlik', orijin: { lat: h.orijin.lat as number, lng: h.orijin.lng as number }, aci: h.aci as number, olcek: h.olcek as number, tx: h.tx as number, ty: h.ty as number };
  } else return null;
  if (!sayilar(x.birim) || (x.birim as number) <= 0) return null;
  return {
    yol: typeof x.yol === 'string' && x.yol ? x.yol : null,
    ad: typeof x.ad === 'string' ? x.ad : 'altlık.dxf',
    birim: x.birim as number,
    hizalama,
    gizliKatmanlar: Array.isArray(x.gizliKatmanlar) ? x.gizliKatmanlar.filter((k): k is string => typeof k === 'string') : [],
    opaklik: sayilar(x.opaklik) ? Math.min(1, Math.max(0.05, x.opaklik as number)) : 0.8,
    gorunur: x.gorunur !== false,
    renk: x.renk === 'tek' ? 'tek' : 'katman',
    ...(typeof x.tekRenk === 'string' && /^#[0-9a-f]{6}$/i.test(x.tekRenk) ? { tekRenk: x.tekRenk } : {}),
    ...(x.kilitli === true ? { kilitli: true } : {}),
  };
}

/** Ham proje nesnesini doğrular ve eksik alanları güvenli varsayılanlarla tamamlar. Hata mesajları `m` dilindedir. */
export function projeyiDogrulaVeTamamla(ham: unknown, m: Metinler = TR): Proje {
  const d = m.dosya;
  const o = denetleyiciler(d);
  if (!nesneMi(ham)) return hata(d.projeYok);
  for (const alan of ['kot_seviyeleri', 'yapilar', 'paratonerler'] as const) {
    if (!Array.isArray(ham[alan])) hata(d.listeYok);
  }
  const kimlikler = new Set<string>();
  const deltaTModu: DeltaTModu = ham.deltaT_modu === 'paratoner' ? 'paratoner' : 'proje';
  const proje: Proje = {
    id: typeof ham.id === 'string' && ham.id ? ham.id : `proj_${Date.now().toString(36)}`,
    isim: o.metin(ham.isim, d.projeAdi, d.varsayilanProjeAdi),
    olusturma_tarihi: o.metin(ham.olusturma_tarihi, d.olusturmaTarihi, new Date().toISOString()),
    Nk: o.sayiYaDaBos(ham.Nk, 'Nk'),
    deltaT: o.sayiYaDaBos(ham.deltaT, d.projeDeltaT),
    deltaT_modu: deltaTModu,
    tesis_adresi: o.metin(ham.tesis_adresi, d.tesisAdresi, ''),
    cihaz: o.metin(ham.cihaz, d.cihaz, ''),
    rapor_no: o.metin(ham.rapor_no, d.raporNumarasi, ''),
    revizyonlar: revizyonlarOku(o, ham.revizyonlar),
    h_esikleri_varsayilan: pozitifListe(ham.h_esikleri_varsayilan, [2, 3, 4, 5]),
    parsel_siniri: ham.parsel_siniri === null || ham.parsel_siniri === undefined ? null : o.noktaListesi(ham.parsel_siniri, d.parselSiniri),
    kot_seviyeleri: (ham.kot_seviyeleri as unknown[]).map((k, i) => kotOku(o, k, i, kimlikler)),
    yapilar: (ham.yapilar as unknown[]).map((y, i) => yapiOku(o, y, i, kimlikler)),
    paratonerler: (ham.paratonerler as unknown[]).map((p, i) => paratonerOku(o, p, i, kimlikler)),
  };
  if (ham.deltaT_onay_gerekli === true) proje.deltaT_onay_gerekli = true;
  for (const alan of ['harita_merkez_lat', 'harita_merkez_lng', 'harita_zoom'] as const) {
    if (sayiMi(ham[alan])) proje[alan] = ham[alan];
  }
  const altlik = altlikOku(ham.altlik);
  if (altlik) proje.altlik = altlik;
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
export function projeDosyasiOku(metinIcerik: string, m: Metinler = TR): ProjeOkumaSonucu {
  if (metinIcerik.length > PROJE_DOSYA_SINIRI) hata(m.dosya.cokBuyuk);
  let ham: unknown;
  try {
    ham = JSON.parse(metinIcerik.replace(/^﻿/, ''));
  } catch {
    return hata(m.dosya.jsonDegil);
  }
  return projeVerisiOku(ham, m);
}

/** Ayrıştırılmış veriden (dosya ya da tarayıcı belleği) proje okur. */
export function projeVerisiOku(ham: unknown, m: Metinler = TR): ProjeOkumaSonucu {
  const d = m.dosya;
  const uyarilar: string[] = [];
  let projeHam: unknown = ham;
  let eskiSurumdenAktarildi = false;

  if (nesneMi(ham) && ham.bicim === PROJE_DOSYA_BICIMI) {
    const surum = denetleyiciler(d).sayi(ham.surum, d.dosyaSurumu);
    if (surum > PROJE_DOSYA_SURUMU) hata(d.yeniSurum);
    projeHam = ham.proje;
  } else {
    eskiSurumdenAktarildi = true;
  }

  const proje = projeyiDogrulaVeTamamla(projeHam, m);

  if (eskiSurumdenAktarildi && proje.deltaT === 60) {
    proje.deltaT_onay_gerekli = true;
    uyarilar.push(d.eskiSurumDeltaT);
  }
  const standartDisi = standartDisiCYapilari(proje);
  if (standartDisi.length) uyarilar.push(d.standartDisiC(standartDisi.join(', ')));
  return { proje, eskiSurumdenAktarildi, uyarilar };
}

export function projeDosyasiNesnesi(proje: Proje, uygulama: string, simdi: Date = new Date()): ProjeDosyasi {
  return { bicim: PROJE_DOSYA_BICIMI, surum: PROJE_DOSYA_SURUMU, uygulama, kaydedilme: simdi.toISOString(), proje };
}

export function projeDosyasiYaz(proje: Proje, uygulama: string, simdi: Date = new Date()): string {
  return JSON.stringify(projeDosyasiNesnesi(proje, uygulama, simdi), null, 2);
}
