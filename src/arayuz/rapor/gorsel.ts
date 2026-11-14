// Rapor görselleri (logo, harita şekli, imza): ortak tür ve dönüştürme yardımcıları.

export interface RaporGorseli {
  veri: Uint8Array;
  tur: 'png' | 'jpg';
  genislik: number;
  yukseklik: number;
}

export interface RaporGorselleri {
  logo: RaporGorseli | null;
  harita: RaporGorseli | null;
  imza: RaporGorseli | null;
}

/** Seçilen dosyayı data URL olarak okur. */
export function dataUrlOku(dosya: File): Promise<string> {
  return new Promise((coz, red) => {
    const r = new FileReader();
    r.onload = () => coz(String(r.result));
    r.onerror = red;
    r.readAsDataURL(dosya);
  });
}

/** data:image/...;base64 URL'sini rapor görseline çevirir (boyutlarını okuyarak). */
export async function dataUrldenGorsel(dataUrl: string): Promise<RaporGorseli | null> {
  const eslesme = dataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/);
  if (!eslesme || !eslesme[1] || !eslesme[2]) return null;
  const ikili = atob(eslesme[2]);
  const veri = new Uint8Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) veri[i] = ikili.charCodeAt(i);
  const boyut = await new Promise<{ genislik: number; yukseklik: number }>((coz) => {
    const img = new Image();
    img.onload = () => coz({ genislik: img.naturalWidth, yukseklik: img.naturalHeight });
    img.onerror = () => coz({ genislik: 0, yukseklik: 0 });
    img.src = dataUrl;
  });
  return { veri, tur: eslesme[1] === 'png' ? 'png' : 'jpg', ...boyut };
}
