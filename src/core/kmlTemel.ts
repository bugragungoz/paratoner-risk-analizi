// KML yazımının ortak parçaları: masaüstü KML çıktısı (kml.ts) ve saha uygulamasının keşif çıktısı
// (sahaKml.ts) aynı şemayı aynı biçimde yazsın. Bağımlılığı yoktur; saha uygulamasına da girer.

/** Paratoner KML şemasının sürümü (bkz. kml.ts başındaki alan listesi). */
export const KML_SEMA_SURUMU = 1;

export type KmlAlanlari = Record<string, string | number | null | undefined>;

export const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Sayıyı KML'e yazılacak biçimde (ondalık nokta, en fazla 6 basamak) verir. */
export function kmlSayi(x: number): string {
  return String(Number(x.toFixed(6)));
}

/** <ExtendedData>: boş alanlar yazılmaz; sayılar ondalık noktayla. */
export function veri(alanlar: KmlAlanlari): string {
  const satirlar = Object.entries(alanlar)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `<Data name="${k}"><value>${xml(typeof v === 'number' ? kmlSayi(v) : String(v))}</value></Data>`);
  return satirlar.length ? `<ExtendedData>${satirlar.join('')}</ExtendedData>` : '';
}

/** Google Earth açıklamayı HTML olarak gösterir: satırlar <br> ile ayrılır, metin önce HTML'e göre kaçırılır. */
export const aciklama = (satirlar: string[]) => `<description>${xml(satirlar.map(xml).join('<br>'))}</description>`;

/** '#rrggbb' → KML rengi 'aabbggrr'. */
export function kmlRengi(hex: string, saydamlik = 'ff'): string {
  const h = hex.replace('#', '');
  return `${saydamlik}${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toLowerCase();
}
