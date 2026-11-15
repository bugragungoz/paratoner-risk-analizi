// Uygulamanın tek durum kaynağı: proje, geçmiş, hesap sonucu, dosya durumu ve uygulama ayarları.

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { onbellekliHesap, yeniProje, type Proje, type ProjeSonucu } from '../../core';
import { ANAHTARSIZ, anahtarDurumu, type AnahtarDurumu } from '../harita/servisler';
import { useEtkilesim } from '../ortak/Etkilesim';
import { Wordmark } from '../ortak/Logo';
import { otomatikKayitYaz, tauriMi } from '../platform/tauri';
import { ayarlariKaydet, ayarlariYukle, etkinTema, type UygulamaAyarlari } from './ayarlar';
import { BOS_DEPO, depoIndirgeyici } from './depo';
import {
  YEDEK_ARALIGI_MS,
  kayitIcerigi,
  oturumKaydet,
  oturumYukle,
  sonDosyaCikar,
  sonDosyaEkle,
  sonDosyalariOku,
  sonDosyalariYaz,
  zamanEtiketi,
  type AcilanProje,
  type SonDosya,
} from './kalicilik';

/** Açılan projeyle ilgili, kullanıcıya bir kez gösterilecek bilgiler. */
export interface AcilisNotu {
  uyarilar: string[];
  /** Eski sürümden gelen ΔT'nin onaylanması gerekiyor. */
  deltaTOnayi: boolean;
}

export interface ProjeBaglami {
  proje: Proje;
  /** Harita, tablo, CSV ve raporun kullandığı TEK hesap sonucu. */
  sonuc: ProjeSonucu;
  guncelle: (fn: (p: Proje) => Proje, birlestir?: string) => void;
  geriAl: () => void;
  yinele: () => void;
  geriAlinabilir: boolean;
  yinelenebilir: boolean;

  /** Kaydet'in yazacağı .ptproj dosyası (yoksa Kaydet, yeni dosya sorar). */
  dosyaYolu: string | null;
  dosyaAdi: string | null;
  /** Proje en son kaydedilen/açılan halinden farklı. Geri alarak o hale dönülürse false olur. */
  kaydedilmemis: boolean;
  /** Dosyadan açılan ya da kurtarılan projeyi yükler (geçmiş sıfırlanır). */
  projeAc: (acilan: AcilanProje, kaynakYolu?: string | null) => void;
  yeniProjeBaslat: () => void;
  /** Proje bir dosyaya kaydedildi (tarayıcıda indirildi). */
  kaydedildi: (p: Proje, yol: string | null, ad: string) => void;

  sonDosyalar: SonDosya[];
  sonDosyaKaldir: (yol: string) => void;
  acilisNotu: AcilisNotu | null;
  acilisNotuKapat: () => void;
  /** Masaüstünde son başarılı otomatik kayıt. */
  sonOtomatikKayit: { yol: string; zaman: number } | null;

  ayarlar: UygulamaAyarlari;
  ayarGuncelle: (degisiklik: Partial<UygulamaAyarlari>) => void;
  /** Hangi harita servisinin anahtarı kayıtlı (anahtarın kendisi değil). */
  haritaAnahtarlari: AnahtarDurumu;
  haritaAnahtarlariYenile: () => Promise<void>;
}

const Baglam = createContext<ProjeBaglami | null>(null);

export function useProje(): ProjeBaglami {
  const b = useContext(Baglam);
  if (!b) throw new Error('useProje, ProjeSaglayici içinde kullanılmalı.');
  return b;
}

interface Kaynak {
  dosyaYolu: string | null;
  dosyaAdi: string | null;
}

const notOlustur = (a: AcilanProje): AcilisNotu | null =>
  a.uyarilar.length || a.proje.deltaT_onay_gerekli ? { uyarilar: a.uyarilar, deltaTOnayi: !!a.proje.deltaT_onay_gerekli } : null;

