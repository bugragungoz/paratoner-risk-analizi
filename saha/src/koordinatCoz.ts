// Yapıştırılan koordinatın tanınması. Kabul edilenler:
//   "39.920812, 32.854198"      (Google Haritalar'da basılı tutunca kopyalanan biçim)
//   "39,920812 32,854198"       (ondalık virgül; boşluk ya da ; ile ayrılmış)
//   39°55'14.9"N 32°51'15.1"E  (derece-dakika-saniye; K/D, G/B harfleri de olur)
//   Google Haritalar bağlantıları: …@39.92,32.85,17z  …!3d39.92!4d32.85  …?q=39.92,32.85  …query=…

export interface Koordinat {
  lat: number;
  lng: number;
}

const gecerli = (lat: number, lng: number): Koordinat | null =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0) ? { lat, lng } : null;

function baglantidan(s: string): Koordinat | null {
  const desen = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // yer kartının gerçek konumu (önce bakılır)
    /[?&](?:q|query|ll|destination|daddr|center)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  ];
  for (const d of desen) {
    const m = s.match(d);
    if (m?.[1] && m[2]) return gecerli(Number(m[1]), Number(m[2]));
  }
  return null;
}

function dmsden(s: string): Koordinat | null {
  const parca = /(\d{1,3})\s*°\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*['′’]\s*)?(?:(\d{1,2}(?:[.,]\d+)?)\s*(?:"|″|''|”)\s*)?([NSEWKGDB])/gi;
  const degerler: { deger: number; yon: string }[] = [];
  for (const m of s.matchAll(parca)) {
    const d = Number(m[1]);
    const dk = Number((m[2] ?? '0').replace(',', '.'));
    const sn = Number((m[3] ?? '0').replace(',', '.'));
    const yon = (m[4] ?? '').toUpperCase();
    const isaret = yon === 'S' || yon === 'W' || yon === 'G' || yon === 'B' ? -1 : 1;
    degerler.push({ deger: isaret * (d + dk / 60 + sn / 3600), yon });
  }
  if (degerler.length !== 2) return null;
  const enlemMi = (y: string) => y === 'N' || y === 'S' || y === 'K' || y === 'G';
  const [a, b] = degerler as [(typeof degerler)[0], (typeof degerler)[0]];
  if (enlemMi(a.yon) && !enlemMi(b.yon)) return gecerli(a.deger, b.deger);
  if (!enlemMi(a.yon) && enlemMi(b.yon)) return gecerli(b.deger, a.deger);
  return null;
}

function ondaliktan(s: string): Koordinat | null {
  // Nokta ondalıklı: virgül, noktalı virgül ya da boşluk ayırır.
  let m = s.match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (m?.[1] && m[2]) return gecerli(Number(m[1]), Number(m[2]));
  // Virgül ondalıklı: boşluk, noktalı virgül ya da "virgül + boşluk" ayırır.
  m = s.match(/^(-?\d{1,3},\d+)\s*(?:;|\s|,\s)\s*(-?\d{1,3},\d+)$/);
  if (m?.[1] && m[2]) return gecerli(Number(m[1].replace(',', '.')), Number(m[2].replace(',', '.')));
  return null;
}

export function koordinatCoz(metin: string): Koordinat | null {
  const s = metin.trim().replace(/\s+/g, ' ');
  if (!s) return null;
  if (/https?:\/\/|geo:/i.test(s)) return baglantidan(s);
  return ondaliktan(s) ?? dmsden(s);
}
