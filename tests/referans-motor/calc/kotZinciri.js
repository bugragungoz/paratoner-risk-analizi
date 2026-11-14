// Bu uygulama Buğra Güngöz tarafından hazırlanmıştır.
// GitHub: https://github.com/bugragungoz

// Paratoner ve yapıların MUTLAK tepe kotunu çözümler (kot seviyesi
// zincirinden ya da "bir yapının üzerinde" bağından) ve h farkını
// hesaplar.

/**
 * Bir paratonerin taban kotunu bulur: ya doğrudan bir KotSeviyesi'ne
 * bağlıdır, ya da bir Yapı'nın üzerindedir (o zaman yapının kendi
 * tepe kotu taban alınır).
 *
 * @param {object} paratoner
 * @param {object} proje
 * @returns {number|null} taban_kotu (m, proje referansına göre)
 */
export function paratonerTabanKotu(paratoner, proje) {
  if (paratoner.yapi_id) {
    const yapi = proje.yapilar.find((y) => y.id === paratoner.yapi_id);
    if (!yapi) return null;
    const yapiKot = proje.kot_seviyeleri.find((k) => k.id === yapi.kot_seviyesi_id);
    if (!yapiKot) return null;
    return yapiKot.taban_kottan_yukseklik_m + yapi.H_m;
  }
  const kot = proje.kot_seviyeleri.find((k) => k.id === paratoner.kot_seviyesi_id);
  return kot ? kot.taban_kottan_yukseklik_m : null;
}

/**
 * Paratonerin mutlak tepe kotu (mast dahil).
 */
export function paratonerTepeKotu(paratoner, proje) {
  const taban = paratonerTabanKotu(paratoner, proje);
  if (taban === null) return null;
  return taban + paratoner.mast_yuksekligi_m;
}

/**
 * Bir yapının mutlak tepe kotu (çatı).
 */
export function yapiTepeKotu(yapi, proje) {
  const kot = proje.kot_seviyeleri.find((k) => k.id === yapi.kot_seviyesi_id);
  if (!kot) return null;
  return kot.taban_kottan_yukseklik_m + yapi.H_m;
}

/**
 * Paratoner-yapı çifti için gerçek h (paratonerin, yapının çatı
 * düzleminden itibaren yüksekliği).
 * @returns {number|null} negatifse yapı paratonerden yüksektedir
 */
export function gercekHHesapla(paratoner, yapi, proje) {
  const prTepe = paratonerTepeKotu(paratoner, proje);
  const ypTepe = yapiTepeKotu(yapi, proje);
  if (prTepe === null || ypTepe === null) return null;
  return prTepe - ypTepe;
}

