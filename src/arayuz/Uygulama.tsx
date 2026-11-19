import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sayi, type LatLng, type Paratoner, type Seviye, type Yapi } from '../core';
import { paratonerEkle, paratonerGuncelle, paratonerTasi, parselAyarla, poligonGuncelle, yapiEkle, yapiGuncelle } from './durum/eylemler';
import { useProje } from './durum/ProjeSaglayici';
import { useDosyaIslemleri } from './durum/useDosyaIslemleri';
import { Harita, type CizimModu, type HaritaApi, type HaritaGorunumu } from './harita/Harita';
import { useEtkilesim } from './ortak/Etkilesim';
import { CizimModuPaneli } from './paneller/CizimModuPaneli';
import { DurumCubugu } from './paneller/DurumCubugu';
import { GorunumPaneli } from './paneller/GorunumPaneli';
import { KotPaneli } from './paneller/KotPaneli';
import { Lejant } from './paneller/Lejant';
import { OgeListesi } from './paneller/OgeListesi';
import { ProjeParametreleriPaneli } from './paneller/ProjeParametreleriPaneli';
import { Sorumluluk } from './paneller/Sorumluluk';
import { AcilisPenceresi } from './pencereler/AcilisPenceresi';
import { AyarlarPenceresi, type AyarSekmesi } from './pencereler/AyarlarPenceresi';
import { HesapTablosu } from './pencereler/HesapTablosu';
import { ParatonerFormu } from './pencereler/ParatonerFormu';
import { RaporSihirbazi } from './pencereler/RaporSihirbazi';
import { KmlIceAktarPenceresi } from './pencereler/KmlIceAktarPenceresi';
import { useKmlIslemleri } from './durum/useKmlIslemleri';
import { StreetViewPaneli } from './pencereler/StreetViewPaneli';
import { HakkindaPenceresi } from './pencereler/HakkindaPenceresi';
import { KosullarPenceresi } from './pencereler/KosullarPenceresi';
import { KOSUL_SURUMU } from './ortak/yasal';
import { KisayollarPenceresi } from './pencereler/KisayollarPenceresi';
import { YapiFormu } from './pencereler/YapiFormu';
import { baslangicDosyasi, dosyaAcmaIstegiDinle, pencere } from './platform/tauri';
import { BaslikCubugu } from './ustbar/BaslikCubugu';
import { SagTikMenu } from './ustbar/SagTikMenu';
import { UstBar } from './ustbar/UstBar';

const ilkGorunum = (): HaritaGorunumu => ({ hEsikleri: new Set<number>(), seviyeler: new Set<Seviye>(['IV']), izolasyon: false, odakYapiId: null });

