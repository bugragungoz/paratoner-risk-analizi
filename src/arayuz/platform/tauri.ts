// Masaüstü (Tauri) ve tarayıcı arasındaki farklar tek yerde.

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function tauriMi(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export interface KayitFiltresi {
  ad: string;
  uzantilar: string[];
}

/**
 * Dosya kaydeder. Masaüstünde kaydetme penceresi açar ve seçilen yolu döner (iptalde null).
 * Tarayıcıda indirme başlatır ve dosya adını döner.
 */
export async function dosyaKaydet(varsayilanAd: string, icerik: string | Uint8Array, filtre: KayitFiltresi): Promise<string | null> {
  if (tauriMi()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile, writeTextFile } = await import('@tauri-apps/plugin-fs');
    const yol = await save({ defaultPath: varsayilanAd, filters: [{ name: filtre.ad, extensions: filtre.uzantilar }] });
    if (!yol) return null;
    if (typeof icerik === 'string') await writeTextFile(yol, icerik);
    else await writeFile(yol, icerik);
    return yol;
  }
  indir(varsayilanAd, icerik);
  return varsayilanAd;
}

// ---------------------------------------------------------------- Proje dosyaları
// Masaüstünde diske yalnızca Rust komutlarıyla erişilir (uzantı, boyut ve yol orada denetlenir).

export interface SecilenDosya {
  /** Masaüstünde dosyanın tam yolu; tarayıcıda bilinmez (null). */
  yol: string | null;
  ad: string;
  icerik: string;
}

/** Yolun son parçası (Windows ve POSIX ayırıcıları). */
export function dosyaAdiAyikla(yol: string): string {
  return yol.split(/[\\/]/).pop() || yol;
}

/** Yolun klasör kısmı (sonda ayırıcıyla); klasör yoksa boş. */
export function klasorAyikla(yol: string): string {
  const i = Math.max(yol.lastIndexOf('\\'), yol.lastIndexOf('/'));
  return i >= 0 ? yol.slice(0, i + 1) : '';
}

export function tarayicidaDosyaSec(kabul: string): Promise<File | null> {
  return new Promise((coz) => {
    const girdi = document.createElement('input');
    girdi.type = 'file';
    girdi.accept = kabul;
    girdi.addEventListener('change', () => coz(girdi.files?.[0] ?? null), { once: true });
    girdi.addEventListener('cancel', () => coz(null), { once: true });
    girdi.click();
  });
}

/** Proje dosyası seçtirip okur; iptalde null. */
export async function projeDosyasiSec(boyutSiniri: number): Promise<SecilenDosya | null> {
  if (tauriMi()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const yol = await open({
      multiple: false,
      directory: false,
      filters: [
        { name: 'Paratoner projesi', extensions: ['ptproj', 'json'] },
        { name: 'Yeni biçim (.ptproj)', extensions: ['ptproj'] },
        { name: 'Eski sürüm (.json)', extensions: ['json'] },
      ],
    });
    if (typeof yol !== 'string') return null;
    return { yol, ad: dosyaAdiAyikla(yol), icerik: await projeDosyasiOku(yol) };
  }
  const dosya = await tarayicidaDosyaSec('.ptproj,.json,application/json');
  if (!dosya) return null;
  if (dosya.size > boyutSiniri) throw new Error('Dosya bir proje dosyası için fazla büyük.');
  return { yol: null, ad: dosya.name, icerik: await dosya.text() };
}

/** İçe aktarılacak Google Earth dosyası (.kml / .kmz) için üst sınır (bayt). Rust'taki KML_SINIRI ile aynı. */
export const KML_DOSYA_SINIRI = 30 * 1024 * 1024;

/** KML ya da KMZ dosyası seçtirip ham baytlarını okur; iptalde null. */
export async function kmlDosyasiSec(filtreAdi: string): Promise<{ ad: string; bayt: Uint8Array } | null> {
  if (tauriMi()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const yol = await open({ multiple: false, directory: false, filters: [{ name: filtreAdi, extensions: ['kml', 'kmz'] }] });
    if (typeof yol !== 'string') return null;
    const veri = await invoke<ArrayBuffer>('kml_dosyasi_oku', { yol });
    return { ad: dosyaAdiAyikla(yol), bayt: new Uint8Array(veri) };
  }
  const dosya = await tarayicidaDosyaSec('.kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz');
  if (!dosya) return null;
  if (dosya.size > KML_DOSYA_SINIRI) throw new Error('Dosya içe aktarmak için fazla büyük (en çok 30 MB).');
  return { ad: dosya.name, bayt: new Uint8Array(await dosya.arrayBuffer()) };
}

export async function projeDosyasiOku(yol: string): Promise<string> {
  return invoke<string>('proje_dosyasi_oku', { yol });
}

