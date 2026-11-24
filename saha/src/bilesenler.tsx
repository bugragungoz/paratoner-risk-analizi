// Ortak görünüm parçaları: üst çubuk, alt pencere (telefonda alttan açılan diyalog), sayı alanı.

import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useSaha } from './baglam';
import { sayiOku } from './veri';

export function UstCubuk({ baslik, geri, sag }: { baslik: ReactNode; geri?: boolean; sag?: ReactNode }) {
  const { m, geri: geriGit } = useSaha();
  return (
    <header className="ust">
      {geri && (
        <button type="button" className="ikon-buton ust-geri" onClick={geriGit} aria-label={m.geri} title={m.geri}>
          <ArrowLeft size={22} />
        </button>
      )}
      <h1 className="ust-baslik">{baslik}</h1>
      {sag && <div className="ust-sag">{sag}</div>}
    </header>
  );
}

export function AltPencere({ baslik, kapat, children }: { baslik: string; kapat: () => void; children: ReactNode }) {
  useEffect(() => {
    const tus = (e: KeyboardEvent) => e.key === 'Escape' && kapat();
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [kapat]);
  return (
    <div className="perde" onClick={kapat}>
      <div className="alt-pencere" role="dialog" aria-modal="true" aria-label={baslik} onClick={(e) => e.stopPropagation()}>
        <h2 className="alt-pencere-baslik">{baslik}</h2>
        {children}
      </div>
    </div>
  );
}

/** Ondalık virgül ya da noktayla sayı alanı; boş bırakılabilir (null). */
export function SayiAlani({
  deger,
  degisti,
  etiket,
  ipucu,
  zorunlu,
  otomatikOdak,
}: {
  deger: number | null;
  degisti: (d: number | null) => void;
  etiket: string;
  ipucu?: string;
  zorunlu?: boolean;
  otomatikOdak?: boolean;
}) {
  const { m } = useSaha();
  const [metin, setMetin] = useState(() => (deger === null ? '' : m.sayi(deger, 3)));
  const n = sayiOku(metin);
  const hatali = Number.isNaN(n) || (zorunlu && n === null);
  return (
    <label className="alan">
      <span className="alan-etiket">{etiket}</span>
      <input
        inputMode="decimal"
        value={metin}
        placeholder={ipucu}
        autoFocus={otomatikOdak}
        className={hatali && metin ? 'girdi-hatali' : ''}
        onChange={(e) => {
          setMetin(e.target.value);
          const s = sayiOku(e.target.value);
          if (s === null || !Number.isNaN(s)) degisti(s);
        }}
      />
    </label>
  );
}

/** Açık/kapalı anahtarı (Bugra Switch). */
export function Anahtar({ etiket, acik, degisti, not }: { etiket: string; acik: boolean; degisti: (a: boolean) => void; not?: string }) {
  return (
    <div className="anahtar-satir">
      <button type="button" role="switch" aria-checked={acik} className="ui-switch-root" data-state={acik ? 'checked' : 'unchecked'} onClick={() => degisti(!acik)}>
        <span className="ui-switch-thumb" />
      </button>
      <span className="anahtar-metin" onClick={() => degisti(!acik)}>
        <span className="anahtar-etiket">{etiket}</span>
        {not && <span className="anahtar-not">{not}</span>}
      </span>
    </div>
  );
}

/** Tek seçimli seçenek düğmeleri (Bugra Chip). */
export function Secenekler<T extends string>({ deger, degisti, secenekler, etiket }: { deger: T; degisti: (d: T) => void; secenekler: readonly (readonly [T, string])[]; etiket: string }) {
  return (
    <div className="secenekler" role="radiogroup" aria-label={etiket}>
      {secenekler.map(([d, ad]) => (
        <button key={d} type="button" role="radio" aria-checked={deger === d} className={deger === d ? 'mod-aktif' : ''} onClick={() => degisti(d)}>
          {ad}
        </button>
      ))}
    </div>
  );
}