export function Uygulama() {
  const { proje, guncelle, geriAl, yinele, geriAlinabilir, yinelenebilir, kaydedilmemis, acilisNotu, ayarlar, ayarGuncelle } = useProje();
  const { onayla } = useEtkilesim();
  const haritaRef = useRef<HaritaApi | null>(null);

  const [mod, setMod] = useState<CizimModu>('yok');
  const [gorunum, setGorunum] = useState<HaritaGorunumu>(ilkGorunum);
  const [olcum, setOlcum] = useState<number | null>(null);
  const [streetView, setStreetView] = useState<LatLng | null>(null);
  const [yeniParatonerKonumu, setYeniParatonerKonumu] = useState<LatLng | null>(null);
  const [duzenlenenParatoner, setDuzenlenenParatoner] = useState<Paratoner | null>(null);
  const [yeniYapiPoligonu, setYeniYapiPoligonu] = useState<LatLng[] | null>(null);
  const [duzenlenenYapi, setDuzenlenenYapi] = useState<Yapi | null>(null);
  const [poligonDuzenlenen, setPoligonDuzenlenen] = useState<string | null>(null);
  const [acikPencere, setAcikPencere] = useState<'hesap' | 'rapor' | 'ayarlar' | 'hakkinda' | 'kisayollar' | null>(null);
  const [ayarSekmesi, setAyarSekmesi] = useState<AyarSekmesi>('proje');

  // Yalnızca geliştirme modunda: tarayıcıda uçtan uca test için harita API'si.
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __haritaApi?: typeof haritaRef }).__haritaApi = haritaRef;
  }, []);

  /** Başka bir proje yüklenince görünüm ve düzenleme durumu sıfırlanır. */
  const durumuSifirla = useCallback(() => {
    setMod('yok');
    setGorunum(ilkGorunum());
    setPoligonDuzenlenen(null);
    setStreetView(null);
    setOlcum(null);
    setYeniParatonerKonumu(null);
    setDuzenlenenParatoner(null);
    setYeniYapiPoligonu(null);
    setDuzenlenenYapi(null);
    setAcikPencere(null);
  }, []);
  const acildi = useCallback(() => {
    durumuSifirla();
    setTimeout(() => haritaRef.current?.projeyeOdakla(), 100);
  }, [durumuSifirla]);
  const yeniBasladi = useCallback(() => {
    durumuSifirla();
    haritaRef.current?.turkiye();
  }, [durumuSifirla]);
  const dosya = useDosyaIslemleri({ acildi, yeniBasladi });
  const kml = useKmlIslemleri();
  const { kaydet, farkliKaydet, ac, yeni } = dosya;

  // Pencere başlığı: proje adı ve kaydedilmemiş değişiklik işareti (•).
  useEffect(() => {
    pencere.baslikAyarla(`${kaydedilmemis ? '• ' : ''}${proje.isim || 'Proje'} — Paratoner Risk Analizi`).catch(() => {});
  }, [proje.isim, kaydedilmemis]);

  // Masaüstünde pencere kapatılırken kaydedilmemiş değişiklik sorulur.
  // Proje dosyasına çift tıklanarak açıldıysa ya da açıkken başka bir dosyaya çift tıklandıysa.
  const sonDosyaAcRef = useRef(dosya.sonDosyaAc);
  useLayoutEffect(() => {
    sonDosyaAcRef.current = dosya.sonDosyaAc;
  });
  useEffect(() => {
    let kaldir: (() => void) | undefined;
    let iptal = false;
    void baslangicDosyasi().then((yol) => {
      if (yol && !iptal) void sonDosyaAcRef.current(yol);
    });
    void dosyaAcmaIstegiDinle((yol) => void sonDosyaAcRef.current(yol)).then((k) => (iptal ? k() : (kaldir = k)));
    return () => {
      iptal = true;
      kaldir?.();
    };
  }, []);

  const koru = useRef(dosya.degisiklikleriKoru);
  useLayoutEffect(() => {
    koru.current = dosya.degisiklikleriKoru;
  });
  useEffect(() => {
    let kaldir: (() => void) | undefined;
    let iptal = false;
    pencere
      .kapanisiDinle(() => koru.current())
      .then((k) => (iptal ? k() : (kaldir = k)))
      .catch((e) => console.error('Kapanış dinlenemedi:', e));
    return () => {
      iptal = true;
      kaldir?.();
    };
  }, []);

  const ayarlariAc = useCallback((sekme: AyarSekmesi = 'proje') => {
    setAyarSekmesi(sekme);
    setAcikPencere('ayarlar');
  }, []);

  const modSec = useCallback(
    async (m: CizimModu) => {
      if (m === 'yapi' && proje.kot_seviyeleri.length === 0) {
        await onayla({ baslik: 'Önce kot seviyesi', aciklama: 'Yapı çizmeden önce sol panelden en az bir kot seviyesi (ör. "Zemin, 0 m") tanımlayın.', yalnizBilgi: true });
        return;
      }
      setMod((mevcut) => (mevcut === m ? 'yok' : m));
    },
    [proje.kot_seviyeleri.length, onayla],
  );

  // Genel klavye kısayolları. Çizim modlarında Ctrl+Z haritaya aittir (son noktayı geri alır).
  useEffect(() => {
    function tus(e: KeyboardEvent) {
      const hedef = e.target as HTMLElement | null;
      const yaziyor = !!hedef && (hedef.tagName === 'INPUT' || hedef.tagName === 'TEXTAREA' || hedef.isContentEditable);
      const cizimde = mod === 'yapi' || mod === 'parsel' || mod === 'olcum';
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) farkliKaydet();
        else kaydet();
      } else if (ctrl && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        ac();
      } else if (ctrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        yeni();
      } else if (e.key === 'F1') {
        e.preventDefault();
        setAcikPencere('kisayollar');
      } else if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey && !yaziyor && !cizimde) {
        e.preventDefault();
        geriAl();
      } else if (ctrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) && !yaziyor && !cizimde) {
        e.preventDefault();
        yinele();
      } else if (e.key === 'F11') {
        e.preventDefault();
        pencere.tamEkranGecis();
      } else if (e.key === 'Escape') {
        pencere.tamEkrandanCik();
      }
    }
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [mod, kaydet, farkliKaydet, ac, yeni, geriAl, yinele]);

  function poligonDuzenlemeBitir() {
    const id = poligonDuzenlenen;
    setPoligonDuzenlenen(null);
    const yapi = proje.yapilar.find((y) => y.id === id);
    if (yapi) setDuzenlenenYapi(yapi);
  }

  return (
    <div className="uygulama">
      <BaslikCubugu />
      <SagTikMenu
        geriAl={geriAl}
        yinele={yinele}
        geriAlinabilir={geriAlinabilir}
        yinelenebilir={yinelenebilir}
        projeyeOdakla={() => haritaRef.current?.projeyeOdakla()}
        turkiye={() => haritaRef.current?.turkiye()}
        kaydet={kaydet}
        farkliKaydet={farkliKaydet}
      />
      <UstBar
        dosya={dosya}
        kml={kml}
        git={(lat, lng) => haritaRef.current?.git(lat, lng)}
        merkez={() => haritaRef.current?.merkez() ?? null}
        hesapTablosuAc={() => setAcikPencere('hesap')}
        raporAc={() => setAcikPencere('rapor')}
        ayarlarAc={ayarlariAc}
        kisayollarAc={() => setAcikPencere('kisayollar')}
        hakkindaAc={() => setAcikPencere('hakkinda')}
      />

      <div className="govde">
        <aside className="yan-panel">
          <CizimModuPaneli mod={mod} modSec={modSec} />
          <ProjeParametreleriPaneli ayarlariAc={() => ayarlariAc('proje')} />
          <KotPaneli />
          <OgeListesi paratonerDuzenle={setDuzenlenenParatoner} yapiDuzenle={setDuzenlenenYapi} />
          <GorunumPaneli gorunum={gorunum} degistir={setGorunum} />
          <Sorumluluk />
        </aside>

        <main className="harita-alani">
          <Harita
            ref={haritaRef}
            mod={mod}
            moddanCik={() => setMod('yok')}
            gorunum={gorunum}
            poligonDuzenlenenYapiId={poligonDuzenlenen}
            streetViewKonumu={streetView}
            onParatonerKonumu={setYeniParatonerKonumu}
            onYapiPoligonu={setYeniYapiPoligonu}
            onParselPoligonu={(n) => {
              guncelle(parselAyarla(n));
              setMod('yok');
            }}
            onOlcum={setOlcum}
            onStreetView={(k) => {
              setStreetView(k);
              setMod('yok');
            }}
            onOgeTikla={(tur, id) => {
              if (tur === 'yapi' && gorunum.izolasyon) return setGorunum({ ...gorunum, odakYapiId: id });
              if (tur === 'yapi') setDuzenlenenYapi(proje.yapilar.find((y) => y.id === id) ?? null);
              else setDuzenlenenParatoner(proje.paratonerler.find((p) => p.id === id) ?? null);
            }}
            onParatonerTasi={(id, k) => guncelle(paratonerTasi(id, k))}
            onPoligonGuncelle={(id, poligon) => guncelle(poligonGuncelle(id, poligon))}
          />
          <Lejant gorunum={gorunum} />
          {olcum !== null && <div className="olcut-sonuc">Toplam mesafe: {sayi(olcum)} m</div>}
          {poligonDuzenlenen && (
            <div className="olcut-sonuc">
              Poligon köşelerini sürükleyerek düzenleyin.
              <button className="mini-buton sol-bosluk" onClick={poligonDuzenlemeBitir}>
                Bitir
              </button>
            </div>
          )}
          {streetView && <StreetViewPaneli konum={streetView} kapat={() => setStreetView(null)} ayarlariAc={() => ayarlariAc('harita')} />}
        </main>
      </div>
      <DurumCubugu hesapTablosuAc={() => setAcikPencere('hesap')} ayarlariAc={() => ayarlariAc('proje')} />

      {(yeniParatonerKonumu || duzenlenenParatoner) && (
        <ParatonerFormu
          key={duzenlenenParatoner?.id ?? 'yeni'}
          konum={yeniParatonerKonumu}
          duzenlenen={duzenlenenParatoner}
          kapat={() => {
            setYeniParatonerKonumu(null);
            setDuzenlenenParatoner(null);
          }}
          kaydet={(pr) => {
            if (duzenlenenParatoner) guncelle(paratonerGuncelle(pr.id, pr));
            else {
              guncelle(paratonerEkle(pr));
              setMod('yok');
            }
            setYeniParatonerKonumu(null);
            setDuzenlenenParatoner(null);
          }}
        />
      )}

      {(yeniYapiPoligonu || duzenlenenYapi) && (
        <YapiFormu
          key={duzenlenenYapi?.id ?? 'yeni'}
          poligon={yeniYapiPoligonu}
          duzenlenen={duzenlenenYapi}
          kapat={() => {
            setYeniYapiPoligonu(null);
            setDuzenlenenYapi(null);
          }}
          kaydet={(y) => {
            if (duzenlenenYapi) guncelle(yapiGuncelle(y.id, y));
            else {
              guncelle(yapiEkle(y));
              setMod('yok');
            }
            setYeniYapiPoligonu(null);
            setDuzenlenenYapi(null);
          }}
          poligonDuzenle={(id) => {
            setDuzenlenenYapi(null);
            setPoligonDuzenlenen(id);
          }}
        />
      )}

      {acikPencere === 'hesap' && <HesapTablosu kapat={() => setAcikPencere(null)} />}
      {acikPencere === 'rapor' && <RaporSihirbazi kapat={() => setAcikPencere(null)} harita={haritaRef} />}
      {acikPencere === 'ayarlar' && <AyarlarPenceresi kapat={() => setAcikPencere(null)} ilkSekme={ayarSekmesi} kurtarmaAc={dosya.kurtarmaAc} />}
      {acikPencere === 'hakkinda' && <HakkindaPenceresi kapat={() => setAcikPencere(null)} />}
      {acikPencere === 'kisayollar' && <KisayollarPenceresi kapat={() => setAcikPencere(null)} />}
      {kml.onizleme && (
        <KmlIceAktarPenceresi
          belge={kml.onizleme.belge}
          dosyaAdi={kml.onizleme.dosyaAdi}
          kapat={kml.onizlemeKapat}
          eklendi={() => setTimeout(() => haritaRef.current?.projeyeOdakla(), 100)}
        />
      )}
      {acilisNotu && <AcilisPenceresi not={acilisNotu} />}
      {ayarlar.kosullarKabul !== KOSUL_SURUMU && <KosullarPenceresi kabulEt={() => ayarGuncelle({ kosullarKabul: KOSUL_SURUMU })} />}
    </div>
  );
}