export async function projeDosyasiYaz(yol: string, icerik: string): Promise<void> {
  await invoke('proje_dosyasi_yaz', { yol, icerik });
}

/** Masaüstünde kaydetme penceresi açar; seçilen yolu döner (iptalde null). */
export async function kayitYeriSec(varsayilanYol: string, filtre: KayitFiltresi): Promise<string | null> {
  const { save } = await import('@tauri-apps/plugin-dialog');
  return save({ defaultPath: varsayilanYol, filters: [{ name: filtre.ad, extensions: filtre.uzantilar }] });
}

/** Tarayıcıda dosyayı indirir. */
export function indir(ad: string, icerik: string | Uint8Array): void {
  const blob = new Blob([icerik as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------- Otomatik kayıt (masaüstü)

export type OtomatikKayitKonumu = 'masaustu' | 'belgeler';

export interface OtomatikKayitBilgisi {
  yol: string;
  dosyaAdi: string;
  degistirilmeMs: number;
  boyut: number;
  yedek: boolean;
}

export async function otomatikKayitYaz(
  konum: OtomatikKayitKonumu,
  projeId: string,
  projeAdi: string,
  icerik: string,
  zamanEtiketi: string | null,
): Promise<{ yol: string; yedekYolu: string | null }> {
  return invoke('otomatik_kayit_yaz', { konum, projeId, projeAdi, icerik, zamanEtiketi });
}

export async function otomatikKayitlariListele(konum: OtomatikKayitKonumu): Promise<{ klasor: string; kayitlar: OtomatikKayitBilgisi[] }> {
  return invoke('otomatik_kayitlari_listele', { konum });
}

/** Bağlantıyı sistemin tarayıcısında açar. */
/** Program bir proje dosyasıyla açıldıysa yolu (yalnızca bir kez döner). */
export async function baslangicDosyasi(): Promise<string | null> {
  if (!tauriMi()) return null;
  try {
    return (await invoke<string | null>('baslangic_dosyasi')) ?? null;
  } catch {
    return null;
  }
}

/** Program zaten açıkken bir proje dosyasına çift tıklanınca gelen yol. */
export async function dosyaAcmaIstegiDinle(fn: (yol: string) => void): Promise<() => void> {
  if (!tauriMi()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  return listen<string>('proje-dosyasi-ac', (e) => fn(e.payload));
}

export async function disBaglantiAc(url: string): Promise<void> {
  if (tauriMi()) {
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
      return;
    } catch (e) {
      console.error('Bağlantı açılamadı:', e);
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Dosya adında sorun çıkarabilecek karakterleri temizler (Türkçe harfler korunur). */
export function guvenliDosyaAdi(ad: string, yedek = 'proje'): string {
  const temiz = (ad || '').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
  return temiz || yedek;
}

export const pencere = {
  async baslikAyarla(baslik: string) {
    document.title = baslik;
    if (tauriMi()) await getCurrentWindow().setTitle(baslik);
  },
  /**
   * Pencere kapatılmak istendiğinde `izinVer` sorulur; false dönerse kapanış iptal edilir.
   * (Başlık çubuğundaki ✕, Alt+F4 ve "Çıkış" aynı yoldan geçer.)
   */
  async kapanisiDinle(izinVer: () => Promise<boolean>): Promise<() => void> {
    if (!tauriMi()) return () => {};
    return getCurrentWindow().onCloseRequested(async (olay) => {
      if (!(await izinVer())) olay.preventDefault();
    });
  },
  async kucult() {
    if (tauriMi()) await getCurrentWindow().minimize();
  },
  async buyutGecis() {
    if (tauriMi()) await getCurrentWindow().toggleMaximize();
  },
  async kapat() {
    if (tauriMi()) await getCurrentWindow().close();
    else window.close();
  },
  async buyukMu(): Promise<boolean> {
    return tauriMi() ? getCurrentWindow().isMaximized() : false;
  },
  async boyutDegisince(fn: () => void): Promise<() => void> {
    if (!tauriMi()) return () => {};
    return getCurrentWindow().onResized(fn);
  },
  /** Çerçevesiz pencerede Windows görev çubuğu sorunu için tam ekranda dekorasyon açılır. */
  async tamEkranGecis(): Promise<void> {
    if (!tauriMi()) {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => {});
      else await document.exitFullscreen().catch(() => {});
      return;
    }
    const w = getCurrentWindow();
    if (await w.isFullscreen()) {
      await w.setFullscreen(false);
      await w.setDecorations(false);
    } else {
      await w.setDecorations(true);
      await w.setFullscreen(true);
    }
  },
  async tamEkrandanCik(): Promise<void> {
    if (!tauriMi()) return;
    const w = getCurrentWindow();
    if (await w.isFullscreen()) {
      await w.setFullscreen(false);
      await w.setDecorations(false);
    }
  },
};
