// Raporu hazırlayan mühendisin bilgileri. Ayarlarda saklanır (bütün projeler için);
// hem Ayarlar > Rapor'da hem rapor penceresinde aynı alanlar düzenlenir.

import { useRef } from 'react';
import { IMZA_SINIRI } from '../durum/ayarlar';
import { useProje } from '../durum/ProjeSaglayici';
import { dataUrlOku } from '../rapor/gorsel';
import { useEtkilesim } from './Etkilesim';

export function MuhendisAlanlari() {
  const { ayarlar, ayarGuncelle } = useProje();
  const { bildir } = useEtkilesim();
  const imzaRef = useRef<HTMLInputElement>(null);
  const m = ayarlar.muhendis;
  const degistir = (d: Partial<typeof m>) => ayarGuncelle({ muhendis: { ...m, ...d } });

  async function imzaSec(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    e.target.value = '';
    if (!dosya) return;
    if (!['image/png', 'image/jpeg'].includes(dosya.type)) {
      bildir('İmza için PNG veya JPEG dosyası seçin.', 'hata');
      return;
    }
    const url = await dataUrlOku(dosya);
    if (url.length > IMZA_SINIRI) {
      bildir('İmza görseli çok büyük (en fazla yaklaşık 300 KB).', 'hata');
      return;
    }
    degistir({ imza: url });
  }

  return (
    <>
      <div className="form-grid-2">
        <label>
          Hazırlayan mühendis
          <input value={m.ad} onChange={(e) => degistir({ ad: e.target.value })} placeholder="Ad Soyad" />
        </label>
        <label>
          Unvan
          <input value={m.unvan} onChange={(e) => degistir({ unvan: e.target.value })} placeholder="Elektrik Mühendisi" />
        </label>
      </div>
      <div className="form-grid-2">
        <label>
          EMO sicil no
          <input value={m.sicilNo} onChange={(e) => degistir({ sicilNo: e.target.value })} />
        </label>
        <label>
          İmza görseli (isteğe bağlı)
          <div className="logo-yukleme-satir">
            <button type="button" onClick={() => imzaRef.current?.click()}>
              İmza seç
            </button>
            <input ref={imzaRef} type="file" accept="image/png,image/jpeg" hidden onChange={imzaSec} />
            {m.imza && (
              <>
                <img src={m.imza} alt="İmza önizleme" className="logo-onizleme" />
                <button type="button" className="mini-buton mini-buton-tehlike" onClick={() => degistir({ imza: null })}>
                  Kaldır
                </button>
              </>
            )}
          </div>
        </label>
      </div>
      <p className="ipucu-kucuk">Hazırlayan bilgileri ve imza rapor kapağında yer alır. İmza görseli eklenmezse ıslak imza için boş alan bırakılır.</p>
    </>
  );
}
