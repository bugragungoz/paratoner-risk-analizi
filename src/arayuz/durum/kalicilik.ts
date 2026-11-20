// Projenin saklanması: çalışma oturumu (tarayıcı belleği), proje dosyaları (.ptproj),
// eski sürümden aktarım ve son açılan dosyalar.

import { get, set } from 'idb-keyval';
import { PROJE_UZANTISI, projeDosyasiNesnesi, projeDosyasiOku, projeDosyasiYaz, projeVerisiOku, type Proje, type ProjeOkumaSonucu } from '../../core';
import { guvenliDosyaAdi } from '../platform/tauri';
import type { Metinler } from '../../dil';
import { tr as TR } from '../../dil/tr';

export const UYGULAMA = `Paratoner Risk Analizi ${__UYGULAMA_SURUMU__}`;

/** Çalışma oturumu (son açık proje) bu anahtarda tutulur. */
export const OTURUM_ANAHTARI = 'paratoner_proje_v2';
/**
 * Eski sürümün (v5) tarayıcı belleği anahtarı. Yalnızca ilk açılışta projeyi aktarmak için
 * OKUNUR, asla yazılmaz: bilgisayarda eski sürüm de kurulu kalabilir.
 */
export const ESKI_OTURUM_ANAHTARI = 'paratoner_app_aktif_proje';

/** Açılan bir projenin dosyayla ilişkisi. */
export interface ProjeKaynagi {
  /** Kaydet'in yazacağı .ptproj dosyası; yoksa Kaydet, Farklı kaydet gibi davranır. */
  dosyaYolu: string | null;
  /** Gösterilecek dosya adı (tarayıcıda yol bilinmez, yalnızca ad). */
  dosyaAdi: string | null;
  /** Proje, kaynağındaki halinden farklı mı (kurtarılan kayıt, aktarılan oturum…). */
  kaydedilmemis: boolean;
}

export interface AcilanProje extends ProjeOkumaSonucu, ProjeKaynagi {}

interface OturumKaydi extends ProjeKaynagi {
  surum: 1;
  /** Proje dosya biçimiyle aynı zarf; okurken aynı doğrulamadan geçer. */
  dosya: unknown;
}

const hataMetni = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const ptprojMu = (yol: string) => yol.toLowerCase().endsWith(`.${PROJE_UZANTISI}`);

export function onerilenDosyaAdi(proje: Proje): string {
  return `${guvenliDosyaAdi(proje.isim)}.${PROJE_UZANTISI}`;
}

export function kayitIcerigi(proje: Proje, simdi?: Date): string {
  return projeDosyasiYaz(proje, UYGULAMA, simdi);
}

/**
 * Seçilen dosyanın içeriğini projeye çevirir.
 * Kaydet yalnızca yeni biçimdeki .ptproj dosyasının üzerine yazar; eski sürümün .json dosyası
 * eski programla açılabilsin diye korunur (ilk Kaydet, yeni dosya ister).
 */
export function dosyaIceriginiAc(icerik: string, yol: string | null, ad: string, kurtarma = false, m: Metinler = TR): AcilanProje {
  const okuma = projeDosyasiOku(icerik, m);
  const yeniBicim = !okuma.eskiSurumdenAktarildi && yol !== null && ptprojMu(yol);
  return {
    ...okuma,
    dosyaYolu: yeniBicim && !kurtarma ? yol : null,
    dosyaAdi: kurtarma ? null : ad,
    kaydedilmemis: kurtarma,
  };
}

// ---------------------------------------------------------------- Çalışma oturumu

export async function oturumKaydet(proje: Proje, kaynak: ProjeKaynagi): Promise<void> {
  const kayit: OturumKaydi = { surum: 1, dosya: projeDosyasiNesnesi(proje, UYGULAMA), ...kaynak };
  try {
    await set(OTURUM_ANAHTARI, kayit);
  } catch (e) {
    console.error('Çalışma oturumu kaydedilemedi:', e);
  }
}

