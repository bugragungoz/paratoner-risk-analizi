// Aç / Kaydet / Farklı kaydet / son dosyalar / kurtarma / yeni proje ve kaydedilmemiş değişiklik sorusu.

import { useCallback } from 'react';
import { PROJE_DOSYA_SINIRI, PROJE_UZANTISI } from '../../core';
import { useEtkilesim } from '../ortak/Etkilesim';
import { dosyaAdiAyikla, indir, kayitYeriSec, klasorAyikla, projeDosyasiOku, projeDosyasiSec, projeDosyasiYaz, tauriMi } from '../platform/tauri';
import { dosyaIceriginiAc, kayitIcerigi, onerilenDosyaAdi, ptprojMu, type AcilanProje } from './kalicilik';
import { useProje } from './ProjeSaglayici';

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
  const { acildi, yeniBasladi } = sonrasinda;

  const farkliKaydet = useCallback(async (): Promise<boolean> => {
    const ad = onerilenDosyaAdi(proje);
    try {
      const icerik = kayitIcerigi(proje);
      if (!tauriMi()) {
        indir(ad, icerik);
        kaydedildi(proje, null, ad);
        bildir(`Proje indirildi: ${ad}`, 'basari');
        return true;
      }
      const sonKlasor = dosyaYolu ? klasorAyikla(dosyaYolu) : sonDosyalar[0] ? klasorAyikla(sonDosyalar[0].yol) : '';
      let yol = await kayitYeriSec(sonKlasor + ad, { ad: 'Paratoner projesi', uzantilar: [PROJE_UZANTISI] });
      if (!yol) return false;
      if (!ptprojMu(yol)) yol = `${yol}.${PROJE_UZANTISI}`;
      await projeDosyasiYaz(yol, icerik);
      kaydedildi(proje, yol, dosyaAdiAyikla(yol));
      bildir(`Proje kaydedildi: ${yol}`, 'basari');
      return true;
    } catch (e) {
      bildir(`Proje kaydedilemedi: ${hataMetni(e)}`, 'hata');
      return false;
    }
  }, [proje, dosyaYolu, sonDosyalar, kaydedildi, bildir]);

  const kaydet = useCallback(async (): Promise<boolean> => {
    if (!tauriMi() || !dosyaYolu) return farkliKaydet();
    try {
      await projeDosyasiYaz(dosyaYolu, kayitIcerigi(proje));
      kaydedildi(proje, dosyaYolu, dosyaAdiAyikla(dosyaYolu));
      bildir(`Proje kaydedildi: ${dosyaAdiAyikla(dosyaYolu)}`, 'basari');
      return true;
    } catch (e) {
      bildir(`Proje kaydedilemedi: ${hataMetni(e)}`, 'hata');
      return false;
    }
  }, [proje, dosyaYolu, farkliKaydet, kaydedildi, bildir]);

  const degisiklikleriKoru = useCallback(async (): Promise<boolean> => {
    if (!kaydedilmemis) return true;
    const secim = await sec({
      baslik: 'Kaydedilmemiş değişiklikler',
      aciklama: `"${proje.isim}" projesindeki değişiklikler kaydedilmedi. Kaydetmeden devam ederseniz bu değişiklikler kaybolur.`,
      secenekler: [
        { deger: 'atla', etiket: 'Kaydetme', tur: 'tehlikeli' },
        { deger: 'kaydet', etiket: 'Kaydet', tur: 'birincil' },
      ],
    });
    if (secim === 'kaydet') return kaydet();
    return secim === 'atla';
  }, [kaydedilmemis, proje.isim, sec, kaydet]);

  const yukle = useCallback(
    async (acilan: AcilanProje, kaynakYolu: string | null) => {
      if (!(await degisiklikleriKoru())) return;
      projeAc(acilan, kaynakYolu);
      acildi();
      bildir(`"${acilan.proje.isim}" açıldı.`, 'basari');
    },
    [degisiklikleriKoru, projeAc, acildi, bildir],
  );

  const ac = useCallback(async () => {
    let acilan: AcilanProje;
    let yol: string | null;
    try {
      const secilen = await projeDosyasiSec(PROJE_DOSYA_SINIRI);
      if (!secilen) return;
      yol = secilen.yol;
      acilan = dosyaIceriginiAc(secilen.icerik, secilen.yol, secilen.ad);
    } catch (e) {
      bildir(`Proje dosyası açılamadı: ${hataMetni(e)}`, 'hata');
      return;
    }
    await yukle(acilan, yol);
  }, [yukle, bildir]);

  const sonDosyaAc = useCallback(
    async (yol: string) => {
      let acilan: AcilanProje;
      try {
        acilan = dosyaIceriginiAc(await projeDosyasiOku(yol), yol, dosyaAdiAyikla(yol));
      } catch (e) {
        sonDosyaKaldir(yol);
        bildir(`"${dosyaAdiAyikla(yol)}" açılamadı (${hataMetni(e)}). Dosya son dosyalar listesinden kaldırıldı.`, 'hata');
        return;
      }
      await yukle(acilan, yol);
    },
    [yukle, sonDosyaKaldir, bildir],
  );

  const kurtarmaAc = useCallback(
    async (yol: string) => {
      let acilan: AcilanProje;
      try {
        acilan = dosyaIceriginiAc(await projeDosyasiOku(yol), yol, dosyaAdiAyikla(yol), true);
      } catch (e) {
        bildir(`Kayıt açılamadı: ${hataMetni(e)}`, 'hata');
        return;
      }
      await yukle(acilan, null);
    },
    [yukle, bildir],
  );

  const yeni = useCallback(async () => {
    if (!(await degisiklikleriKoru())) return;
    yeniProjeBaslat();
    yeniBasladi();
  }, [degisiklikleriKoru, yeniProjeBaslat, yeniBasladi]);

  return { degisiklikleriKoru, kaydet, farkliKaydet, ac, sonDosyaAc, kurtarmaAc, yeni };
}
