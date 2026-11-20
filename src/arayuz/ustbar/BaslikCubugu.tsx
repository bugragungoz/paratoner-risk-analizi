import { useEffect, useState } from 'react';
import { useProje } from '../durum/ProjeSaglayici';
import { ParatonerIsareti } from '../ortak/Logo';
import { pencere, tauriMi } from '../platform/tauri';
import { useMetinler } from '../ortak/useMetinler';

/** Çerçevesiz masaüstü penceresinin başlık çubuğu (tarayıcıda gösterilmez). */
export function BaslikCubugu() {
  const { proje, kaydedilmemis } = useProje();
  const m = useMetinler();
  const [buyuk, setBuyuk] = useState(false);
  const masaustu = tauriMi();

  useEffect(() => {
    if (!masaustu) return;
    let kaldir: (() => void) | undefined;
    pencere.buyukMu().then(setBuyuk).catch(() => {});
    pencere.boyutDegisince(() => pencere.buyukMu().then(setBuyuk).catch(() => {})).then((k) => (kaldir = k));
    return () => kaldir?.();
  }, [masaustu]);

  if (!masaustu) return null;
  return (
    <div data-tauri-drag-region className="custom-titlebar">
      <div className="titlebar-sol" data-tauri-drag-region>
        <span className="titlebar-isim" data-tauri-drag-region>
          <ParatonerIsareti boyut={15} className="wordmark-isaret" />
          {m.genel.uygulamaAdi}
        </span>
        <span className="titlebar-proje" data-tauri-drag-region>
          {kaydedilmemis ? '• ' : ''}
          {proje.isim}
        </span>
      </div>
      <div className="titlebar-sag">
        <button className="titlebar-buton" onClick={() => pencere.kucult()} aria-label={m.baslikCubugu.kucult}>
          <svg viewBox="0 0 10 10" width="10" height="10">
            <path fill="currentColor" d="M1 4.5h8v1H1z" />
          </svg>
        </button>
        <button className="titlebar-buton" onClick={() => pencere.buyutGecis()} aria-label={buyuk ? m.baslikCubugu.oncekiBoyut : m.baslikCubugu.buyut}>
          {buyuk ? (
            <svg viewBox="0 0 10 10" width="10" height="10">
              <path fill="currentColor" d="M2.5 1v1h-1v6h6v-1h1v-6h-6zm4 6h-4v-4h4v4zm1-1h-1v-4h-4v-1h4v4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 10 10" width="10" height="10">
              <path fill="currentColor" d="M1 1v8h8v-8h-8zm7 7h-6v-6h6v6z" />
            </svg>
          )}
        </button>
        <button className="titlebar-buton titlebar-kapat" onClick={() => pencere.kapat()} aria-label={m.baslikCubugu.kapat}>
          <svg viewBox="0 0 10 10" width="10" height="10">
            <path fill="currentColor" d="M1.3 1.3l7.4 7.4-.7.7-7.4-7.4.7-.7z" />
            <path fill="currentColor" d="M1.3 8.7l7.4-7.4.7.7-7.4 7.4-.7-.7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
