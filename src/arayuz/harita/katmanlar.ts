// Harita katmanları. Masaüstünde bütün karolar Rust'taki karo vekilinden (karo://) gelir:
// Google Map Tiles API ve Esri World Imagery kullanıcının kendi anahtarıyla, OpenStreetMap
// anahtarsız. Toplu/önceden indirme yoktur; sağlayıcıların kuralları buna izin vermiyor.

import type { TileLayerOptions } from 'leaflet';
import { tauriMi } from '../platform/tauri';
import type { AnahtarDurumu, Saglayici } from './servisler';

export type KatmanAdi = 'google_uydu' | 'google_hibrit' | 'google_yol' | 'esri_uydu' | 'osm';

export interface KatmanTanimi {
  isim: string;
  saglayici: Saglayici | null;
  /** Sabit atıf metni (Google'da görünen alana göre telif metni ayrıca eklenir). */
  atif: string;
  options: TileLayerOptions;
}

export const KATMANLAR: Record<KatmanAdi, KatmanTanimi> = {
  google_uydu: { isim: 'Google uydu', saglayici: 'google', atif: 'Google Maps', options: { maxNativeZoom: 21, maxZoom: 22 } },
  google_hibrit: { isim: 'Google hibrit', saglayici: 'google', atif: 'Google Maps', options: { maxNativeZoom: 21, maxZoom: 22 } },
  google_yol: { isim: 'Google yol', saglayici: 'google', atif: 'Google Maps', options: { maxNativeZoom: 21, maxZoom: 22 } },
  esri_uydu: {
    isim: 'Esri uydu',
    saglayici: 'esri',
    atif: 'Powered by Esri · Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    options: { maxNativeZoom: 19, maxZoom: 22 },
  },
  osm: { isim: 'OpenStreetMap', saglayici: null, atif: '© OpenStreetMap katkıda bulunanlar', options: { maxNativeZoom: 19, maxZoom: 22 } },
};

export const KATMAN_ADLARI = Object.keys(KATMANLAR) as KatmanAdi[];

export function katmanTanimi(ad: string): KatmanTanimi {
  return KATMANLAR[ad as KatmanAdi] ?? KATMANLAR.osm;
}

/** Katman kullanılabilir mi: anahtarlı katmanlar yalnızca masaüstünde ve anahtar girilmişse. */
export function katmanKullanilabilir(ad: KatmanAdi, anahtarlar: AnahtarDurumu): boolean {
  const s = KATMANLAR[ad].saglayici;
  return s === null || (tauriMi() && anahtarlar[s]);
}

/** Seçili katman kullanılamıyorsa (anahtar yok) OpenStreetMap gösterilir. */
export function etkinKatman(ad: string, anahtarlar: AnahtarDurumu): KatmanAdi {
  const k = (KATMAN_ADLARI as string[]).includes(ad) ? (ad as KatmanAdi) : 'osm';
  return katmanKullanilabilir(k, anahtarlar) ? k : 'osm';
}

export function karoAdresi(ad: KatmanAdi): string {
  if (tauriMi()) return `http://karo.localhost/${ad}/{z}/{x}/{y}`;
  return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
}
