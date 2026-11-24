// Projeyi değiştiren işlemler: her biri saf bir (Proje → Proje) dönüşümü üretir.

import { bagimliOgeler, type AltlikAyari, type DeltaTModu, type KotSeviyesi, type LatLng, type Paratoner, type Proje, type Revizyon, type Yapi } from '../../core';

type Donusum = (p: Proje) => Proje;

const degistir = <T extends { id: string }>(liste: T[], id: string, fn: (o: T) => T): T[] =>
  liste.map((o) => (o.id === id ? fn(o) : o));

export const projeAdi = (isim: string): Donusum => (p) => ({ ...p, isim });
export const nkAyarla = (Nk: number | null): Donusum => (p) => ({ ...p, Nk });
/** ΔT seçmek, eski sürümden gelen projedeki ΔT onayını da tamamlar. */
export const deltaTAyarla = (deltaT: number | null): Donusum => (p) => {
  const { deltaT_onay_gerekli: _onay, ...geri } = p;
  return deltaT === null ? { ...p, deltaT } : { ...geri, deltaT };
};
export const deltaTModuAyarla = (deltaT_modu: DeltaTModu): Donusum => (p) => ({ ...p, deltaT_modu });
export const hEsikleriAyarla = (h_esikleri_varsayilan: number[]): Donusum => (p) => ({ ...p, h_esikleri_varsayilan });
export const tesisAdresiAyarla = (tesis_adresi: string): Donusum => (p) => ({ ...p, tesis_adresi });
export const cihazAyarla = (cihaz: string): Donusum => (p) => ({ ...p, cihaz });
export const raporNoAyarla = (rapor_no: string): Donusum => (p) => ({ ...p, rapor_no });
export const revizyonlarAyarla = (revizyonlar: Revizyon[]): Donusum => (p) => ({ ...p, revizyonlar });
export const parselAyarla = (parsel_siniri: LatLng[] | null): Donusum => (p) => ({ ...p, parsel_siniri });
/** Altlık ekler, değiştirir (kısmi) ya da kaldırır (null). */
export const altlikAyarla = (altlik: AltlikAyari | null): Donusum => (p) => ({ ...p, altlik });
export const altlikGuncelle = (d: Partial<AltlikAyari>): Donusum => (p) => (p.altlik ? { ...p, altlik: { ...p.altlik, ...d } } : p);

// ---------------------------------------------------------------- Kot seviyeleri

export const kotEkle = (kot: KotSeviyesi): Donusum => (p) => ({ ...p, kot_seviyeleri: [...p.kot_seviyeleri, kot] });
export const kotDuzenle = (id: string, degisiklik: Partial<KotSeviyesi>): Donusum => (p) => ({
  ...p,
  kot_seviyeleri: degistir(p.kot_seviyeleri, id, (k) => ({ ...k, ...degisiklik })),
});

/** Kullanımdaki bir kot seviyesi silinemez (M12); çağıran önce `kotSilinebilirMi` ile kontrol eder. */
export function kotSilinebilirMi(proje: Proje, id: string): { silinebilir: boolean; bagimlilar: string[] } {
  const b = bagimliOgeler(proje, { kotId: id });
  const bagimlilar = [...b.yapilar.map((y) => y.isim), ...b.paratonerler.map((pr) => pr.isim)];
  return { silinebilir: bagimlilar.length === 0, bagimlilar };
}
export const kotSil = (id: string): Donusum => (p) =>
  kotSilinebilirMi(p, id).silinebilir ? { ...p, kot_seviyeleri: p.kot_seviyeleri.filter((k) => k.id !== id) } : p;

// ---------------------------------------------------------------- Paratonerler

export const paratonerEkle = (pr: Paratoner): Donusum => (p) => ({ ...p, paratonerler: [...p.paratonerler, pr] });
export const paratonerGuncelle = (id: string, degisiklik: Partial<Paratoner>): Donusum => (p) => ({
  ...p,
  paratonerler: degistir(p.paratonerler, id, (pr) => ({ ...pr, ...degisiklik })),
});
export const paratonerSil = (id: string): Donusum => (p) => ({ ...p, paratonerler: p.paratonerler.filter((pr) => pr.id !== id) });
export const paratonerTasi = (id: string, konum: LatLng): Donusum => paratonerGuncelle(id, { lat: konum.lat, lng: konum.lng });
/** Yalnızca görsel: haritada göster/gizle. Hesabı etkilemez. */
export const paratonerGorunurlukGecis = (id: string): Donusum => (p) => ({
  ...p,
  paratonerler: degistir(p.paratonerler, id, (pr) => ({ ...pr, gorunur_mu: pr.gorunur_mu === false })),
});
/** Devre dışı bırakılan paratoner hiçbir hesaba girmez. */
export const paratonerEtkinlikGecis = (id: string): Donusum => (p) => ({
  ...p,
  paratonerler: degistir(p.paratonerler, id, (pr) => ({ ...pr, aktif_mi: pr.aktif_mi === false })),
});

// ---------------------------------------------------------------- Yapılar

export const yapiEkle = (yapi: Yapi): Donusum => (p) => ({ ...p, yapilar: [...p.yapilar, yapi] });
export const yapiGuncelle = (id: string, degisiklik: Partial<Yapi>): Donusum => (p) => ({
  ...p,
  yapilar: degistir(p.yapilar, id, (y) => ({ ...y, ...degisiklik })),
});
export const poligonGuncelle = (id: string, poligon: LatLng[]): Donusum => yapiGuncelle(id, { poligon });
export const yapiGorunurlukGecis = (id: string): Donusum => (p) => ({
  ...p,
  yapilar: degistir(p.yapilar, id, (y) => ({ ...y, gorunur_mu: y.gorunur_mu === false })),
});

/** Yapıyı ve üzerinde duran paratonerleri birlikte siler (yetim paratoner bırakmaz — M12). */
export const yapiSil = (id: string): Donusum => (p) => ({
  ...p,
  yapilar: p.yapilar.filter((y) => y.id !== id),
  paratonerler: p.paratonerler.filter((pr) => pr.yapi_id !== id),
});
