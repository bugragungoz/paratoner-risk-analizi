// Google Earth (KML / KMZ) dışa ve içe aktarma. İçe aktarmada dosya okunur ve çözülür; öğeler
// önizleme penceresinde (KmlIceAktarPenceresi) onaylandıktan sonra projeye eklenir.

import { useCallback, useState } from 'react';
import { kmlCoz, KmlHatasi, kmlUret, type KmlBelgesi } from '../../core';
import { kmlMetni, KmzBosHatasi } from '../aktarim/kmz';
import { useEtkilesim } from '../ortak/Etkilesim';
import { useMetinler } from '../ortak/useMetinler';
import { dosyaKaydet, guvenliDosyaAdi, kmlDosyasiSec } from '../platform/tauri';
import { UYGULAMA } from './kalicilik';
import { useProje } from './ProjeSaglayici';

export interface KmlOnizlemesi {
  belge: KmlBelgesi;
  dosyaAdi: string;
}

const hataMetni = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useKmlIslemleri() {
  const { proje, sonuc } = useProje();
  const { bildir } = useEtkilesim();
  const m = useMetinler();
  const [onizleme, setOnizleme] = useState<KmlOnizlemesi | null>(null);

  const disaAktar = useCallback(async () => {
    try {
      const metin = kmlUret(proje, sonuc, m, UYGULAMA);
      const yol = await dosyaKaydet(`${guvenliDosyaAdi(proje.isim, 'proje')}.kml`, metin, { ad: m.kml.kmlFiltresi, uzantilar: ['kml'] });
      if (yol) bildir(m.kml.kaydedildi(yol), 'basari');
    } catch (e) {
      bildir(m.kml.kaydedilemedi(hataMetni(e)), 'hata');
    }
  }, [proje, sonuc, m, bildir]);

  const iceAktar = useCallback(async () => {
    try {
      const secilen = await kmlDosyasiSec(m.kml.dosyaFiltresi);
      if (!secilen) return;
      const belge = kmlCoz(await kmlMetni(secilen.bayt));
      if (!belge.ogeler.some((o) => o.geometri.tur !== 'cizgi' && o.veri.pt_tur !== 'rp_daire')) {
        bildir(m.kml.ogeYok, 'hata');
        return;
      }
      setOnizleme({ belge, dosyaAdi: secilen.ad });
    } catch (e) {
      const neden = e instanceof KmlHatasi ? m.kml.xmlHatasi : e instanceof KmzBosHatasi ? m.kml.kmzBos : hataMetni(e);
      bildir(m.kml.okunamadi(neden), 'hata');
    }
  }, [m, bildir]);

  const onizlemeKapat = useCallback(() => setOnizleme(null), []);

  return { disaAktar, iceAktar, onizleme, onizlemeKapat };
}

export type KmlIslemleri = ReturnType<typeof useKmlIslemleri>;
