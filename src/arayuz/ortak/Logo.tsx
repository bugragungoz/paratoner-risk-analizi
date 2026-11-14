// Programın işareti: yalın şimşek. Bugra kuralı: tek çizgili dış hat (24 px ızgara, 1,6 px çizgi,
// yuvarlak uçlar), `accent-ink` renginde; dolgu ve çok renk yok.
// Uygulama simgesi (src-tauri/icons/app-icon.svg) aynı çizimden üretilir.

const ISARET = 'M13.4 2.8 5.6 13.6h6.2l-1.4 7.6 8-11h-6.2z';

export function ParatonerIsareti({ boyut = 16, cizgi = 1.6, className }: { boyut?: number; cizgi?: number; className?: string }) {
  return (
    <svg className={className} width={boyut} height={boyut} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={cizgi} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ISARET} />
    </svg>
  );
}

/** Bugra Wordmark: işaret + ad. */
export function Wordmark({ boyut = 'normal' }: { boyut?: 'normal' | 'buyuk' }) {
  return (
    <span className={`wordmark wordmark-${boyut}`}>
      <ParatonerIsareti boyut={boyut === 'buyuk' ? 28 : 16} className="wordmark-isaret" />
      <span>Paratoner Risk Analizi</span>
    </span>
  );
}
