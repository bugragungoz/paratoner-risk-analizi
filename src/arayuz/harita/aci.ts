// AutoCAD renk dizini (ACI) → CSS rengi. 1–9 ve 250–255 sabit; 10–249 renk tonu (24 ton, 15°
// aralık) × parlaklık (1; 0,8; 0,6; 0,5; 0,3) × doygunluk (çift: tam, tek: yarım) düzeniyle üretilir.

const SABIT: Record<number, string> = {
  1: '#ff0000',
  2: '#ffff00',
  3: '#00ff00',
  4: '#00ffff',
  5: '#0000ff',
  6: '#ff00ff',
  8: '#808080',
  9: '#c0c0c0',
  250: '#333333',
  251: '#505050',
  252: '#696969',
  253: '#828282',
  254: '#bebebe',
  255: '#ffffff',
};

function hsv(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return `#${[f(5), f(3), f(1)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/** ACI rengi; 7 (beyaz/siyah) zemine göre seçilir. */
export function aciRengi(aci: number, koyuZemin: boolean): string {
  if (aci === 7 || aci < 1 || aci > 255) return koyuZemin ? '#ffffff' : '#111111';
  const sabit = SABIT[aci];
  if (sabit) return sabit;
  const ton = (Math.floor(aci / 10) - 1) * 15;
  const parlaklik = [1, 1, 0.8, 0.8, 0.6, 0.6, 0.5, 0.5, 0.3, 0.3][aci % 10]!;
  return hsv(ton, aci % 2 === 0 ? 1 : 0.5, parlaklik);
}
