// KML / KMZ dosya içeriği: KMZ, içinde KML bulunan bir zip arşividir (Google Earth varsayılan olarak
// KMZ kaydeder). Arşivde önce "doc.kml", yoksa ada göre ilk .kml dosyası okunur.

import JSZip from 'jszip';
import { tr as TR } from '../../dil/tr';

export class KmzBosHatasi extends Error {
  constructor() {
    super(TR.kml.kmzBos);
  }
}

export async function kmlMetni(bayt: Uint8Array): Promise<string> {
  const zipMi = bayt[0] === 0x50 && bayt[1] === 0x4b; // "PK"
  if (!zipMi) return new TextDecoder('utf-8').decode(bayt);
  const zip = await JSZip.loadAsync(bayt);
  const kmller = Object.values(zip.files)
    .filter((f) => !f.dir && f.name.toLowerCase().endsWith('.kml'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const dosya = kmller.find((f) => f.name.toLowerCase() === 'doc.kml') ?? kmller[0];
  if (!dosya) throw new KmzBosHatasi();
  return (await dosya.async('string')).replace(/^\uFEFF/, '');
}
