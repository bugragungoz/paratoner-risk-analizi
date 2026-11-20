// Türkçe sayı, yüzde, kot ve tarih biçimi (ondalık virgül; CSV ayracı noktalı virgül).

const sayi = (deger: number | null | undefined, basamak = 1): string =>
  deger === null || deger === undefined || Number.isNaN(deger) ? '-' : deger.toFixed(basamak).replace('.', ',');

export const bicimTr = {
  sayi,
  /** Kapsama oranı (0–1) → "%77" / "%99,9". Aşağı yuvarlanır: %99,96 "%100" görünüp yanıltmasın. */
  yuzde: (oran: number): string => {
    const d = Math.floor(oran * 1000) / 10;
    return `%${sayi(d, d % 1 === 0 ? 0 : 1)}`;
  },
  /** Kot: "+2,0", "−3,0" (eksi işareti U+2212), sıfır için "±0,0". */
  kot: (deger: number | null | undefined, basamak = 1): string => {
    if (deger === null || deger === undefined || Number.isNaN(deger)) return '-';
    const yuvarlak = Number(deger.toFixed(basamak));
    if (yuvarlak === 0) return `±${sayi(0, basamak)}`;
    return `${yuvarlak > 0 ? '+' : '−'}${sayi(Math.abs(deger), basamak)}`;
  },
  tarih: (t: Date): string => t.toLocaleDateString('tr-TR'),
  tarihSaat: (t: Date): string => t.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  /** Excel'in Türkçe ayarı noktalı virgül bekler. */
  csvAyrac: ';',
  evet: 'Evet',
  hayir: 'Hayır',
  /** Küçük harf karşılaştırması (ad tekrarı denetimi). */
  yerel: 'tr-TR',
};
