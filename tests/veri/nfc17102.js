// NF C 17-102:2011 koruma yarıçapı formülü — yalnızca testlerde çapraz kontrol için.
// Rp(h) = sqrt(2rh − h² + ΔL(2r + ΔL)),  h ≥ 5 m
// Rp(h) = h · Rp(5) / 5,                 2 ≤ h < 5 m
// h ≥ r için tepe değeri r + ΔL; ΔL (m) = ΔT (µs) × 1 m/µs; h < 2 m için tanımsız.

export const KURE_YARICAPI = { I: 20, II: 30, III: 45, IV: 60 };

export function rpFormul(h, seviye, deltaT) {
  const r = KURE_YARICAPI[seviye];
  const dL = deltaT;
  if (!(h >= 2)) return null;
  const f = (x) => (x >= r ? r + dL : Math.sqrt(2 * r * x - x * x + dL * (2 * r + dL)));
  return h < 5 ? (h * f(5)) / 5 : f(h);
}