export interface OturumYuklemeSonucu {
  acilan: AcilanProje | null;
  /** Oturum okunamadıysa kullanıcıya gösterilecek açıklama. */
  hata: string | null;
}

/** Son çalışma oturumunu yükler; yoksa eski sürümün oturumunu aktarır. */
export async function oturumYukle(m: Metinler = TR): Promise<OturumYuklemeSonucu> {
  let hata: string | null = null;
  try {
    const kayit = (await get(OTURUM_ANAHTARI)) as OturumKaydi | undefined;
    if (kayit && typeof kayit === 'object' && 'dosya' in kayit) {
      const okuma = projeVerisiOku(kayit.dosya, m);
      return {
        acilan: { ...okuma, dosyaYolu: kayit.dosyaYolu ?? null, dosyaAdi: kayit.dosyaAdi ?? null, kaydedilmemis: kayit.kaydedilmemis !== false },
        hata: null,
      };
    }
  } catch (e) {
    hata = m.dosyaIslem.oturumOkunamadi(hataMetni(e));
  }
  if (hata) return { acilan: null, hata };

  try {
    const eski = (await get(ESKI_OTURUM_ANAHTARI)) ?? JSON.parse(localStorage.getItem(ESKI_OTURUM_ANAHTARI) ?? 'null');
    if (eski) {
      const okuma = projeVerisiOku(eski, m);
      return { acilan: { ...okuma, dosyaYolu: null, dosyaAdi: null, kaydedilmemis: true }, hata: null };
    }
  } catch (e) {
    return { acilan: null, hata: m.dosyaIslem.eskiAktarilamadi(hataMetni(e)) };
  }
  return { acilan: null, hata: null };
}

// ---------------------------------------------------------------- Son dosyalar (masaüstü)

export interface SonDosya {
  yol: string;
  ad: string;
  /** Son açılma/kaydetme zamanı (ms). */
  zaman: number;
}

const SON_DOSYALAR_ANAHTARI = 'paratoner_son_dosyalar';
export const SON_DOSYA_SINIRI = 8;

/** Dosyayı listenin başına alır; aynı yol (Windows'ta büyük/küçük harf duyarsız) tekrarlanmaz. */
export function sonDosyaEkle(liste: SonDosya[], yeni: SonDosya, sinir = SON_DOSYA_SINIRI): SonDosya[] {
  const anahtar = yeni.yol.toLowerCase();
  return [yeni, ...liste.filter((d) => d.yol.toLowerCase() !== anahtar)].slice(0, sinir);
}

export function sonDosyaCikar(liste: SonDosya[], yol: string): SonDosya[] {
  return liste.filter((d) => d.yol.toLowerCase() !== yol.toLowerCase());
}

export function sonDosyalariOku(): SonDosya[] {
  try {
    const ham: unknown = JSON.parse(localStorage.getItem(SON_DOSYALAR_ANAHTARI) ?? '[]');
    if (!Array.isArray(ham)) return [];
    return ham
      .filter((d): d is SonDosya => !!d && typeof d.yol === 'string' && typeof d.ad === 'string' && typeof d.zaman === 'number')
      .slice(0, SON_DOSYA_SINIRI);
  } catch {
    return [];
  }
}

export function sonDosyalariYaz(liste: SonDosya[]): void {
  try {
    localStorage.setItem(SON_DOSYALAR_ANAHTARI, JSON.stringify(liste));
  } catch {
    // Depolama kapalı olabilir; liste bu oturumda geçerli kalır.
  }
}

// ---------------------------------------------------------------- Otomatik kayıt

/** Yedek dosya adındaki yerel zaman: "2026-10-25 14-30-05". */
export function zamanEtiketi(t: Date = new Date()): string {
  const iki = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${iki(t.getMonth() + 1)}-${iki(t.getDate())} ${iki(t.getHours())}-${iki(t.getMinutes())}-${iki(t.getSeconds())}`;
}

/** Aynı proje için iki yedek arasındaki en kısa süre. */
export const YEDEK_ARALIGI_MS = 10 * 60 * 1000;
