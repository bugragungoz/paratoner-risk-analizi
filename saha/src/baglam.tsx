// Uygulama durumu: ayarlar, keşifler (her değişiklikte telefona yazılır), sayfa (adres çubuğundaki #
// kısmı; Android geri tuşu önceki sayfaya döner), arka planda konum alma, onay penceresi ve bildirim.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ayarlariOku, ayarlariYaz, type SahaAyarlari } from './ayarlar';
import { metinler, type SahaMetinleri } from './dil';
import { KonumHatasi, konumIzle, yakalamaKarari, type KonumOkumasi } from './konum';
import { rotaAdresi, rotaCoz, type Rota } from './rota';
import { kesifleriOku, kesifleriYaz, type SahaKesfi } from './veri';

export type { Rota };

interface OnayIstegi {
  baslik: string;
  aciklama?: string;
  onay?: string;
  tehlikeli?: boolean;
  /** Yalnızca bilgi: tek "Tamam" düğmesi. */
  bilgi?: boolean;
}

interface Bildirim {
  id: number;
  metin: string;
  tur: 'bilgi' | 'basari' | 'hata';
}

interface Baglam {
  m: SahaMetinleri;
  ayarlar: SahaAyarlari;
  ayarGuncelle: (d: Partial<SahaAyarlari>) => void;
  kesifler: SahaKesfi[];
  kesifEkle: (k: SahaKesfi) => void;
  kesifGuncelle: (id: string, fn: (k: SahaKesfi) => SahaKesfi) => void;
  kesifSil: (id: string) => void;
  hepsiniSil: () => void;
  /** Konumu alınmakta olan paratonerler: kimlik → şimdiye kadarki en iyi doğruluk (m; okuma yoksa null). */
  alinanlar: Readonly<Record<string, number | null>>;
  /** Paratonerin konumunu arka planda alır; bitince kaydeder ve bildirir. */
  konumAl: (kesifId: string, pid: string) => void;
  rota: Rota;
  git: (r: Rota, yerine?: boolean) => void;
  geri: () => void;
  onayla: (i: OnayIstegi) => Promise<boolean>;
  bildir: (metin: string, tur?: Bildirim['tur']) => void;
}

const B = createContext<Baglam | null>(null);

export function useSaha(): Baglam {
  const b = useContext(B);
  if (!b) throw new Error('useSaha, SahaSaglayici içinde kullanılmalı.');
  return b;
}

