// Telefonla ilgili işler: dosya paylaşma/kaydetme (paylas eklentisi), Google Haritalar'ı açma, pano.
// Tarayıcıda (geliştirme) karşılıkları: dosya indirme, yeni sekme, tarayıcı panosu.

import { invoke } from '@tauri-apps/api/core';

export const tauriMi = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const KML_TURU = 'application/vnd.google-earth.kml+xml';

interface DosyaIstegi {
  dosyaAdi: string;
  icerik: string;
  mime: string;
  baslik?: string;
}

function indir(i: DosyaIstegi) {
  const url = URL.createObjectURL(new Blob([i.icerik], { type: i.mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = i.dosyaAdi;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Android paylaşma penceresini açar (WhatsApp, e-posta, Drive …). */
export async function paylas(istek: DosyaIstegi): Promise<void> {
  if (!tauriMi()) return indir(istek);
  await invoke('plugin:paylas|paylas', { istek });
}

/** "Farklı kaydet" penceresiyle telefona kaydeder; kullanıcı vazgeçerse false. */
export async function telefonaKaydet(istek: DosyaIstegi): Promise<boolean> {
  if (!tauriMi()) {
    indir(istek);
    return true;
  }
  const sonuc = await invoke<{ kaydedildi?: boolean }>('plugin:paylas|kaydet', { istek });
  return !!sonuc?.kaydedildi;
}

/** Noktayı Google Haritalar'da (uygulama yüklüyse onda) açar. */
export async function haritadaAc(lat: number, lng: number): Promise<void> {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(7)},${lng.toFixed(7)}`;
  if (!tauriMi()) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  await openUrl(url);
}

export async function panodanOku(): Promise<string> {
  if (tauriMi()) {
    const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
    return (await readText()) ?? '';
  }
  return navigator.clipboard?.readText ? navigator.clipboard.readText() : '';
}

/** Bağlantıyı tarayıcıda açar (izinli adresler: capabilities/default.json). */
export async function baglantiAc(url: string): Promise<void> {
  if (!tauriMi()) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  await openUrl(url);
}
