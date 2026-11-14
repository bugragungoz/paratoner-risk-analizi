// Koordinat girişinin tanınması (arama kutusu).

/** "39.92, 32.85" ya da "39,92 32,85" biçimindeki koordinat girişini tanır. */
export function koordinatCoz(metin: string): { lat: number; lng: number } | null {
  const m = metin.trim().match(/^(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/);
  if (!m || !m[1] || !m[2]) return null;
  const lat = Number(m[1].replace(',', '.'));
  const lng = Number(m[2].replace(',', '.'));
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
