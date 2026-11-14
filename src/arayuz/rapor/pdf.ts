// PDF raporu üretimi (tarayıcı/masaüstü): pdfmake ve gömülü Carlito yazı tipi yalnızca gerektiğinde yüklenir.

import carlitoNormal from '@expo-google-fonts/carlito/400Regular/Carlito_400Regular.ttf?url';
import carlitoKalin from '@expo-google-fonts/carlito/700Bold/Carlito_700Bold.ttf?url';
import carlitoItalik from '@expo-google-fonts/carlito/400Regular_Italic/Carlito_400Regular_Italic.ttf?url';
import type { RaporIcerigi } from '../../core';
import type { RaporGorselleri } from './gorsel';
import { PDF_YAZI_DOSYALARI, PDF_YAZI_TIPI, pdfTanimi } from './pdfTanimi';

interface PdfMake {
  addVirtualFileSystem(vfs: Record<string, string>): void;
  addFonts(fonts: Record<string, Record<string, string>>): void;
  createPdf(tanim: Record<string, unknown>): { getBuffer(): Promise<Uint8Array> };
}

let hazir: Promise<PdfMake> | null = null;

async function base64Oku(url: string): Promise<string> {
  const veri = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let s = '';
  for (let i = 0; i < veri.length; i += 0x8000) s += String.fromCharCode(...veri.subarray(i, i + 0x8000));
  return btoa(s);
}

function pdfmakeHazirla(): Promise<PdfMake> {
  hazir ??= (async () => {
    const modul = (await import('pdfmake/build/pdfmake')) as unknown as { default?: PdfMake } & PdfMake;
    const pdfMake = modul.default ?? modul;
    const [n, k, i] = await Promise.all([carlitoNormal, carlitoKalin, carlitoItalik].map(base64Oku));
    pdfMake.addVirtualFileSystem({
      [PDF_YAZI_DOSYALARI.normal]: n as string,
      [PDF_YAZI_DOSYALARI.bold]: k as string,
      [PDF_YAZI_DOSYALARI.italics]: i as string,
    });
    pdfMake.addFonts({ [PDF_YAZI_TIPI]: { ...PDF_YAZI_DOSYALARI } });
    return pdfMake;
  })();
  hazir.catch(() => (hazir = null));
  return hazir;
}

export async function pdfBaytlari(r: RaporIcerigi, gorseller: RaporGorselleri): Promise<Uint8Array> {
  const pdfMake = await pdfmakeHazirla();
  return new Uint8Array(await pdfMake.createPdf(pdfTanimi(r, gorseller)).getBuffer());
}
