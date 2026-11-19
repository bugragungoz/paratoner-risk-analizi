// DXF altlığı: dosyanın okunması ve çözülmesi. Projede yalnızca ayar (yol, hizalama, görünüm)
// saklanır; çizim bellekte tutulur ve proje açılınca (masaüstünde) yolundan yeniden okunur.

import { useCallback, useEffect, useState } from 'react';
import {
  birimMetresi,
  dxfCoz,
  DxfOkumaHatasi,
  ilkYerlesim,
  turefDilimiBul,
  turefOlabilir,
  type AltlikAyari,
  type DxfAltligi,
  type LatLng,
} from '../../core';
import { useEtkilesim } from '../ortak/Etkilesim';
import { useMetinler } from '../ortak/useMetinler';
import { dxfDosyasiOku, dxfDosyasiSec, tauriMi } from '../platform/tauri';
import { altlikAyarla, altlikGuncelle } from './eylemler';
import { useProje } from './ProjeSaglayici';

export interface AltlikVerisi {
  /** Okunan dosyanın yolu (tarayıcıda null). Ayarın yoluyla aynıysa çizim gösterilir. */
  yol: string | null;
  cozum: DxfAltligi;
}

const hataMetni = (e: unknown) => (e instanceof DxfOkumaHatasi || e instanceof Error ? e.message : String(e));

/**
 * `konum`: harita merkezi (koordinatsız çizim buraya konur) ve proje ortası (TUREF diliminin seçiminde
 * öncelikli referans; proje boşsa harita merkezi).
 */
export function useAltlik(konum: () => { harita: LatLng | null; proje: LatLng | null }, gosterildi: (cozum: DxfAltligi, ayar: AltlikAyari) => void) {
  const { proje, guncelle } = useProje();
  const { bildir } = useEtkilesim();
  const m = useMetinler();
  const [veri, setVeri] = useState<AltlikVerisi | null>(null);
  /** Okunamayan dosya: aynı yol için tekrar denenmez (kullanıcı dosyayı yeniden seçer). */
  const [okumaHatasi, setOkumaHatasi] = useState<{ yol: string; mesaj: string } | null>(null);
  const ayar = proje.altlik ?? null;
  const yol = ayar?.yol ?? null;
  const hataYolu = okumaHatasi?.yol ?? null;
  const okunuyor = !!yol && tauriMi() && veri?.yol !== yol && hataYolu !== yol;
  const hata = okumaHatasi && okumaHatasi.yol === yol ? okumaHatasi.mesaj : null;

  // Proje açılınca (ya da geri alınınca) altlığı yolundan oku.
  useEffect(() => {
    if (!yol || !tauriMi() || veri?.yol === yol || hataYolu === yol) return;
    let iptal = false;
    dxfDosyasiOku(yol)
      .then((b) => dxfCoz(b))
      .then((cozum) => {
        if (!iptal) setVeri({ yol, cozum });
      })
      .catch((e) => {
        if (!iptal) setOkumaHatasi({ yol, mesaj: `${m.altlik.bulunamadi(yol)} (${hataMetni(e)})` });
      });
    return () => {
      iptal = true;
    };
  }, [yol, veri?.yol, hataYolu, m]);

  /** Yeni altlık ekler; `korunan` verilirse (yeniden seçme) hizalama ve görünüm ayarları korunur. */
  const sec = useCallback(
    async (korunan: AltlikAyari | null) => {
      let secilen: Awaited<ReturnType<typeof dxfDosyasiSec>>;
      let cozum: DxfAltligi;
      try {
        secilen = await dxfDosyasiSec(m.altlik.filtre);
        if (!secilen) return;
        cozum = dxfCoz(secilen.bayt);
      } catch (e) {
        bildir(m.altlik.okunamadi(hataMetni(e)), 'hata');
        return;
      }
      let yeni: AltlikAyari;
      if (korunan) yeni = { ...korunan, yol: secilen.yol, ad: secilen.ad };
      else {
        const birim = birimMetresi(cozum.birim) ?? 1;
        const k = konum();
        const merkez = k.harita ?? k.proje ?? { lat: 39, lng: 35 };
        const s = cozum.sinirlar!;
        const turef = turefOlabilir(s, birim);
        yeni = {
          yol: secilen.yol,
          ad: secilen.ad,
          birim,
          hizalama: turef ? { tur: 'turef', dilim: turefDilimiBul(s, birim, k.proje ?? merkez) } : ilkYerlesim(s, birim, merkez),
          gizliKatmanlar: cozum.katmanlar.filter((k) => k.kapali).map((k) => k.ad),
          opaklik: 0.85,
          gorunur: true,
          renk: 'katman',
        };
      }
      setVeri({ yol: secilen.yol, cozum });
      setOkumaHatasi(null);
      guncelle(altlikAyarla(yeni));
      const cizgi = cozum.parcalar.length;
      bildir(
        [
          m.altlik.eklendi(secilen.ad, cozum.katmanlar.length, cizgi),
          korunan ? '' : yeni.hizalama.tur === 'turef' ? m.altlik.turefYerlesti(yeni.hizalama.dilim) : m.altlik.elleYerlesti,
        ]
          .filter(Boolean)
          .join(' '),
        'basari',
      );
      gosterildi(cozum, yeni);
    },
    [m, bildir, guncelle, konum, gosterildi],
  );

  const ekle = useCallback(() => sec(null), [sec]);
  const yenidenSec = useCallback(() => sec(ayar), [sec, ayar]);
  const kaldir = useCallback(() => guncelle(altlikAyarla(null)), [guncelle]);
  const degistir = useCallback((d: Partial<AltlikAyari>, birlestir = 'altlik') => guncelle(altlikGuncelle(d), birlestir), [guncelle]);

  // Çizim yalnızca projedeki ayarla aynı dosyadansa gösterilir (tarayıcıda ikisi de null).
  const cozum = ayar && veri && veri.yol === ayar.yol ? veri.cozum : null;
  return { ayar, cozum, hata, okunuyor, ekle, yenidenSec, kaldir, degistir };
}

export type AltlikIslemleri = ReturnType<typeof useAltlik>;
