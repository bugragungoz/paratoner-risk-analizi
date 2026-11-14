// Kot zinciri: paratoner ucunun ve yapı çatısının mutlak kotu, ve aralarındaki h farkı.

import type { Paratoner, Proje, Yapi } from './tipler';

type KotKaynagi = Pick<Proje, 'kot_seviyeleri' | 'yapilar'>;

/**
 * Kot toplamları mikrometreye yuvarlanır. Yuvarlanmazsa ikili kayan nokta yüzünden
 * (0,3 + 2) − 0,3 = 1,9999999999999998 çıkar ve tam 2 m'lik bir direk "h < 2 m" sayılıp
 * reddedilir; aynı sorun h = 60 m sınırında da görülür.
 */
export function kotYuvarla(deger: number): number {
  return Math.round(deger * 1e6) / 1e6;
}

/** Paratonerin taban kotu: bağlı olduğu kot seviyesi ya da üzerinde durduğu yapının çatısı. */
export function paratonerTabanKotu(
  paratoner: Pick<Paratoner, 'yapi_id' | 'kot_seviyesi_id'>,
  proje: KotKaynagi,
): number | null {
  if (paratoner.yapi_id) {
    const yapi = proje.yapilar.find((y) => y.id === paratoner.yapi_id);
    if (!yapi) return null;
    return yapiTepeKotu(yapi, proje);
  }
  const kot = proje.kot_seviyeleri.find((k) => k.id === paratoner.kot_seviyesi_id);
  return kot ? kot.taban_kottan_yukseklik_m : null;
}

/** Paratoner ucunun mutlak kotu (mast dahil). */
export function paratonerTepeKotu(
  paratoner: Pick<Paratoner, 'yapi_id' | 'kot_seviyesi_id' | 'mast_yuksekligi_m'>,
  proje: KotKaynagi,
): number | null {
  const taban = paratonerTabanKotu(paratoner, proje);
  if (taban === null) return null;
  return kotYuvarla(taban + paratoner.mast_yuksekligi_m);
}

/** Yapı çatısının mutlak kotu. */
export function yapiTepeKotu(yapi: Pick<Yapi, 'kot_seviyesi_id' | 'H_m'>, proje: Pick<Proje, 'kot_seviyeleri'>): number | null {
  const kot = proje.kot_seviyeleri.find((k) => k.id === yapi.kot_seviyesi_id);
  if (!kot || yapi.H_m === null || yapi.H_m === undefined) return null;
  return kotYuvarla(kot.taban_kottan_yukseklik_m + yapi.H_m);
}

/** h: paratoner ucunun, korunan yapının çatı düzleminden yüksekliği. Negatifse yapı daha yüksektir. */
export function gercekHHesapla(
  paratoner: Pick<Paratoner, 'yapi_id' | 'kot_seviyesi_id' | 'mast_yuksekligi_m'>,
  yapi: Pick<Yapi, 'kot_seviyesi_id' | 'H_m'>,
  proje: KotKaynagi,
): number | null {
  const prTepe = paratonerTepeKotu(paratoner, proje);
  const ypTepe = yapiTepeKotu(yapi, proje);
  if (prTepe === null || ypTepe === null) return null;
  return kotYuvarla(prTepe - ypTepe);
}
