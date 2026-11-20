// Street View: Google Maps Embed API (ücretsiz, kullanıcının anahtarıyla). Anahtar yoksa yalnızca
// Google Haritalar'ın resmi bağlantısıyla tarayıcıda açılır.

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { LatLng } from '../../core';
import { useProje } from '../durum/ProjeSaglayici';
import { streetviewAdresi } from '../harita/servisler';
import { disBaglantiAc } from '../platform/tauri';
import { useMetinler } from '../ortak/useMetinler';

export function StreetViewPaneli({ konum, kapat, ayarlariAc }: { konum: LatLng; kapat: () => void; ayarlariAc: () => void }) {
  const { haritaAnahtarlari } = useProje();
  const m = useMetinler();
  const t = m.streetView;
  const [yanit, setYanit] = useState<{ konum: string; adres?: string; hata?: string } | null>(null);
  const konumAnahtari = `${konum.lat},${konum.lng}`;
  // Eski konumun yanıtı yeni konumda gösterilmez.
  const gecerli = yanit?.konum === konumAnahtari ? yanit : null;
  const adres = gecerli?.adres ?? null;
  const hata = gecerli?.hata ?? null;
  const disUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${konum.lat},${konum.lng}`;

  useEffect(() => {
    let iptal = false;
    if (!haritaAnahtarlari.google) return;
    const k = `${konum.lat},${konum.lng}`;
    streetviewAdresi(konum.lat, konum.lng).then(
      (a) => !iptal && setYanit({ konum: k, adres: a }),
      (e) => !iptal && setYanit({ konum: k, hata: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      iptal = true;
    };
  }, [konum.lat, konum.lng, haritaAnahtarlari.google]);

  return (
    <div className="streetview-panel">
      <div className="streetview-ustbar">
        <span>
          {konum.lat.toFixed(5)}, {konum.lng.toFixed(5)}
        </span>
        <div className="satir-icinde">
          <button className="ikon-buton" onClick={() => disBaglantiAc(disUrl)} title={t.tarayicidaAc} aria-label={t.tarayicidaAc}>
            <ExternalLink size={13} />
          </button>
          <button className="mini-buton" onClick={kapat}>
            {m.ortak.kapat}
          </button>
        </div>
      </div>
      {!haritaAnahtarlari.google ? (
        <div className="streetview-not">
          {t.anahtarGerekli}{' '}
          <button className="baglanti-buton" onClick={ayarlariAc}>
            {t.ayarlar}
          </button>
          <br />
          {t.anahtarsiz}
        </div>
      ) : hata ? (
        <div className="streetview-not">{hata}</div>
      ) : (
        <>
          <div className="streetview-not">{t.not}</div>
          {adres && <iframe title="Street View" src={adres} className="streetview-iframe" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
        </>
      )}
    </div>
  );
}
