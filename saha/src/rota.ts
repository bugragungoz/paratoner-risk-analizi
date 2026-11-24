// Sayfa adresi (# kısmı): #/  #/k/<keşif>  #/k/<keşif>/p/<paratoner>. Geçmişte tutulduğu için
// Android geri tuşu önceki sayfaya döner.

export type Rota = { tur: 'liste' } | { tur: 'ayarlar' } | { tur: 'kesif'; id: string } | { tur: 'paratoner'; id: string; pid: string };

export function rotaCoz(hash: string): Rota {
  const p = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (p[0] === 'k' && p[1] && p[2] === 'p' && p[3]) return { tur: 'paratoner', id: p[1], pid: p[3] };
  if (p[0] === 'k' && p[1]) return { tur: 'kesif', id: p[1] };
  if (p[0] === 'ayarlar') return { tur: 'ayarlar' };
  return { tur: 'liste' };
}

export const rotaAdresi = (r: Rota): string =>
  r.tur === 'liste' ? '#/' : r.tur === 'ayarlar' ? '#/ayarlar' : r.tur === 'kesif' ? `#/k/${encodeURIComponent(r.id)}` : `#/k/${encodeURIComponent(r.id)}/p/${encodeURIComponent(r.pid)}`;
