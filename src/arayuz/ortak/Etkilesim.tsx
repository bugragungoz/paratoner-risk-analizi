// Onay/seçim pencereleri ve bildirimler (window.confirm / alert yerine).

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, useEffect } from 'react';

export interface OnaySecenekleri {
  baslik: string;
  aciklama?: ReactNode;
  onayEtiketi?: string;
  vazgecEtiketi?: string;
  tehlikeli?: boolean;
  /** Yalnızca bilgi: tek "Tamam" düğmesi. */
  yalnizBilgi?: boolean;
}

export interface SecimSecenegi<T extends string> {
  deger: T;
  etiket: string;
  tur?: 'birincil' | 'tehlikeli' | 'ikincil';
}

export interface SecimIstegi<T extends string> {
  baslik: string;
  aciklama?: ReactNode;
  secenekler: SecimSecenegi<T>[];
  /** Vazgeç düğmesinin etiketi; Esc ve dışarı tıklama da vazgeçmek sayılır. */
  vazgecEtiketi?: string;
}

export type BildirimTuru = 'bilgi' | 'basari' | 'hata';
interface Bildirim {
  id: number;
  tur: BildirimTuru;
  metin: string;
}

/** Onay pencerelerinin varsayılan düğmeleri ve genel metinler (dil değişince ProjeSaglayici günceller). */
export interface EtkilesimEtiketleri {
  vazgec: string;
  tamam: string;
  onayla: string;
  kapat: string;
  beklenmeyenHata: (hata: string) => string;
}

const TR_ETIKETLER: EtkilesimEtiketleri = {
  vazgec: 'Vazgeç',
  tamam: 'Tamam',
  onayla: 'Onayla',
  kapat: 'Kapat (Esc)',
  beklenmeyenHata: (hata) => `Beklenmeyen hata: ${hata}`,
};

interface EtkilesimBaglami {
  etiketler: EtkilesimEtiketleri;
  etiketleriAyarla: (e: EtkilesimEtiketleri) => void;
  onayla: (s: OnaySecenekleri) => Promise<boolean>;
  /** Birden fazla seçenekli soru; vazgeçilirse null. */
  sec: <T extends string>(s: SecimIstegi<T>) => Promise<T | null>;
  bildir: (metin: string, tur?: BildirimTuru) => void;
}

interface AcikIstek {
  baslik: string;
  aciklama?: ReactNode;
  secenekler: SecimSecenegi<string>[];
  vazgecEtiketi: string | null;
}

const Baglam = createContext<EtkilesimBaglami | null>(null);

export function useEtkilesim(): EtkilesimBaglami {
  const b = useContext(Baglam);
  if (!b) throw new Error('useEtkilesim, EtkilesimSaglayici içinde kullanılmalı.');
  return b;
}

const DUGME_SINIFI: Record<NonNullable<SecimSecenegi<string>['tur']>, string> = {
  birincil: 'buton-birincil',
  tehlikeli: 'ui-buton-tehlike',
  ikincil: 'ikincil-buton',
};

export function EtkilesimSaglayici({ children }: { children: ReactNode }) {
  const [istek, setIstek] = useState<AcikIstek | null>(null);
  const cozucu = useRef<((sonuc: string | null) => void) | null>(null);
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const sayac = useRef(0);
  const [etiketler, etiketleriAyarla] = useState<EtkilesimEtiketleri>(TR_ETIKETLER);

  const ac = useCallback((s: AcikIstek) => {
    cozucu.current?.(null);
    setIstek(s);
    return new Promise<string | null>((resolve) => {
      cozucu.current = resolve;
    });
  }, []);

  const sec = useCallback(
    <T extends string>(s: SecimIstegi<T>) =>
      ac({ baslik: s.baslik, aciklama: s.aciklama, secenekler: s.secenekler, vazgecEtiketi: s.vazgecEtiketi ?? etiketler.vazgec }) as Promise<T | null>,
    [ac, etiketler],
  );

  const onayla = useCallback(
    async (s: OnaySecenekleri) => {
      const sonuc = await ac({
        baslik: s.baslik,
        aciklama: s.aciklama,
        secenekler: [{ deger: 'evet', etiket: s.onayEtiketi ?? (s.yalnizBilgi ? etiketler.tamam : etiketler.onayla), tur: s.tehlikeli ? 'tehlikeli' : 'birincil' }],
        vazgecEtiketi: s.yalnizBilgi ? null : (s.vazgecEtiketi ?? etiketler.vazgec),
      });
      return sonuc === 'evet';
    },
    [ac, etiketler],
  );

  const bitir = (sonuc: string | null) => {
    const coz = cozucu.current;
    cozucu.current = null;
    setIstek(null);
    coz?.(sonuc);
  };

  const bildir = useCallback((metin: string, tur: BildirimTuru = 'bilgi') => {
    const id = ++sayac.current;
    setBildirimler((b) => [...b, { id, tur, metin }]);
    setTimeout(() => setBildirimler((b) => b.filter((x) => x.id !== id)), tur === 'hata' ? 8000 : 4000);
  }, []);

  // Yakalanmamış bir işlem hatası sessizce kaybolmasın: kullanıcıya bildirilir.
  useEffect(() => {
    const yakala = (e: PromiseRejectionEvent) => {
      const r: unknown = e.reason;
      bildir(etiketler.beklenmeyenHata(r instanceof Error ? r.message : String(r)), 'hata');
    };
    window.addEventListener('unhandledrejection', yakala);
    return () => window.removeEventListener('unhandledrejection', yakala);
  }, [bildir, etiketler]);

  const deger = useMemo(() => ({ etiketler, etiketleriAyarla, onayla, sec, bildir }), [etiketler, onayla, sec, bildir]);

  return (
    <Baglam.Provider value={deger}>
      {children}
      <AlertDialog.Root open={!!istek} onOpenChange={(a) => !a && bitir(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="ui-alertdialog-overlay" />
          <AlertDialog.Content className="ui-alertdialog-content">
            <AlertDialog.Title className="ui-alertdialog-title">{istek?.baslik}</AlertDialog.Title>
            {istek?.aciklama && <AlertDialog.Description className="ui-alertdialog-description">{istek.aciklama}</AlertDialog.Description>}
            <div className="ui-alertdialog-butonlar">
              {istek?.vazgecEtiketi && (
                <AlertDialog.Cancel asChild>
                  <button className="ikincil-buton">{istek.vazgecEtiketi}</button>
                </AlertDialog.Cancel>
              )}
              {istek?.secenekler.map((s) => (
                <button key={s.deger} className={DUGME_SINIFI[s.tur ?? 'birincil']} onClick={() => bitir(s.deger)}>
                  {s.etiket}
                </button>
              ))}
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <div className="bildirim-kap" role="status" aria-live="polite">
        {bildirimler.map((b) => (
          <div key={b.id} className={`bildirim bildirim-${b.tur}`}>
            {b.metin}
          </div>
        ))}
      </div>
    </Baglam.Provider>
  );
}
