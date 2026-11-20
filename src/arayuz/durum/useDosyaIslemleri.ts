// Aç / Kaydet / Farklı kaydet / son dosyalar / kurtarma / yeni proje ve kaydedilmemiş değişiklik sorusu.

import { useCallback } from 'react';
import { PROJE_DOSYA_SINIRI, PROJE_UZANTISI } from '../../core';
import { useEtkilesim } from '../ortak/Etkilesim';
import { dosyaAdiAyikla, indir, kayitYeriSec, klasorAyikla, projeDosyasiOku, projeDosyasiSec, projeDosyasiYaz, tauriMi } from '../platform/tauri';
import { dosyaIceriginiAc, kayitIcerigi, onerilenDosyaAdi, ptprojMu, type AcilanProje } from './kalicilik';
import { useProje } from './ProjeSaglayici';
import { useMetinler } from '../ortak/useMetinler';

const hataMetni = (e: unknown) => (e instanceof Error ? e.message : String(e));

export interface DosyaIslemleri {
  /** Kaydedilmemiş değişiklik varsa sorar; devam edilebilecekse true. */
  degisiklikleriKoru: () => Promise<boolean>;
  kaydet: () => Promise<boolean>;
  farkliKaydet: () => Promise<boolean>;
  ac: () => Promise<void>;
  sonDosyaAc: (yol: string) => Promise<void>;
  /** Otomatik kayıt/yedek dosyasını açar; proje kaydedilmemiş sayılır (kayıt dosyasının üzerine yazılmaz). */
  kurtarmaAc: (yol: string) => Promise<void>;
  yeni: () => Promise<void>;
}

export function useDosyaIslemleri(sonrasinda: { acildi: () => void; yeniBasladi: () => void }): DosyaIslemleri {
  const { proje, dosyaYolu, kaydedilmemis, projeAc, yeniProjeBaslat, kaydedildi, sonDosyalar, sonDosyaKaldir } = useProje();
  const { sec, bildir } = useEtkilesim();
  const m = useMetinler();
  const t = m.dosyaIslem;
  const { acildi, yeniBasladi } = sonrasinda;

  const farkliKaydet = useCallback(async (): Promise<boolean> => {
    const ad = onerilenDosyaAdi(proje);
    try {
      const icerik = kayitIcerigi(proje);
      if (!tauriMi()) {
        indir(ad, icerik);
        kaydedildi(proje, null, ad);
        bildir(t.indirildi(ad), 'basari');
        return true;
      }
      const sonKlasor = dosyaYolu ? klasorAyikla(dosyaYolu) : sonDosyalar[0] ? klasorAyikla(sonDosyalar[0].yol) : '';
      let yol = await kayitYeriSec(sonKlasor + ad, { ad: t.filtreProje, uzantilar: [PROJE_UZANTISI] });
      if (!yol) return false;
      if (!ptprojMu(yol)) yol = `${yol}.${PROJE_UZANTISI}`;
      await projeDosyasiYaz(yol, icerik);
      kaydedildi(proje, yol, dosyaAdiAyikla(yol));
      bildir(t.kaydedildi(yol), 'basari');
      return true;
    } catch (e) {
      bildir(t.kaydedilemedi(hataMetni(e)), 'hata');
      return false;
    }
  }, [proje, dosyaYolu, sonDosyalar, kaydedildi, bildir, t]);

  const kaydet = useCallback(async (): Promise<boolean> => {
    if (!tauriMi() || !dosyaYolu) return farkliKaydet();
    try {
      await projeDosyasiYaz(dosyaYolu, kayitIcerigi(proje));
      kaydedildi(proje, dosyaYolu, dosyaAdiAyikla(dosyaYolu));
      bildir(t.kaydedildi(dosyaAdiAyikla(dosyaYolu)), 'basari');
      return true;
    } catch (e) {
      bildir(t.kaydedilemedi(hataMetni(e)), 'hata');
      return false;
    }
  }, [proje, dosyaYolu, farkliKaydet, kaydedildi, bildir, t]);

  const degisiklikleriKoru = useCallback(async (): Promise<boolean> => {
    if (!kaydedilmemis) return true;
    const secim = await sec({
      baslik: t.kaydedilmemis,
      aciklama: t.kaydedilmemisAciklama(proje.isim),
      secenekler: [
        { deger: 'atla', etiket: t.kaydetme, tur: 'tehlikeli' },
        { deger: 'kaydet', etiket: m.genel.kaydet, tur: 'birincil' },
      ],
    });
    if (secim === 'kaydet') return kaydet();
    return secim === 'atla';
  }, [kaydedilmemis, proje.isim, sec, kaydet, t, m]);

  const yukle = useCallback(
    async (acilan: AcilanProje, kaynakYolu: string | null) => {
      if (!(await degisiklikleriKoru())) return;
      projeAc(acilan, kaynakYolu);
      acildi();
      bildir(t.acildi(acilan.proje.isim), 'basari');
    },
    [degisiklikleriKoru, projeAc, acildi, bildir, t],
  );

  const ac = useCallback(async () => {
    let acilan: AcilanProje;
    let yol: string | null;
    try {
      const secilen = await projeDosyasiSec(PROJE_DOSYA_SINIRI, m);
      if (!secilen) return;
      yol = secilen.yol;
      acilan = dosyaIceriginiAc(secilen.icerik, secilen.yol, secilen.ad, false, m);
    } catch (e) {
      bildir(t.acilamadi(hataMetni(e)), 'hata');
      return;
    }
    await yukle(acilan, yol);
  }, [yukle, bildir, m, t]);

  const sonDosyaAc = useCallback(
    async (yol: string) => {
      let acilan: AcilanProje;
      try {
        acilan = dosyaIceriginiAc(await projeDosyasiOku(yol), yol, dosyaAdiAyikla(yol), false, m);
      } catch (e) {
        sonDosyaKaldir(yol);
        bildir(t.sonDosyaAcilamadi(dosyaAdiAyikla(yol), hataMetni(e)), 'hata');
        return;
      }
      await yukle(acilan, yol);
    },
    [yukle, sonDosyaKaldir, bildir, m, t],
  );

  const kurtarmaAc = useCallback(
    async (yol: string) => {
      let acilan: AcilanProje;
      try {
        acilan = dosyaIceriginiAc(await projeDosyasiOku(yol), yol, dosyaAdiAyikla(yol), true, m);
      } catch (e) {
        bildir(t.kayitAcilamadi(hataMetni(e)), 'hata');
        return;
      }
      await yukle(acilan, null);
    },
    [yukle, bildir, m, t],
  );

  const yeni = useCallback(async () => {
    if (!(await degisiklikleriKoru())) return;
    yeniProjeBaslat();
    yeniBasladi();
  }, [degisiklikleriKoru, yeniProjeBaslat, yeniBasladi]);

  return { degisiklikleriKoru, kaydet, farkliKaydet, ac, sonDosyaAc, kurtarmaAc, yeni };
}
