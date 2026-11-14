// Yeni proje/öğe oluşturma ve girdi yardımcıları.

import { c2Degeri } from './sabitler';
import type { C2Secimi, KotSeviyesi, LatLng, Paratoner, Proje, Yapi } from './tipler';

function uid(onek: string): string {
  return `${onek}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Yeni proje. Nk ve ΔT bilerek boş bırakılır: kullanıcı seçmeden hesap başlamaz (M2). */
export function yeniProje(isim = 'Yeni Proje'): Proje {
  return {
    id: uid('proj'),
    isim,
    olusturma_tarihi: new Date().toISOString(),
    harita_merkez_lat: 39.0,
    harita_merkez_lng: 35.2,
    harita_zoom: 6,
    Nk: null,
    deltaT: null,
    deltaT_modu: 'proje',
    tesis_adresi: '',
    cihaz: '',
    rapor_no: '',
    revizyonlar: [],
    h_esikleri_varsayilan: [2, 3, 4, 5],
    parsel_siniri: null,
    kot_seviyeleri: [],
    paratonerler: [],
    yapilar: [],
  };
}

export function yeniKotSeviyesi(isim: string, yukseklik: number, aciklama = ''): KotSeviyesi {
  return { id: uid('kot'), isim, taban_kottan_yukseklik_m: yukseklik, aciklama };
}

export interface YeniParatonerGirdisi {
  isim: string;
  lat: number;
  lng: number;
  kot_seviyesi_id?: string | null;
  yapi_id?: string | null;
  mast_yuksekligi_m: number;
  h_esikleri?: number[];
  deltaT?: number | null;
  cihaz?: string;
}

export function yeniParatoner(g: YeniParatonerGirdisi): Paratoner {
  return {
    id: uid('pr'),
    isim: g.isim,
    lat: g.lat,
    lng: g.lng,
    kot_seviyesi_id: g.yapi_id ? null : (g.kot_seviyesi_id ?? null),
    yapi_id: g.yapi_id ?? null,
    mast_yuksekligi_m: g.mast_yuksekligi_m,
    aktif_mi: true,
    gorunur_mu: true,
    h_esikleri: g.h_esikleri && g.h_esikleri.length ? g.h_esikleri : [2, 3, 4, 5],
    deltaT: g.deltaT ?? null,
    cihaz: g.cihaz ?? '',
  };
}

/** Poligonun kaba en/boy tahmini (bilgi amaçlı; Ae hesabı poligondan yapılır). */
export function poligondenLW(poligon: LatLng[]): { L: number; W: number } {
  if (!poligon || poligon.length < 3) return { L: 0, W: 0 };
  const lats = poligon.map((n) => n.lat);
  const lngs = poligon.map((n) => n.lng);
  const latOrtalama = (Math.min(...lats) + Math.max(...lats)) / 2;
  const metrePerDegLat = 111320;
  const metrePerDegLng = 111320 * Math.cos((latOrtalama * Math.PI) / 180);
  const L = (Math.max(...lats) - Math.min(...lats)) * metrePerDegLat;
  const W = (Math.max(...lngs) - Math.min(...lngs)) * metrePerDegLng;
  return { L: Math.round(L * 10) / 10, W: Math.round(W * 10) / 10 };
}

export interface YeniYapiGirdisi {
  isim: string;
  poligon: LatLng[];
  kot_seviyesi_id: string;
  H_m: number | null;
  tip?: string;
  manuelBoyut?: boolean;
  L_m?: number | null;
  W_m?: number | null;
  C1?: number | null;
  C2_secim?: C2Secimi | null;
  C2?: number | null;
  C3?: number | null;
  C4?: number | null;
  C5?: number | null;
}

export function yeniYapi(g: YeniYapiGirdisi): Yapi {
  const otomatik = poligondenLW(g.poligon);
  const C2 = g.C2_secim ? c2Degeri(g.C2_secim) : (g.C2 ?? null);
  return {
    id: uid('yp'),
    isim: g.isim,
    tip: g.tip ?? 'diger',
    poligon: g.poligon,
    kot_seviyesi_id: g.kot_seviyesi_id,
    H_m: g.H_m,
    L_m: g.L_m ?? otomatik.L,
    W_m: g.W_m ?? otomatik.W,
    manuelBoyut: g.manuelBoyut ?? false,
    C1: g.C1 ?? null,
    C2,
    C2_secim: g.C2_secim ?? null,
    C3: g.C3 ?? null,
    C4: g.C4 ?? null,
    C5: g.C5 ?? null,
    kritik_mi: false,
    gorunur_mu: true,
  };
}

/**
 * Türkçe ondalık girişini sayıya çevirir: "3,5" → 3.5, " 12.25 " → 12.25.
 * Geçersizse null döner (M11: v5'te "3,5" virgülden ikiye bölünüyordu).
 */
export function ondalikSayi(metin: string | number | null | undefined): number | null {
  if (typeof metin === 'number') return Number.isFinite(metin) ? metin : null;
  if (metin === null || metin === undefined) return null;
  const temiz = String(metin).trim().replace(/\s/g, '');
  if (!temiz) return null;
  const normal = temiz.includes(',') && !temiz.includes('.') ? temiz.replace(',', '.') : temiz;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(normal)) return null;
  const sayi = Number(normal);
  return Number.isFinite(sayi) ? sayi : null;
}

export interface BagimliOgeler {
  yapilar: Yapi[];
  paratonerler: Paratoner[];
}

/**
 * Bir kot seviyesine ya da yapıya bağlı öğeler. Silmeden önce kontrol edilir (M12):
 * boş değilse silme engellenir ya da kullanıcıya bağımlı öğeler gösterilir.
 */
export function bagimliOgeler(proje: Proje, hedef: { kotId: string } | { yapiId: string }): BagimliOgeler {
  if ('kotId' in hedef) {
    return {
      yapilar: proje.yapilar.filter((y) => y.kot_seviyesi_id === hedef.kotId),
      paratonerler: proje.paratonerler.filter((p) => !p.yapi_id && p.kot_seviyesi_id === hedef.kotId),
    };
  }
  return { yapilar: [], paratonerler: proje.paratonerler.filter((p) => p.yapi_id === hedef.yapiId) };
}