export function SahaSaglayici({ children }: { children: ReactNode }) {
  const [ayarlar, setAyarlar] = useState<SahaAyarlari>(ayarlariOku);
  const m = useMemo(() => metinler(ayarlar.dil), [ayarlar.dil]);
  const [kesifler, setKesifler] = useState<SahaKesfi[]>(kesifleriOku);
  const [rota, setRota] = useState<Rota>(() => rotaCoz(location.hash));
  const [onay, setOnay] = useState<(OnayIstegi & { coz: (b: boolean) => void }) | null>(null);
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [alinanlar, setAlinanlar] = useState<Record<string, number | null>>({});
  const sayac = useRef(0);
  const ilkYazim = useRef(true);
  /** Arka plandaki konum işlerinin okuduğu güncel değerler. */
  const guncel = useRef({ m, ayarlar, kesifler });
  const aktifler = useRef(new Set<string>());
  /** Uygulamanın gördüğü en yeni konum okumasının zamanı (konumun kendi zamanı, telefon saatinden bağımsız). */
  const sonOkumaZamani = useRef(-Infinity);

  useEffect(() => {
    guncel.current = { m, ayarlar, kesifler };
  }, [m, ayarlar, kesifler]);

  const bildir = useCallback((metin: string, tur: Bildirim['tur'] = 'bilgi') => {
    const id = ++sayac.current;
    setBildirimler((l) => [...l.slice(-2), { id, metin, tur }]);
    setTimeout(() => setBildirimler((l) => l.filter((x) => x.id !== id)), tur === 'hata' ? 7000 : 3500);
  }, []);

  const ayarGuncelle = useCallback((d: Partial<SahaAyarlari>) => {
    setAyarlar((a) => {
      const yeni = { ...a, ...d };
      ayarlariYaz(yeni);
      return yeni;
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = ayarlar.dil;
  }, [ayarlar.dil]);

  // Tema: ayar ya da telefonun açık/koyu ayarı.
  useEffect(() => {
    const sorgu = window.matchMedia('(prefers-color-scheme: light)');
    const uygula = () => {
      const acik = ayarlar.tema === 'acik' || (ayarlar.tema === 'sistem' && sorgu.matches);
      document.documentElement.setAttribute('data-tema', acik ? 'light' : 'dark');
    };
    uygula();
    sorgu.addEventListener('change', uygula);
    return () => sorgu.removeEventListener('change', uygula);
  }, [ayarlar.tema]);

  // Her değişiklik hemen telefona yazılır (uygulama arka planda kapatılabilir).
  useEffect(() => {
    if (ilkYazim.current) {
      ilkYazim.current = false;
      return;
    }
    if (!kesifleriYaz(kesifler)) bildir(guncel.current.ayarlar.dil === 'tr' ? 'Telefona yazılamadı: depolama dolu olabilir.' : 'Could not write to the phone: storage may be full.', 'hata');
  }, [kesifler, bildir]);

  useEffect(() => {
    // Geri tuşu: pushState kayıtları arasında dönüşte popstate gelir (hashchange gelmeyebilir).
    const dinle = () => setRota(rotaCoz(location.hash));
    window.addEventListener('hashchange', dinle);
    window.addEventListener('popstate', dinle);
    return () => {
      window.removeEventListener('hashchange', dinle);
      window.removeEventListener('popstate', dinle);
    };
  }, []);

  const git = useCallback((r: Rota, yerine = false) => {
    const adres = rotaAdresi(r);
    if (yerine) history.replaceState(null, '', adres);
    else history.pushState(null, '', adres);
    setRota(r);
    window.scrollTo(0, 0);
  }, []);

  const geri = useCallback(() => {
    if (history.length > 1 && location.hash && location.hash !== '#/') history.back();
    else git({ tur: 'liste' }, true);
  }, [git]);

  const kesifGuncelle = useCallback((id: string, fn: (k: SahaKesfi) => SahaKesfi) => {
    setKesifler((l) => l.map((k) => (k.id === id ? { ...fn(k), guncelleme: new Date().toISOString() } : k)));
  }, []);

  const konumAl = useCallback(
    (kesifId: string, pid: string) => {
      if (aktifler.current.has(pid)) return;
      aktifler.current.add(pid);
      setAlinanlar((a) => ({ ...a, [pid]: null }));
      const okumalar: KonumOkumasi[] = [];
      const baslangic = Date.now();
      let durdur: (() => void) | null = null;
      let bitti = false;
      let zamanlayici: ReturnType<typeof setInterval> | undefined;

      const bitir = (okuma: KonumOkumasi | null, hata?: unknown) => {
        if (bitti) return;
        bitti = true;
        clearInterval(zamanlayici);
        durdur?.();
        aktifler.current.delete(pid);
        setAlinanlar((a) => {
          const kalan = { ...a };
          delete kalan[pid];
          return kalan;
        });
        const { m: t, kesifler: l } = guncel.current;
        const ad = l.find((k) => k.id === kesifId)?.paratonerler.find((p) => p.id === pid)?.ad || '—';
        if (!okuma) {
          const kod = hata instanceof KonumHatasi ? hata.kod : 'DIGER';
          bildir(kod === 'IZIN' ? t.konumIzniYok : kod === 'YAKLASIK' ? t.konumYaklasik : kod === 'KAPALI' ? t.konumKapali : t.konumAlinamadi, 'hata');
          return;
        }
        const dogruluk = Number(okuma.dogruluk.toFixed(1));
        const konum = { lat: okuma.lat, lng: okuma.lng, dogruluk_m: dogruluk, zaman: new Date(okuma.zaman || Date.now()).toISOString(), kaynak: 'gps' as const };
        kesifGuncelle(kesifId, (k) => ({ ...k, paratonerler: k.paratonerler.map((p) => (p.id === pid ? { ...p, konum } : p)) }));
        const d = t.dogruluk(t.sayi(dogruluk, 1));
        bildir(dogruluk > 30 ? t.konumZayif(ad, d) : t.konumKaydedildi(ad, d), dogruluk > 30 ? 'hata' : 'basari');
      };

      const degerlendir = () => {
        const karar = yakalamaKarari(okumalar, Date.now() - baslangic, guncel.current.ayarlar.konumModu);
        if (karar.tur === 'tamam') bitir(karar.okuma);
        else if (karar.tur === 'yok') bitir(null);
      };
      zamanlayici = setInterval(degerlendir, 400);

      // Dokunmadan önce görülmüş bir okuma (başka bir noktanın konumu) bu noktaya yazılmaz.
      const oncekiEnSon = sonOkumaZamani.current;
      konumIzle(
        (o) => {
          if (bitti) return;
          sonOkumaZamani.current = Math.max(sonOkumaZamani.current, o.zaman);
          if (o.zaman <= oncekiEnSon) return;
          okumalar.push(o);
          setAlinanlar((a) => (pid in a ? { ...a, [pid]: Math.min(o.dogruluk, a[pid] ?? Infinity) } : a));
          degerlendir();
        },
        (h) => {
          // Tek okuma hatası (ör. zaman aşımı) izlemeyi bitirmez; hiç okuma gelmezse süre dolunca biter.
          if (h.kod !== 'DIGER') bitir(null, h);
        },
      )
        .then((d) => {
          if (bitti) d();
          else durdur = d;
        })
        .catch((h) => bitir(null, h));
    },
    [bildir, kesifGuncelle],
  );

  const deger = useMemo<Baglam>(
    () => ({
      m,
      ayarlar,
      ayarGuncelle,
      kesifler,
      kesifEkle: (k) => setKesifler((l) => [k, ...l]),
      kesifGuncelle,
      kesifSil: (id) => setKesifler((l) => l.filter((k) => k.id !== id)),
      hepsiniSil: () => setKesifler([]),
      alinanlar,
      konumAl,
      rota,
      git,
      geri,
      onayla: (i) => new Promise<boolean>((coz) => setOnay({ ...i, coz })),
      bildir,
    }),
    [m, ayarlar, ayarGuncelle, kesifler, kesifGuncelle, alinanlar, konumAl, rota, git, geri, bildir],
  );

  const onayKapat = (sonuc: boolean) => {
    onay?.coz(sonuc);
    setOnay(null);
  };

  return (
    <B.Provider value={deger}>
      {children}
      {onay && (
        <div className="perde" onClick={() => onayKapat(false)}>
          <div className="alt-pencere" role="alertdialog" aria-modal="true" aria-labelledby="onay-baslik" onClick={(e) => e.stopPropagation()}>
            <h2 id="onay-baslik" className="alt-pencere-baslik">
              {onay.baslik}
            </h2>
            {onay.aciklama && <p className="alt-pencere-aciklama">{onay.aciklama}</p>}
            <div className="alt-pencere-dugmeler">
              {!onay.bilgi && (
                <button type="button" className="ikincil-buton" onClick={() => onayKapat(false)}>
                  {m.vazgec}
                </button>
              )}
              <button type="button" className={onay.tehlikeli ? 'ui-buton-tehlike' : 'buton-birincil'} onClick={() => onayKapat(true)} autoFocus>
                {onay.onay ?? m.tamam}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bildirim-kap" aria-live="polite">
        {bildirimler.map((b) => (
          <div key={b.id} className={`bildirim bildirim-${b.tur}`}>
            {b.metin}
          </div>
        ))}
      </div>
    </B.Provider>
  );
}
