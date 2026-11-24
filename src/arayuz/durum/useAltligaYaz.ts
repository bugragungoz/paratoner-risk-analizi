// Paratonerleri altlık DXF'ine yazma: altlık dosyası okunur, paratonerler çizimin kendi
// koordinatlarında PT_PARATONER katmanına eklenir ve sonuç asıl çizimin yanına yeni adla kaydedilir
// (kullanıcı kaydetme penceresinde aynı adı seçerse üzerine yazılır). Plandaki hiçbir şey değişmez.

import { useCallback, useState } from 'react';
import { altlikParatonerCizimi, dxfeEkle } from '../../core';
import { useEtkilesim } from '../ortak/Etkilesim';
import { useMetinler } from '../ortak/useMetinler';
import { dosyaKaydet, dxfDosyasiOku } from '../platform/tauri';
import { useProje } from './ProjeSaglayici';

/** Altlık dosyasının yanına önerilen ad: "…\Plan.dxf" → "…\Plan-paratoner.dxf". */
export function altlikCiktiYolu(yol: string): string {
  const ayrac = Math.max(yol.lastIndexOf('\\'), yol.lastIndexOf('/'));
  const klasor = yol.slice(0, ayrac + 1);
  const ad = yol.slice(ayrac + 1).replace(/\.dxf$/i, '');
  return `${klasor}${ad}-paratoner.dxf`;
}

export function useAltligaYaz() {
  const { proje } = useProje();
  const { bildir } = useEtkilesim();
  const m = useMetinler();
  const [yaziliyor, setYaziliyor] = useState(false);

  const yaz = useCallback(async () => {
    const altlik = proje.altlik ?? null;
    if (!altlik) return bildir(m.dxf.altlikYok, 'hata');
    if (!altlik.yol) return bildir(m.dxf.altlikYolYok, 'hata');
    if (!proje.paratonerler.length) return bildir(m.dxf.paratonerYok, 'hata');
    if (yaziliyor) return;
    setYaziliyor(true);
    try {
      const orijinal = await dxfDosyasiOku(altlik.yol);
      const bayt = dxfeEkle(orijinal, altlikParatonerCizimi(proje, altlik, m));
      const yol = await dosyaKaydet(altlikCiktiYolu(altlik.yol), bayt, { ad: m.dxf.filtre, uzantilar: ['dxf'] });
      if (yol) bildir(m.dxf.kaydedildi(yol), 'basari');
    } catch (e) {
      bildir(m.dxf.kaydedilemedi(e instanceof Error ? e.message : String(e)), 'hata');
    } finally {
      setYaziliyor(false);
    }
  }, [proje, bildir, m, yaziliyor]);

  return { yaz, yaziliyor };
}
