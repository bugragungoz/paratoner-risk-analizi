// Harita servisleri: Rust tarafındaki komutların ince sarmalayıcıları. Anahtarlar Windows kimlik
// deposunda durur ve buraya hiç gelmez (yalnızca Street View gömme adresinde, Google'ın o servis
// için öngördüğü biçimde bulunur). Tarayıcıda (geliştirme) yalnızca OSM ve Nominatim çalışır.

import { invoke } from '@tauri-apps/api/core';
import { tauriMi } from '../platform/tauri';

export type Saglayici = 'google' | 'esri';
export interface AnahtarDurumu {
  google: boolean;
  esri: boolean;
}

export const ANAHTARSIZ: AnahtarDurumu = { google: false, esri: false };

export async function anahtarDurumu(): Promise<AnahtarDurumu> {
  if (!tauriMi()) return ANAHTARSIZ;
  try {
    return await invoke<AnahtarDurumu>('harita_anahtar_durumu');
  } catch {
    return ANAHTARSIZ;
  }
}

export const anahtarKaydet = (saglayici: Saglayici, anahtar: string) => invoke<void>('harita_anahtar_kaydet', { saglayici, anahtar });
export const anahtarSil = (saglayici: Saglayici) => invoke<void>('harita_anahtar_sil', { saglayici });
export const anahtarDene = (saglayici: Saglayici) => invoke<string>('harita_anahtar_dene', { saglayici });

export function googleTelif(katman: string, zoom: number, s: { kuzey: number; guney: number; dogu: number; bati: number }): Promise<string> {
  return invoke<string>('google_telif', { katman, zoom, ...s });
}

export const streetviewAdresi = (lat: number, lng: number) => invoke<string>('streetview_adresi', { lat, lng });

export interface YerOnerisi {
  yerId: string;
  ana: string;
  ikincil: string;
}

export function yerOneri(sorgu: string, oturum: string, merkez?: { lat: number; lng: number }): Promise<YerOnerisi[]> {
  return invoke<YerOnerisi[]>('yer_oneri', { sorgu, oturum, lat: merkez?.lat ?? null, lng: merkez?.lng ?? null });
}

export const yerAyrinti = (yerId: string, oturum: string) => invoke<{ lat: number; lng: number; adres: string }>('yer_ayrinti', { yerId, oturum });

export interface AramaSonucu {
  isim: string;
  lat: number;
  lng: number;
}

/** OpenStreetMap Nominatim (anahtar yokken; yalnızca Enter ile). */
export async function nominatimAra(sorgu: string): Promise<AramaSonucu[]> {
  if (tauriMi()) return invoke<AramaSonucu[]>('nominatim_ara', { sorgu });
  // Tarayıcıda geliştirme: doğrudan istek (tarayıcı kendi kimliğini ve adresini gönderir).
  const p = new URLSearchParams({ format: 'jsonv2', q: sorgu, limit: '8', 'accept-language': 'tr', countrycodes: 'tr' });
  const y = await fetch(`https://nominatim.openstreetmap.org/search?${p}`);
  if (!y.ok) return [];
  const v = (await y.json()) as { display_name: string; lat: string; lon: string }[];
  return v.map((s) => ({ isim: s.display_name, lat: Number(s.lat), lng: Number(s.lon) }));
}

/** Places oturum kimliği: önerilerden bir yer seçilene kadar aynı kalır. */
export const yeniOturum = () => crypto.randomUUID();
