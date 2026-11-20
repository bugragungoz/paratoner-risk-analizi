// Raporu hazırlayan mühendisin bilgileri. Ayarlarda saklanır (bütün projeler için);
// hem Ayarlar > Rapor'da hem rapor penceresinde aynı alanlar düzenlenir.

import { useRef } from 'react';
import { IMZA_SINIRI } from '../durum/ayarlar';
import { useProje } from '../durum/ProjeSaglayici';
import { dataUrlOku } from '../rapor/gorsel';
import { useEtkilesim } from './Etkilesim';
import { useMetinler } from './useMetinler';

export function MuhendisAlanlari() {
  const { ayarlar, ayarGuncelle } = useProje();
  const { bildir } = useEtkilesim();
  const imzaRef = useRef<HTMLInputElement>(null);
  const t = useMetinler();
  const m = ayarlar.muhendis;
  const degistir = (d: Partial<typeof m>) => ayarGuncelle({ muhendis: { ...m, ...d } });

  async function imzaSec(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    e.target.value = '';
    if (!dosya) return;
    if (!['image/png', 'image/jpeg'].includes(dosya.type)) {
      bildir(t.genel.pngJpeg(t.muhendis.imza), 'hata');
      return;
    }
    const url = await dataUrlOku(dosya);
    if (url.length > IMZA_SINIRI) {
      bildir(t.muhendis.imzaBuyuk, 'hata');
      return;
    }
    degistir({ imza: url });
  }

  return (
    <>
      <div className="form-grid-2">
        <label>
          {t.muhendis.ad}
          <input value={m.ad} onChange={(e) => degistir({ ad: e.target.value })} placeholder={t.muhendis.adOrnek} />
        </label>
        <label>
          {t.muhendis.unvan}
          <input value={m.unvan} onChange={(e) => degistir({ unvan: e.target.value })} placeholder={t.muhendis.unvanOrnek} />
        </label>
      </div>
      <div className="form-grid-2">
        <label>
          {t.muhendis.sicilNo}
          <input value={m.sicilNo} onChange={(e) => degistir({ sicilNo: e.target.value })} />
        </label>
        <label>
          {t.muhendis.imzaGorseli}
          <div className="logo-yukleme-satir">
            <button type="button" onClick={() => imzaRef.current?.click()}>
              {t.muhendis.imzaSec}
            </button>
            <input ref={imzaRef} type="file" accept="image/png,image/jpeg" hidden onChange={imzaSec} />
            {m.imza && (
              <>
                <img src={m.imza} alt={t.muhendis.imzaOnizleme} className="logo-onizleme" />
                <button type="button" className="mini-buton mini-buton-tehlike" onClick={() => degistir({ imza: null })}>
                  {t.genel.kaldir}
                </button>
              </>
            )}
          </div>
        </label>
      </div>
      <p className="ipucu-kucuk">{t.muhendis.not}</p>
    </>
  );
}