export function ProjeSaglayici({ children }: { children: ReactNode }) {
  const { bildir } = useEtkilesim();
  const [depo, dispatch] = useReducer(depoIndirgeyici, BOS_DEPO);
  const [ayarlar, setAyarlar] = useState<UygulamaAyarlari>(ayarlariYukle);
  const [haritaAnahtarlari, setHaritaAnahtarlari] = useState<AnahtarDurumu>(ANAHTARSIZ);
  const haritaAnahtarlariYenile = useCallback(async () => setHaritaAnahtarlari(await anahtarDurumu()), []);
  useEffect(() => {
    let iptal = false;
    anahtarDurumu().then((d) => !iptal && setHaritaAnahtarlari(d));
    return () => {
      iptal = true;
    };
  }, []);
  const [kaynak, setKaynak] = useState<Kaynak>({ dosyaYolu: null, dosyaAdi: null });
  /** En son kaydedilen/açılan proje nesnesi; değişiklik olup olmadığı buna göre anlaşılır. */
  const [kaydedilen, setKaydedilen] = useState<Proje | null>(null);
  const [sonDosyalar, setSonDosyalar] = useState<SonDosya[]>(sonDosyalariOku);
  const [acilisNotu, setAcilisNotu] = useState<AcilisNotu | null>(null);
  const [sonOtomatikKayit, setSonOtomatikKayit] = useState<{ yol: string; zaman: number } | null>(null);

  const proje = depo.proje;
  const kaydedilmemis = !!proje && proje !== kaydedilen;

  const sonDosyaya = useCallback((yol: string, ad: string) => {
    setSonDosyalar((l) => {
      const yeni = sonDosyaEkle(l, { yol, ad, zaman: Date.now() });
      sonDosyalariYaz(yeni);
      return yeni;
    });
  }, []);

  const projeAc = useCallback(
    (a: AcilanProje, kaynakYolu?: string | null) => {
      dispatch({ tur: 'yukle', proje: a.proje });
      setKaynak({ dosyaYolu: a.dosyaYolu, dosyaAdi: a.dosyaAdi });
      setKaydedilen(a.kaydedilmemis ? null : a.proje);
      setAcilisNotu(notOlustur(a));
      if (kaynakYolu && tauriMi()) sonDosyaya(kaynakYolu, a.dosyaAdi ?? kaynakYolu);
    },
    [sonDosyaya],
  );

  // İlk açılış: son çalışma oturumu (yoksa eski sürümün oturumu, o da yoksa yeni proje).
  useEffect(() => {
    let iptal = false;
    oturumYukle().then(({ acilan, hata }) => {
      if (iptal) return;
      if (acilan) projeAc(acilan);
      else {
        const p = yeniProje('Yeni Proje');
        dispatch({ tur: 'yukle', proje: p });
        setKaydedilen(p);
      }
      if (hata) bildir(hata, 'hata');
    });
    return () => {
      iptal = true;
    };
  }, [projeAc, bildir]);

  useEffect(() => {
    ayarlariKaydet(ayarlar);
  }, [ayarlar]);

  // Tema; "sistem" seçiliyse Windows'un açık/koyu ayarı değiştikçe izlenir.
  useEffect(() => {
    const uygula = () => document.documentElement.setAttribute('data-tema', etkinTema(ayarlar.tema));
    uygula();
    if (ayarlar.tema !== 'sistem') return;
    const sorgu = window.matchMedia('(prefers-color-scheme: light)');
    sorgu.addEventListener('change', uygula);
    return () => sorgu.removeEventListener('change', uygula);
  }, [ayarlar.tema]);

  // Çalışma oturumu tarayıcı belleğine yazılır (yenileme ya da çökme sonrası kaldığı yerden devam).
  const sonDurum = useRef<{ proje: Proje; kaynak: Kaynak; kaydedilmemis: boolean } | null>(null);
  useEffect(() => {
    if (!proje) return;
    sonDurum.current = { proje, kaynak, kaydedilmemis };
    const z = setTimeout(() => oturumKaydet(proje, { ...kaynak, kaydedilmemis }), 300);
    return () => clearTimeout(z);
  }, [proje, kaynak, kaydedilmemis]);
  useEffect(() => {
    const bosalt = () => {
      const d = sonDurum.current;
      if (d) oturumKaydet(d.proje, { ...d.kaynak, kaydedilmemis: d.kaydedilmemis });
    };
    window.addEventListener('pagehide', bosalt);
    return () => window.removeEventListener('pagehide', bosalt);
  }, []);

  // Masaüstünde otomatik kayıt: yalnızca kaydedilmemiş değişiklik varken, kısa gecikmeyle.
  // Proje başına en çok 10 dakikada bir zaman damgalı yedek de alınır.
  const sonYedek = useRef(new Map<string, number>());
  const otomatikHataGosterildi = useRef(false);
  useEffect(() => {
    if (!proje || !kaydedilmemis || !ayarlar.otomatikKayit || !tauriMi()) return;
    const konum = ayarlar.otomatikKayitKonumu;
    const z = setTimeout(async () => {
      const simdi = Date.now();
      const onceki = sonYedek.current.get(proje.id);
      const yedekle = onceki === undefined || simdi - onceki >= YEDEK_ARALIGI_MS;
      try {
        const s = await otomatikKayitYaz(konum, proje.id, proje.isim, kayitIcerigi(proje), yedekle ? zamanEtiketi() : null);
        if (yedekle) sonYedek.current.set(proje.id, simdi);
        setSonOtomatikKayit({ yol: s.yol, zaman: simdi });
        otomatikHataGosterildi.current = false;
      } catch (e) {
        console.error('Otomatik kayıt başarısız:', e);
        if (!otomatikHataGosterildi.current) {
          otomatikHataGosterildi.current = true;
          bildir(`Otomatik kayıt yapılamadı: ${e instanceof Error ? e.message : String(e)}`, 'hata');
        }
      }
    }, 1500);
    return () => clearTimeout(z);
  }, [proje, kaydedilmemis, ayarlar.otomatikKayit, ayarlar.otomatikKayitKonumu, bildir]);

  // Rapor numarası, adres, proje adı gibi hesaba girmeyen alanlar yazılırken hesap yinelenmez:
  // büyük projede her tuşta yüzlerce milisaniyelik hesap, yazmayı takılır hale getiriyordu.
  const [hesapla] = useState(onbellekliHesap);
  const sonuc = useMemo(() => (proje ? hesapla(proje) : null), [proje, hesapla]);

  const guncelle = useCallback((fn: (p: Proje) => Proje, birlestir?: string) => {
    dispatch(birlestir === undefined ? { tur: 'guncelle', fn } : { tur: 'guncelle', fn, birlestir });
  }, []);
  const geriAl = useCallback(() => dispatch({ tur: 'geriAl' }), []);
  const yinele = useCallback(() => dispatch({ tur: 'yinele' }), []);
  const ayarGuncelle = useCallback((d: Partial<UygulamaAyarlari>) => setAyarlar((a) => ({ ...a, ...d })), []);

  const yeniProjeBaslat = useCallback(() => {
    const p = yeniProje('Yeni Proje');
    dispatch({ tur: 'yukle', proje: p });
    setKaynak({ dosyaYolu: null, dosyaAdi: null });
    setKaydedilen(p);
    setAcilisNotu(null);
  }, []);

  const kaydedildi = useCallback(
    (p: Proje, yol: string | null, ad: string) => {
      setKaydedilen(p);
      setKaynak({ dosyaYolu: yol, dosyaAdi: ad });
      if (yol) sonDosyaya(yol, ad);
    },
    [sonDosyaya],
  );

  const sonDosyaKaldir = useCallback((yol: string) => {
    setSonDosyalar((l) => {
      const yeni = sonDosyaCikar(l, yol);
      sonDosyalariYaz(yeni);
      return yeni;
    });
  }, []);
  const acilisNotuKapat = useCallback(() => setAcilisNotu(null), []);

  const deger = useMemo<ProjeBaglami | null>(
    () =>
      proje && sonuc
        ? {
            proje,
            sonuc,
            guncelle,
            geriAl,
            yinele,
            geriAlinabilir: depo.gecmis.length > 0,
            yinelenebilir: depo.gelecek.length > 0,
            dosyaYolu: kaynak.dosyaYolu,
            dosyaAdi: kaynak.dosyaAdi,
            kaydedilmemis,
            projeAc,
            yeniProjeBaslat,
            kaydedildi,
            sonDosyalar,
            sonDosyaKaldir,
            acilisNotu,
            acilisNotuKapat,
            sonOtomatikKayit,
            ayarlar,
            ayarGuncelle,
            haritaAnahtarlari,
            haritaAnahtarlariYenile,
          }
        : null,
    [
      proje,
      sonuc,
      guncelle,
      geriAl,
      yinele,
      depo.gecmis.length,
      depo.gelecek.length,
      kaynak,
      kaydedilmemis,
      projeAc,
      yeniProjeBaslat,
      kaydedildi,
      sonDosyalar,
      sonDosyaKaldir,
      acilisNotu,
      acilisNotuKapat,
      sonOtomatikKayit,
      ayarlar,
      ayarGuncelle,
      haritaAnahtarlari,
      haritaAnahtarlariYenile,
    ],
  );

  if (!deger)
    return (
      <div className="yukleniyor-ekrani">
        <Wordmark />
        <span>Proje yükleniyor…</span>
      </div>
    );
  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>;
}
