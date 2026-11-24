// Uygulama ayarları (telefonda saklanır). Kayıt yoksa ya da bozuksa varsayılanlar kullanılır.

import { sistemDili, type Dil } from './dil';
import type { KonumModu } from './konum';

export type Tema = 'sistem' | 'koyu' | 'acik';

export interface SahaAyarlari {
  dil: Dil;
  tema: Tema;
  konumModu: KonumModu;
  /** "Paratoner ekle" konumu da hemen alır. */
  otomatikKonum: boolean;
  /** Yeni noktaların ad ön eki; boşsa dilin varsayılanı ("Paratoner"). */
  onEk: string;
  /** Yeni noktalara önceden yazılan mast yüksekliği (m). */
  varsayilanMast: number | null;
  /** İlk açılış ekranı geçildi. */
  kurulumTamam: boolean;
}

const ANAHTAR = 'kesif_ayarlar_v1';
/** İlk deneme sürümünün dil kaydı (yalnızca okunur). */
const ESKI_DIL = 'paratoner_saha_dil';

export function varsayilanAyarlar(): SahaAyarlari {
  return { dil: sistemDili(), tema: 'sistem', konumModu: 'hizli', otomatikKonum: true, onEk: '', varsayilanMast: null, kurulumTamam: false };
}

export function ayarlariOku(): SahaAyarlari {
  const v = varsayilanAyarlar();
  try {
    const eskiDil = localStorage.getItem(ESKI_DIL);
    if (eskiDil === 'tr' || eskiDil === 'en') v.dil = eskiDil;
    const k = JSON.parse(localStorage.getItem(ANAHTAR) ?? '{}') as Record<string, unknown>;
    return {
      dil: k.dil === 'tr' || k.dil === 'en' ? k.dil : v.dil,
      tema: k.tema === 'koyu' || k.tema === 'acik' || k.tema === 'sistem' ? k.tema : v.tema,
      konumModu: k.konumModu === 'hassas' ? 'hassas' : 'hizli',
      otomatikKonum: typeof k.otomatikKonum === 'boolean' ? k.otomatikKonum : v.otomatikKonum,
      onEk: typeof k.onEk === 'string' ? k.onEk.slice(0, 40) : '',
      varsayilanMast: typeof k.varsayilanMast === 'number' && Number.isFinite(k.varsayilanMast) && k.varsayilanMast > 0 ? k.varsayilanMast : null,
      // Eski sürümde keşif açılmışsa kurulum ekranı yeniden gösterilmez.
      kurulumTamam: k.kurulumTamam === true || localStorage.getItem('paratoner_saha_kesifler_v1') !== null,
    };
  } catch {
    return v;
  }
}

export function ayarlariYaz(a: SahaAyarlari): void {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(a));
  } catch {
    // depolama kapalı; ayarlar bu oturumda geçerli
  }
}
