import { useEffect, useState } from 'react';
import { pencere } from '../platform/tauri';
import { useMetinler } from '../ortak/useMetinler';

interface Props {
  geriAl: () => void;
  yinele: () => void;
  geriAlinabilir: boolean;
  yinelenebilir: boolean;
  projeyeOdakla: () => void;
  turkiye: () => void;
  kaydet: () => void;
  farkliKaydet: () => void;
}

/** Uygulama genelinde sağ tık menüsü (metin kutularında tarayıcının kendi menüsü kalır). */
export function SagTikMenu(p: Props) {
  const [konum, setKonum] = useState<{ x: number; y: number } | null>(null);
  const t = useMetinler().sagTik;

  useEffect(() => {
    function sagTik(e: MouseEvent) {
      const hedef = e.target as HTMLElement;
      if (hedef.closest('input, textarea, [contenteditable="true"]')) return setKonum(null);
      e.preventDefault();
      setKonum({ x: Math.min(e.clientX, window.innerWidth - 230), y: Math.min(e.clientY, window.innerHeight - 320) });
    }
    const kapat = () => setKonum(null);
    document.addEventListener('contextmenu', sagTik);
    document.addEventListener('click', kapat);
    window.addEventListener('blur', kapat);
    return () => {
      document.removeEventListener('contextmenu', sagTik);
      document.removeEventListener('click', kapat);
      window.removeEventListener('blur', kapat);
    };
  }, []);

  if (!konum) return null;
  const yap = (fn: () => void) => () => {
    fn();
    setKonum(null);
  };
  return (
    <div className="sag-tik-menu" style={{ left: konum.x, top: konum.y }} onContextMenu={(e) => e.preventDefault()} role="menu">
      <button role="menuitem" disabled={!p.geriAlinabilir} onClick={yap(p.geriAl)}>
        {t.geriAl} <kbd>Ctrl+Z</kbd>
      </button>
      <button role="menuitem" disabled={!p.yinelenebilir} onClick={yap(p.yinele)}>
        {t.yinele} <kbd>Ctrl+Y</kbd>
      </button>
      <hr />
      <button role="menuitem" onClick={yap(p.projeyeOdakla)}>
        {t.projeyeOdakla}
      </button>
      <button role="menuitem" onClick={yap(p.turkiye)}>
        {t.turkiye}
      </button>
      <button role="menuitem" onClick={yap(p.kaydet)}>
        {t.kaydet} <kbd>Ctrl+S</kbd>
      </button>
      <button role="menuitem" onClick={yap(p.farkliKaydet)}>
        {t.farkliKaydet} <kbd>Ctrl+Shift+S</kbd>
      </button>
      <hr />
      <button role="menuitem" onClick={yap(() => window.location.reload())}>
        {t.yenile}
      </button>
      <button role="menuitem" onClick={yap(() => pencere.tamEkranGecis())}>
        {t.tamEkran} <kbd>F11</kbd>
      </button>
      <hr />
      <button role="menuitem" className="tehlike" onClick={yap(() => pencere.kapat())}>
        {t.cikis}
      </button>
    </div>
  );
}
