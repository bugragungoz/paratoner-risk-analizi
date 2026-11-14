// Sayı biçimlendirme (Türkçe ondalık virgül).

export function sayi(deger: number | null | undefined, basamak = 1): string {
  if (deger === null || deger === undefined || Number.isNaN(deger)) return '-';
  return deger.toFixed(basamak).replace('.', ',');
}

/** Kapsama oranı (0–1) → "%77" / "%99,9". Aşağı yuvarlanır: %99,96 "%100" görünüp yanıltmasın. */
export function yuzde(oran: number): string {
  const d = Math.floor(oran * 1000) / 10;
  return `%${sayi(d, d % 1 === 0 ? 0 : 1)}`;
}

/** Kot gösterimi: "+2,0", "−3,0" (eksi işareti U+2212), sıfır için "±0,0". */
export function kotMetni(deger: number | null | undefined, basamak = 1): string {
  if (deger === null || deger === undefined || Number.isNaN(deger)) return '-';
  const yuvarlak = Number(deger.toFixed(basamak));
  if (yuvarlak === 0) return `±${sayi(0, basamak)}`;
  return `${yuvarlak > 0 ? '+' : '−'}${sayi(Math.abs(deger), basamak)}`;
}

export const SEVIYE_NUMARASI = { I: 1, II: 2, III: 3, IV: 4 } as const;
