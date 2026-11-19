// Uygulama düzeyindeki ayarlar (projeden bağımsız; bu bilgisayarda saklanır).

import { dilMi, type Dil } from '../../dil';
import type { KatmanAdi } from '../harita/katmanlar';
import type { OtomatikKayitKonumu } from '../platform/tauri';
import { ornekProfiller, profilleriOku, type CProfili } from './cProfilleri';

/** Raporu hazırlayan mühendis (bütün projeler için). */
export interface MuhendisBilgisi {
  ad: string;
  unvan: string;
  /** EMO sicil numarası. */
  sicilNo: string;
  /** İmza görseli (data:image/png|jpeg;base64,…); yoksa raporda boş imza alanı bırakılır. */
  imza: string | null;
}

/** İmza görseli için üst sınır (data URL uzunluğu). */
export const IMZA_SINIRI = 400_000;

export interface UygulamaAyarlari {
  /** 'sistem': Windows'un açık/koyu ayarını izler. */
  tema: 'dark' | 'light' | 'sistem';
  katman: KatmanAdi;
  /** Masaüstü uygulamada projenin otomatik kaydı. */
  otomatikKayit: boolean;
  /** Otomatik kayıt klasörünün bulunduğu yer. */
  otomatikKayitKonumu: OtomatikKayitKonumu;
  /** Rapor kapağında kullanılacak firma/kurum adı. */
  firmaAdi: string;
  muhendis: MuhendisBilgisi;
  /** Haritada yapı kapsamasını (yeşil/kırmızı) göster. */
  kapsamaGoster: boolean;
  /** Yapı formunda seçilebilen, kullanıcının tanımladığı risk katsayısı profilleri. */
  cProfilleri: CProfili[];
  /** Kullanıcının onayladığı kullanım koşulları sürümü (yasal.ts KOSUL_SURUMU); onay yoksa null. */
  kosullarKabul: string | null;
  /** Arayüz dili. */
  dil: Dil;
}

const ANAHTAR = 'paratoner_ayarlar';

export const VARSAYILAN_AYARLAR: UygulamaAyarlari = {
  tema: 'dark',
  katman: 'google_uydu',
  otomatikKayit: true,
  otomatikKayitKonumu: 'masaustu',
  firmaAdi: '',
  muhendis: { ad: '', unvan: '', sicilNo: '', imza: null },
  kapsamaGoster: true,
  cProfilleri: ornekProfiller(),
  kosullarKabul: null,
  dil: 'tr',
};

const metinMi = (x: unknown): x is string => typeof x === 'string';

function muhendisOku(x: unknown): MuhendisBilgisi {
  const m = typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};
  const imza = metinMi(m.imza) && /^data:image\/(png|jpeg);base64,/.test(m.imza) && m.imza.length <= IMZA_SINIRI ? m.imza : null;
  return { ad: metinMi(m.ad) ? m.ad : '', unvan: metinMi(m.unvan) ? m.unvan : '', sicilNo: metinMi(m.sicilNo) ? m.sicilNo : '', imza };
}

export function ayarlariYukle(): UygulamaAyarlari {
  try {
    const kayit = JSON.parse(localStorage.getItem(ANAHTAR) ?? '{}') as Partial<UygulamaAyarlari>;
    const eskiTema = localStorage.getItem('paratoner_tema');
    const ayarlar: UygulamaAyarlari = { ...VARSAYILAN_AYARLAR, ...(eskiTema === 'light' || eskiTema === 'dark' ? { tema: eskiTema } : {}), ...kayit };
    if (!['dark', 'light', 'sistem'].includes(ayarlar.tema)) ayarlar.tema = 'dark';
    if (ayarlar.otomatikKayitKonumu !== 'masaustu' && ayarlar.otomatikKayitKonumu !== 'belgeler') ayarlar.otomatikKayitKonumu = 'masaustu';
    ayarlar.muhendis = muhendisOku(kayit.muhendis);
    ayarlar.cProfilleri = profilleriOku(kayit.cProfilleri);
    ayarlar.kosullarKabul = metinMi(kayit.kosullarKabul) ? kayit.kosullarKabul : null;
    ayarlar.dil = dilMi(kayit.dil) ? kayit.dil : 'tr';
    return ayarlar;
  } catch {
    return { ...VARSAYILAN_AYARLAR, cProfilleri: ornekProfiller() };
  }
}

/** Ayardaki temanın şu an uygulanacak hali. */
export function etkinTema(tema: UygulamaAyarlari['tema']): 'dark' | 'light' {
  if (tema !== 'sistem') return tema;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ayarlariKaydet(ayarlar: UygulamaAyarlari): void {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(ayarlar));
  } catch {
    // Depolama kapalı olabilir; ayarlar bu oturumda geçerli kalır.
  }
}
