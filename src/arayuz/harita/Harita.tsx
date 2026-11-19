// Harita: çizim modları, yapılar, paratonerler, referans çemberleri ve kapsama.
// Kapsama (yeşil/kırmızı) ve odak modundaki gerçek Rp çemberleri DOĞRUDAN hesap çekirdeğinin
// sonucundan çizilir; harita kendi başına hesap yapmaz (v5'teki M3/M4/M7 sorunları).

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import L from 'leaflet';
import { bearing, booleanIntersects, centerOfMass, circle, destination, distance, point } from '@turf/turf';
import { elipsoitMesafe, etkinDeltaT, poligonaDonustur, rpOku, sayi, type LatLng, type Proje, type ProjeSonucu, type Seviye } from '../../core';
import { useProje } from '../durum/ProjeSaglayici';
import { useEtkilesim } from '../ortak/Etkilesim';
import { etkinKatman, karoAdresi, katmanTanimi } from './katmanlar';
import { googleTelif } from './servisler';
import googleLogoUrl from '../gorseller/google-maps-logo.svg?url';
import { metinOgesi, satirliOge } from './metin';
import { haritaSekliniSusle, type LejantOgesi } from './sekil';
import { AltlikKatmani } from './altlikKatmani';
import type { AltlikAyari, DxfAltligi } from '../../core';

/** Fare haritada gezerken yayılan olay; ayrıntı: imlecin koordinatı ya da harita dışındaysa null. */
export const IMLEC_OLAYI = 'harita-imlec';

export type CizimModu = 'yok' | 'paratoner' | 'yapi' | 'parsel' | 'olcum' | 'streetview' | 'altlik';

export interface HaritaGorunumu {
  /** Referans çemberi çizilecek h değerleri. */
  hEsikleri: Set<number>;
  /** Referans çemberi çizilecek koruma seviyeleri. */
  seviyeler: Set<Seviye>;
  /** Seçili yapı izolasyonu: yalnızca odak yapı ve onun gerçek Rp çemberleri. */
  izolasyon: boolean;
  odakYapiId: string | null;
}

export interface HaritaApi {
  git: (lat: number, lng: number, zoom?: number) => void;
  turkiye: () => void;
  merkez: () => { lat: number; lng: number } | null;
  /** Haritayı parsel sınırına ya da yapı/paratonerlere sığdırır ve karoların yüklenmesini bekler. */
  projeyeOdakla: () => Promise<void>;
  /** Rapor şekli: ölçek, kuzey oku, lejant ve sağlayıcı atfı çizilmiş JPEG görüntü. */
  goruntuAl: () => Promise<{ url: string; atif: string } | null>;
  /** Noktaya en yakın görünür altlık köşesi (ekranda en çok 14 px). */
  altlikKosesi: (n: LatLng) => LatLng | null;
  /** Noktaya en yakın yapı köşesi ya da paratoner (ekranda en çok 14 px). */
  ogeKosesi: (n: LatLng) => LatLng | null;
  /** Haritayı altlığın tamamına sığdırır. */
  altligaGit: () => void;
}

/** Haritada gösterilecek altlık ve iki nokta hizalamasında seçilen noktalar. */
export interface AltlikGorunumu {
  cozum: DxfAltligi;
  ayar: AltlikAyari;
  /** Çizimde seçilen noktalar (camgöbeği) ve haritadaki karşılıkları (yeşil). */
  cizimNoktalari: LatLng[];
  haritaNoktalari: LatLng[];
}

interface Props {
  mod: CizimModu;
  moddanCik: () => void;
  gorunum: HaritaGorunumu;
  poligonDuzenlenenYapiId: string | null;
  streetViewKonumu: LatLng | null;
  onParatonerKonumu: (konum: LatLng) => void;
  onYapiPoligonu: (noktalar: LatLng[]) => void;
  onParselPoligonu: (noktalar: LatLng[]) => void;
  onOlcum: (metre: number | null) => void;
  altlik: AltlikGorunumu | null;
  /** Altlık hizalama modunda haritaya tıklandı. */
  onAltlikNoktasi: (nokta: LatLng) => void;
  onStreetView: (konum: LatLng) => void;
  onOgeTikla: (tur: 'paratoner' | 'yapi', id: string) => void;
  onParatonerTasi: (id: string, konum: LatLng) => void;
  onPoligonGuncelle: (yapiId: string, poligon: LatLng[]) => void;
}

const TURKIYE: [number, number] = [39.0, 35.0];
const ESIK_RENKLERI = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6'];
const SEVIYE_CIZGISI: Record<Seviye, string | undefined> = { I: undefined, II: '12 6', III: '6 6', IV: '2 4' };
const RENK = { kapsanan: '#22c55e', acik: '#ef4444', odak: '#f59e0b', cizimYapi: '#3b82f6', cizimParsel: '#71717a', olcum: '#3b82f6' };

const paratonerIkonu = (pasif: boolean) =>
  L.divIcon({ className: `paratoner-marker${pasif ? ' pasif' : ''}`, html: '<div class="paratoner-marker-ic"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
const STREETVIEW_IKON = L.divIcon({ className: 'streetview-marker', html: '<div class="streetview-marker-ic"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
const KOSE_IKON = L.divIcon({ className: 'poligon-kose-marker', html: '<div class="poligon-kose-ic"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });

const ll = (n: LatLng): L.LatLngExpression => [n.lat, n.lng];

/** Karo katmanının görünür karoları yüklenene kadar bekler (en çok 4 sn). */
function karolarYuklensin(katman: L.TileLayer): Promise<void> {
  return new Promise((coz) => {
    const z = setTimeout(coz, 4000);
    katman.once('load', () => {
      clearTimeout(z);
      setTimeout(coz, 300);
    });
  });
}

/** Google Maps logosu (Google'ın resmi atıf görseli, açık renk dış çizgili; 18 px yükseklik). */
const GoogleLogosu = L.Control.extend({
  onAdd() {
    const kap = L.DomUtil.create('div', 'google-logo');
    const img = L.DomUtil.create('img', '', kap);
    img.src = googleLogoUrl;
    img.alt = 'Google Maps';
    img.height = 18;
    return kap;
  },
});

const gorselYukle = (url: string) =>
  new Promise<HTMLImageElement | null>((coz) => {
    const img = new Image();
    img.onload = () => coz(img);
    img.onerror = () => coz(null);
    img.src = url;
  });

const htmlKacir = (m: string) => m.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Proje alanı: parsel sınırı, yoksa yapılar ve paratonerler. */
function projeSiniri(p: Proje): L.LatLngBounds {
  const sinir = L.latLngBounds([]);
  if (p.parsel_siniri && p.parsel_siniri.length >= 3) p.parsel_siniri.forEach((n) => sinir.extend(ll(n)));
  else {
    p.yapilar.forEach((y) => y.poligon.forEach((n) => sinir.extend(ll(n))));
    p.paratonerler.forEach((pr) => sinir.extend([pr.lat, pr.lng]));
  }
  return sinir;
}

/** Rapor şekli için kırpma alanı (CSS pikseli): proje alanı + pay; lejant sığacak en küçük boyut. */
function kirpmaAlani(harita: L.Map, sinir: L.LatLngBounds, W: number, H: number) {
  if (!sinir.isValid()) return { x: 0, y: 0, w: W, h: H };
  const a = harita.latLngToContainerPoint(sinir.getNorthWest());
  const b = harita.latLngToContainerPoint(sinir.getSouthEast());
  const pay = 70;
  const aralik = (bas: number, son: number, enAz: number, sinirBoyu: number) => {
    let x0 = Math.min(bas, son) - pay;
    let x1 = Math.max(bas, son) + pay;
    if (x1 - x0 < enAz) {
      const orta = (x0 + x1) / 2;
      x0 = orta - enAz / 2;
      x1 = orta + enAz / 2;
    }
    x0 = Math.max(0, x0);
    x1 = Math.min(sinirBoyu, x1);
    return [x0, x1 - x0] as const;
  };
  const [x, w] = aralik(a.x, b.x, 560, W);
  // Çok basık şekil olmasın: yükseklik en az genişliğin yarısı.
  const [y, h] = aralik(a.y, b.y, Math.max(360, w * 0.5), H);
  return { x, y, w, h };
}

/** Rapor şeklinin lejantı: haritada o an görünen öğeler. */
function sekilLejanti(p: Proje, s: ProjeSonucu, kapsamaGoster: boolean, g: HaritaGorunumu): LejantOgesi[] {
  const css = getComputedStyle(document.documentElement);
  const l: LejantOgesi[] = [{ tur: 'nokta', renk: css.getPropertyValue('--info').trim() || '#3b82f6', metin: 'Paratoner' }];
  if (p.paratonerler.some((x) => x.aktif_mi === false)) l.push({ tur: 'nokta', renk: '#9ca3af', metin: 'Devre dışı paratoner (hesaba katılmaz)' });
  if (kapsamaGoster) {
    if (s.yapilar.some((y) => y.kapsama?.kapsananGeoJSON)) l.push({ tur: 'alan', renk: RENK.kapsanan, metin: 'Korunan yapı alanı' });
    if (s.yapilar.some((y) => y.kapsama?.acikGeoJSON)) l.push({ tur: 'alan', renk: RENK.acik, metin: 'Açıkta kalan yapı alanı' });
  }
  if (p.parsel_siniri && p.parsel_siniri.length >= 3) l.push({ tur: 'cizgi', renk: '#9ca3af', metin: 'Parsel sınırı', kesikli: true });
  if (g.izolasyon) l.push({ tur: 'cizgi', renk: RENK.odak, metin: 'Odak yapı için gerçek Rp', kesikli: true });
  else if (g.seviyeler.size > 0) {
    // Haritadaki renk sırasıyla aynı: seçili h değerleri küçükten büyüğe.
    const seviyeler = [...g.seviyeler].join(', ');
    const etkinler = p.paratonerler.filter((x) => x.aktif_mi !== false);
    [...g.hEsikleri]
      .sort((a, b) => a - b)
      .forEach((h, i) => {
        if (!etkinler.some((x) => x.h_esikleri.includes(h))) return;
        l.push({ tur: 'cizgi', renk: ESIK_RENKLERI[i % ESIK_RENKLERI.length] as string, metin: `h = ${sayi(h, h % 1 ? 1 : 0)} m referans çemberi (Seviye ${seviyeler})` });
      });
  }
  return l;
}

export const Harita = forwardRef<HaritaApi, Props>(function Harita(props, ref) {
  const { proje, sonuc, ayarlar, haritaAnahtarlari } = useProje();
  const { onayla, bildir } = useEtkilesim();
  /** Atıf (düz metin): `harita` haritanın köşesinde, `sekil` rapor şeklinde, `kaynak` raporun Kaynaklar bölümünde. */
  const atifMetni = useRef({ sekil: '', kaynak: '', googleLogosu: false });

  const kapRef = useRef<HTMLDivElement>(null);
  const haritaRef = useRef<L.Map | null>(null);
  const karoRef = useRef<L.TileLayer | null>(null);
  const katman = useRef<Record<'parsel' | 'yapi' | 'kapsama' | 'paratoner' | 'cizim' | 'olcum' | 'streetview' | 'kose' | 'altlikIsaret', L.LayerGroup> | null>(null);
  const altlikKatmani = useRef<AltlikKatmani | null>(null);

  // Olay işleyicilerinin her zaman güncel değerleri görmesi için (her çizimden sonra güncellenir).
  const guncel = useRef({ props, proje, onayla, sonuc, ayarlar });
  useLayoutEffect(() => {
    guncel.current = { props, proje, onayla, sonuc, ayarlar };
  });
  const cizilen = useRef<LatLng[]>([]);
  const olcumNoktalari = useRef<LatLng[]>([]);

  // ---------------------------------------------------------------- Kurulum
  useEffect(() => {
    if (!kapRef.current || haritaRef.current) return;
    const harita = L.map(kapRef.current, {
      center: TURKIYE,
      zoom: 6,
      minZoom: 4,
      preferCanvas: true, // html2canvas ile rapor görüntüsü için
      // Karo solma animasyonu tarayıcının kare döngüsüne bağlıdır; pencere arka plandayken karolar
      // görünmez kalıp rapor görüntüsü boş çıkıyordu. Animasyonsuz karolar yüklendiği an görünür.
      fadeAnimation: false,
      worldCopyJump: false,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 1,
    });
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft', maxWidth: 150 }).addTo(harita);
    // Durum çubuğundaki imleç koordinatı. Olay olarak yayılır; her fare hareketinde uygulama yeniden çizilmesin.
    const imlecBildir = (konum: LatLng | null) => window.dispatchEvent(new CustomEvent<LatLng | null>(IMLEC_OLAYI, { detail: konum }));
    harita.on('mousemove', (e) => imlecBildir({ lat: e.latlng.lat, lng: e.latlng.lng }));
    harita.on('mouseout', () => imlecBildir(null));
    harita.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a>');
    haritaRef.current = harita;
    katman.current = {
      parsel: L.layerGroup().addTo(harita),
      yapi: L.layerGroup().addTo(harita),
      kapsama: L.layerGroup().addTo(harita),
      paratoner: L.layerGroup().addTo(harita),
      cizim: L.layerGroup().addTo(harita),
      olcum: L.layerGroup().addTo(harita),
      streetview: L.layerGroup().addTo(harita),
      kose: L.layerGroup().addTo(harita),
      altlikIsaret: L.layerGroup().addTo(harita),
    };
    return () => {
      harita.remove();
      haritaRef.current = null;
      katman.current = null;
    };
  }, []);

  // ---------------------------------------------------------------- Karo katmanı
  useEffect(() => {
    const harita = haritaRef.current;
    if (!harita) return;
    karoRef.current?.remove();
    const ad = etkinKatman(ayarlar.katman, haritaAnahtarlari);
    const t = katmanTanimi(ad);
    const katman = L.tileLayer(karoAdresi(ad), { ...t.options, crossOrigin: 'anonymous' });
    let hataSayisi = 0;
    katman.on('tileerror', () => {
      hataSayisi += 1;
      if (hataSayisi === 8 && t.saglayici) bildir(`${t.isim} karoları alınamıyor. Anahtarı Ayarlar > Harita servisleri'nden deneyin.`, 'hata');
    });
    karoRef.current = katman.addTo(harita);

    // Atıf: Leaflet metni HTML olarak yazar; sunucudan gelen telif metni kaçırılarak eklenir.
    const kontrol = harita.attributionControl;
    let eklenen = '';
    const google = t.saglayici === 'google';
    // Google: logo sol altta (Google'ın atıf kuralı: logo, mümkünse yazı yerine); telif metni sağ altta.
    const logo = google ? new GoogleLogosu({ position: 'bottomleft' }).addTo(harita) : null;
    const atifYaz = (telif: string) => {
      if (eklenen) kontrol.removeAttribution(eklenen);
      const haritada = google ? telif : t.atif;
      eklenen = htmlKacir(haritada);
      atifMetni.current = { sekil: haritada, kaynak: google ? (telif ? `Google Maps · ${telif}` : 'Google Maps') : t.atif, googleLogosu: google };
      if (eklenen) kontrol.addAttribution(eklenen);
    };
    atifYaz('');
    let iptal = false;
    let zaman: ReturnType<typeof setTimeout> | undefined;
    // Google: telif metni görünen alana göre değişir (Map Tiles API viewport bilgisi).
    const telif = () => {
      clearTimeout(zaman);
      zaman = setTimeout(async () => {
        const b = harita.getBounds();
        const sinirla = (v: number, s: number) => Math.max(-s, Math.min(s, v));
        try {
          const c = await googleTelif(ad, Math.round(harita.getZoom()), {
            kuzey: sinirla(b.getNorth(), 89.99),
            guney: sinirla(b.getSouth(), 89.99),
            dogu: sinirla(b.getEast(), 179.99),
            bati: sinirla(b.getWest(), 179.99),
          });
          if (!iptal) atifYaz(c);
        } catch {
          // Telif metni alınamazsa "Google Maps" atfı kalır.
        }
      }, 500);
    };
    if (t.saglayici === 'google') {
      telif();
      harita.on('moveend', telif);
    }
    return () => {
      iptal = true;
      clearTimeout(zaman);
      harita.off('moveend', telif);
      if (eklenen) kontrol.removeAttribution(eklenen);
      logo?.remove();
      atifMetni.current = { sekil: '', kaynak: '', googleLogosu: false };
    };
  }, [ayarlar.katman, haritaAnahtarlari, bildir]);

  // ---------------------------------------------------------------- Dış API
  useImperativeHandle(ref, () => ({
    git(lat, lng, zoom = 18) {
      haritaRef.current?.flyTo([lat, lng], zoom, { duration: 1.2 });
    },
    turkiye() {
      haritaRef.current?.setView(TURKIYE, 6);
    },
    merkez() {
      const m = haritaRef.current?.getCenter();
      return m ? { lat: m.lat, lng: m.lng } : null;
    },
    async projeyeOdakla() {
      const harita = haritaRef.current;
      if (!harita) return;
      const sinir = projeSiniri(guncel.current.proje);
      if (!sinir.isValid()) return;
      harita.fitBounds(sinir, { padding: [40, 40], animate: false });
      if (karoRef.current) await karolarYuklensin(karoRef.current);
    },
    async goruntuAl() {
      const kap = kapRef.current;
      const harita = haritaRef.current;
      if (!kap || !harita) return null;
      try {
        const { default: html2canvas } = await import('html2canvas');
        // Leaflet'in kendi düğmeleri ve ölçeği şekle girmez; ölçek ve atıf aşağıda yeniden çizilir.
        // Altlık yalnızca çizim yardımcısıdır: rapor şekline girmez.
        const tuval = await html2canvas(kap, {
          useCORS: true,
          allowTaint: false,
          logging: false,
          ignoreElements: (el) => el.classList?.contains('leaflet-control-container') || el.classList?.contains('altlik-tuval'),
        });
        const { proje: p, sonuc: s, ayarlar: a, props: pr } = guncel.current;
        const cy = kap.clientHeight / 2;
        const cx = kap.clientWidth / 2;
        const metrePerPx = harita.distance(harita.containerPointToLatLng([cx - 50, cy]), harita.containerPointToLatLng([cx + 50, cy])) / 100;
        const atif = atifMetni.current;
        const logoGorseli = atif.googleLogosu ? await gorselYukle(googleLogoUrl) : null;
        // Şekil sahanın çevresine kırpılır (tam sayı yakınlaştırmada saha pencerenin yarısını
        // kaplayabiliyor) ve süslemeler, html2canvas'ın bıraktığı kırpma/dönüşüm durumundan
        // etkilenmemesi için yeni bir tuvalde çizilir.
        const o = tuval.width / kap.clientWidth;
        const k = kirpmaAlani(harita, projeSiniri(p), kap.clientWidth, kap.clientHeight);
        const sekil = document.createElement('canvas');
        sekil.width = Math.round(k.w * o);
        sekil.height = Math.round(k.h * o);
        sekil.getContext('2d')?.drawImage(tuval, k.x * o, k.y * o, sekil.width, sekil.height, 0, 0, sekil.width, sekil.height);
        haritaSekliniSusle(sekil, { olcek: o, metrePerPx, lejant: sekilLejanti(p, s, a.kapsamaGoster, pr.gorunum), atif: atif.sekil, logo: logoGorseli });
        return { url: sekil.toDataURL('image/jpeg', 0.9), atif: atif.kaynak };
      } catch (e) {
        console.error('Harita görüntüsü alınamadı:', e);
        return null;
      }
    },
    altlikKosesi(n) {
      return altlikKatmani.current?.enYakinKose(n) ?? null;
    },
    ogeKosesi(n) {
      const harita = haritaRef.current;
      if (!harita) return null;
      const hedef = harita.latLngToContainerPoint(ll(n));
      let en: LatLng | null = null;
      let enUzaklik = 14;
      const { proje: p } = guncel.current;
      for (const aday of [...p.yapilar.flatMap((y) => y.poligon), ...p.paratonerler]) {
        const u = harita.latLngToContainerPoint(ll(aday)).distanceTo(hedef);
        if (u < enUzaklik) {
          enUzaklik = u;
          en = { lat: aday.lat, lng: aday.lng };
        }
      }
      return en;
    },
    altligaGit() {
      const sinir = altlikKatmani.current?.sinir();
      if (sinir) haritaRef.current?.fitBounds(sinir, { padding: [40, 40] });
    },
  }));

  // ---------------------------------------------------------------- DXF altlığı
  const koyuZemin = ['google_uydu', 'google_hibrit', 'esri_uydu'].includes(etkinKatman(ayarlar.katman, haritaAnahtarlari));
  useEffect(() => {
    const harita = haritaRef.current;
    if (!harita) return;
    const a = props.altlik;
    if (!a || !a.ayar.gorunur) {
      altlikKatmani.current?.remove();
      altlikKatmani.current = null;
      return;
    }
    if (!altlikKatmani.current) altlikKatmani.current = new AltlikKatmani().addTo(harita);
    altlikKatmani.current.ayarla(a.cozum, a.ayar, koyuZemin);
  }, [props.altlik, koyuZemin]);
  useEffect(
    () => () => {
      altlikKatmani.current?.remove();
      altlikKatmani.current = null;
    },
    [],
  );

  // Hizalamada seçilen noktalar: çizimdeki (camgöbeği) ve haritadaki karşılığı (yeşil), aralarında kesik çizgi.
  const altlikCizimNoktalari = props.altlik?.cizimNoktalari;
  const altlikHaritaNoktalari = props.altlik?.haritaNoktalari;
  useEffect(() => {
    const k = katman.current;
    if (!k) return;
    k.altlikIsaret.clearLayers();
    const c = altlikCizimNoktalari ?? [];
    const h = altlikHaritaNoktalari ?? [];
    c.forEach((n, i) => {
      L.circleMarker(ll(n), { radius: 6, color: '#06b6d4', weight: 2, fillOpacity: 0.3, interactive: false }).addTo(k.altlikIsaret);
      const karsi = h[i];
      if (karsi) {
        L.circleMarker(ll(karsi), { radius: 6, color: '#22c55e', weight: 2, fillOpacity: 0.3, interactive: false }).addTo(k.altlikIsaret);
        L.polyline([ll(n), ll(karsi)], { color: '#22c55e', weight: 2, dashArray: '5 4', interactive: false }).addTo(k.altlikIsaret);
      }
    });
  }, [altlikCizimNoktalari, altlikHaritaNoktalari]);

  // ---------------------------------------------------------------- Çizim, ölçüm, tıklama, klavye
  useEffect(() => {
    const harita = haritaRef.current;
    if (!harita || !katman.current) return;
    const k = katman.current;

    const cizimiTemizle = () => {
      cizilen.current = [];
      k.cizim.clearLayers();
    };
    const cizimiGoster = (renk: string) => {
      k.cizim.clearLayers();
      cizilen.current.forEach((n, i) => {
        const m = L.circleMarker(ll(n), { radius: 5, color: renk, fillColor: renk, fillOpacity: 1, weight: 2 }).addTo(k.cizim);
        if (i === 0) m.bindTooltip('Başlangıç noktası: bitirmek için tekrar tıklayın ya da Enter');
      });
      if (cizilen.current.length > 1) L.polyline(cizilen.current.map(ll), { color: renk, weight: 2, dashArray: '4 4' }).addTo(k.cizim);
    };
    const olcumuGoster = () => {
      k.olcum.clearLayers();
      const n = olcumNoktalari.current;
      n.forEach((p) => L.circleMarker(ll(p), { radius: 4, color: RENK.olcum, fillColor: RENK.olcum, fillOpacity: 1 }).addTo(k.olcum));
      if (n.length > 1) {
        L.polyline(n.map(ll), { color: RENK.olcum, weight: 2 }).addTo(k.olcum);
        let toplam = 0;
        for (let i = 1; i < n.length; i++) toplam += elipsoitMesafe(n[i - 1]!, n[i]!);
        guncel.current.props.onOlcum(toplam);
      } else guncel.current.props.onOlcum(null);
    };
    const poligonuBitir = () => {
      const { mod, onYapiPoligonu, onParselPoligonu } = guncel.current.props;
      if (cizilen.current.length >= 3) (mod === 'yapi' ? onYapiPoligonu : onParselPoligonu)([...cizilen.current]);
      cizimiTemizle();
    };

    function tikla(e: L.LeafletMouseEvent) {
      const { mod, onParatonerKonumu, onStreetView, onAltlikNoktasi } = guncel.current.props;
      const nokta = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (mod === 'streetview') return onStreetView(nokta);
      if (mod === 'altlik') return onAltlikNoktasi(nokta);
      if (mod === 'olcum') {
        olcumNoktalari.current = [...olcumNoktalari.current, nokta];
        return olcumuGoster();
      }
      if (mod === 'paratoner') return onParatonerKonumu(nokta);
      if (mod === 'yapi' || mod === 'parsel') {
        const ilk = cizilen.current[0];
        if (ilk && cizilen.current.length >= 3 && harita!.latLngToLayerPoint(e.latlng).distanceTo(harita!.latLngToLayerPoint(ll(ilk))) < 14) {
          return poligonuBitir();
        }
        cizilen.current = [...cizilen.current, nokta];
        cizimiGoster(mod === 'parsel' ? RENK.cizimParsel : RENK.cizimYapi);
      }
    }

    async function tus(e: KeyboardEvent) {
      const { mod, moddanCik } = guncel.current.props;
      const poligonModu = mod === 'yapi' || mod === 'parsel';
      const hedef = e.target as HTMLElement | null;
      if (hedef && (hedef.tagName === 'INPUT' || hedef.tagName === 'TEXTAREA' || hedef.tagName === 'SELECT')) return;

      if (e.key === 'Enter' && poligonModu) poligonuBitir();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (poligonModu && cizilen.current.length) {
          e.preventDefault();
          cizilen.current = cizilen.current.slice(0, -1);
          cizimiGoster(mod === 'parsel' ? RENK.cizimParsel : RENK.cizimYapi);
        } else if (mod === 'olcum' && olcumNoktalari.current.length) {
          e.preventDefault();
          olcumNoktalari.current = olcumNoktalari.current.slice(0, -1);
          olcumuGoster();
        }
      }
      if (e.key === 'Escape' && mod !== 'yok') {
        if (poligonModu && cizilen.current.length) {
          const vazgec = await guncel.current.onayla({
            baslik: 'Çizim tamamlanmadı',
            aciklama: 'Çizdiğiniz noktalar silinecek. Vazgeçmek istiyor musunuz?',
            onayEtiketi: 'Vazgeç ve sil',
            vazgecEtiketi: 'Çizime devam',
            tehlikeli: true,
          });
          if (!vazgec) return;
        }
        cizimiTemizle();
        olcumNoktalari.current = [];
        k.olcum.clearLayers();
        guncel.current.props.onOlcum(null);
        moddanCik();
      }
    }

    harita.on('click', tikla);
    window.addEventListener('keydown', tus);
    return () => {
      harita.off('click', tikla);
      window.removeEventListener('keydown', tus);
    };
  }, []);

  // Mod değişince yarım kalan çizim ve ölçüm temizlenir.
  useEffect(() => {
    if (!katman.current) return;
    cizilen.current = [];
    katman.current.cizim.clearLayers();
    if (props.mod !== 'olcum') {
      olcumNoktalari.current = [];
      katman.current.olcum.clearLayers();
      guncel.current.props.onOlcum(null);
    }
  }, [props.mod]);

  // ---------------------------------------------------------------- Parsel
  useEffect(() => {
    const k = katman.current;
    if (!k) return;
    k.parsel.clearLayers();
    if (proje.parsel_siniri && proje.parsel_siniri.length >= 3) {
      L.polygon(proje.parsel_siniri.map(ll), { color: '#e4e4e7', weight: 2.5, dashArray: '10 5', fill: false, opacity: 0.9, interactive: false }).addTo(k.parsel);
    }
  }, [proje.parsel_siniri]);

  // ---------------------------------------------------------------- Yapılar
  const { izolasyon, odakYapiId, hEsikleri, seviyeler } = props.gorunum;
  useEffect(() => {
    const k = katman.current;
    if (!k) return;
    k.yapi.clearLayers();
    for (const yp of proje.yapilar) {
      if (yp.gorunur_mu === false || yp.poligon.length < 3) continue;
      const soluk = izolasyon && odakYapiId !== yp.id;
      const hesaplanamadi = sonuc.yapilar.find((s) => s.yapiId === yp.id)?.nihai.kod === 'HESAPLANAMADI';
      const renk = yp.kritik_mi ? '#ef4444' : '#a1a1aa';
      const cizgi: L.PolylineOptions = {
        color: renk,
        weight: soluk ? 0.8 : yp.kritik_mi ? 2.5 : 1.5,
        opacity: soluk ? 0.2 : 1,
        fillOpacity: 0,
        ...(yp.kritik_mi || hesaplanamadi ? { dashArray: '6 3' } : {}),
      };
      const poligon = L.polygon(yp.poligon.map(ll), cizgi).addTo(k.yapi);
      poligon.bindTooltip(metinOgesi(yp.isim), { permanent: true, direction: 'center', className: 'yapi-etiket', opacity: soluk ? 0.4 : 1 });
      poligon.on('click', (e) => {
        if (guncel.current.props.mod !== 'yok') return;
        L.DomEvent.stopPropagation(e);
        guncel.current.props.onOgeTikla('yapi', yp.id);
      });
    }
  }, [proje.yapilar, sonuc, izolasyon, odakYapiId]);

  // ---------------------------------------------------------------- Kapsama (çekirdek sonucu)
  useEffect(() => {
    const k = katman.current;
    if (!k) return;
    k.kapsama.clearLayers();
    if (!ayarlar.kapsamaGoster) return;
    for (const ys of sonuc.yapilar) {
      const yp = proje.yapilar.find((y) => y.id === ys.yapiId);
      if (!yp || yp.gorunur_mu === false || !ys.kapsama) continue;
      if (izolasyon && odakYapiId !== yp.id) continue;
      if (ys.kapsama.kapsananGeoJSON) {
        L.geoJSON(ys.kapsama.kapsananGeoJSON, { style: { color: RENK.kapsanan, weight: 1.5, fillColor: RENK.kapsanan, fillOpacity: 0.22 }, interactive: false }).addTo(k.kapsama);
      }
      if (ys.kapsama.acikGeoJSON) {
        // Açıkta kalan alan kasıtlı olarak belirgin: küçük alanlar da gözden kaçmasın.
        L.geoJSON(ys.kapsama.acikGeoJSON, { style: { color: '#dc2626', weight: 2, fillColor: RENK.acik, fillOpacity: 0.65 }, interactive: false }).addTo(k.kapsama);
      }
    }
  }, [sonuc, proje.yapilar, izolasyon, odakYapiId, ayarlar.kapsamaGoster]);

  // ---------------------------------------------------------------- Paratonerler ve çemberler
  useEffect(() => {
    const k = katman.current;
    if (!k) return;
    k.paratoner.clearLayers();

    const odakYapi = izolasyon ? proje.yapilar.find((y) => y.id === odakYapiId) : undefined;
    const odakSonuc = odakYapi ? sonuc.yapilar.find((s) => s.yapiId === odakYapi.id) : undefined;
    const odakPoligon = odakYapi && odakYapi.poligon.length >= 3 ? poligonaDonustur(odakYapi.poligon) : null;
    const odakMerkez = odakPoligon ? centerOfMass(odakPoligon) : null;
    const esikler = [...hEsikleri].sort((a, b) => a - b);

    proje.paratonerler.forEach((pr, idx) => {
      if (pr.gorunur_mu === false) return;
      const pasif = pr.aktif_mi === false;
      const prNokta = point([pr.lng, pr.lat]);
      const soluk = !!odakMerkez && distance(prNokta, odakMerkez, { units: 'meters' }) > 150;

      const isaret = L.marker([pr.lat, pr.lng], { icon: paratonerIkonu(pasif), draggable: true, opacity: soluk ? 0.3 : 1 }).addTo(k.paratoner);
      isaret.bindTooltip(metinOgesi(pasif ? `${pr.isim} (devre dışı)` : pr.isim), {
        permanent: true,
        direction: 'top',
        offset: [0, -8],
        className: 'paratoner-etiket',
        opacity: soluk ? 0.3 : 1,
      });
      isaret.on('click', (e) => {
        if (guncel.current.props.mod !== 'yok') return;
        L.DomEvent.stopPropagation(e);
        guncel.current.props.onOgeTikla('paratoner', pr.id);
      });
      isaret.on('dragend', () => {
        const { lat, lng } = isaret.getLatLng();
        guncel.current.props.onParatonerTasi(pr.id, { lat, lng });
      });
      if (pasif) return;

      if (!izolasyon) {
        // Referans çemberleri: seçili h ve seviyeler için tablo Rp'si (yalnızca görsel).
        const dT = etkinDeltaT(pr, proje);
        pr.h_esikleri
          .filter((h) => hEsikleri.has(h))
          .forEach((h) => {
            const renk = ESIK_RENKLERI[Math.max(0, esikler.indexOf(h)) % ESIK_RENKLERI.length]!;
            for (const sv of seviyeler) {
              const okuma = rpOku(h, sv, dT);
              if (!okuma.tamam) continue;
              L.circle([pr.lat, pr.lng], { radius: okuma.rp, color: renk, weight: sv === 'I' ? 2.5 : 2, opacity: 0.85, dashArray: SEVIYE_CIZGISI[sv], fillColor: renk, fillOpacity: 0.02 })
                .bindTooltip(
                  satirliOge([
                    { metin: `Paratoner: ${pr.isim}`, kalin: true },
                    { metin: `h = ${h} m · ΔT = ${dT} µs` },
                    { metin: `Seviye ${sv} · Rp = ${okuma.rp} m`, kalin: true },
                  ]),
                  { sticky: true, className: 'custom-tooltip' },
                )
                .addTo(k.paratoner);
            }
          });
        return;
      }

      // İzolasyon: odak yapı için çekirdeğin hesapladığı gerçek Rp çemberi.
      const satir = odakSonuc?.satirlar.find((s) => s.paratonerId === pr.id && s.gecerli);
      if (!satir || !odakPoligon || !odakMerkez || satir.rp === undefined) return;
      if (!booleanIntersects(circle(prNokta, satir.rp, { units: 'meters', steps: 64 }), odakPoligon)) return;
      L.circle([pr.lat, pr.lng], { radius: satir.rp, color: RENK.odak, weight: 2.5, opacity: 0.9, dashArray: '5 5', fill: false, interactive: false }).addTo(k.paratoner);
      const yon = bearing(prNokta, odakMerkez) + ((idx % 7) * 12 - 36);
      const etiketNokta = destination(prNokta, satir.rp, yon, { units: 'meters' }).geometry.coordinates;
      L.marker([etiketNokta[1]!, etiketNokta[0]!], {
        interactive: false,
        icon: L.divIcon({
          className: 'odak-etiket-kap',
          html: metinOgesi(`${pr.isim} → Rp: ${sayi(satir.rp)} m (Seviye ${satir.sutun}, h: ${sayi(satir.gercekH)} m)`, 'odak-etiket'),
          iconSize: undefined,
        }),
      }).addTo(k.paratoner);
    });
    // Bağımlılıklar projenin tamamı değil, çizimin okuduğu alanlardır: rapor numarası ya da adres
    // yazılırken paratoner katmanı baştan kurulmaz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proje.yapilar, proje.paratonerler, proje.deltaT, proje.deltaT_modu, sonuc, izolasyon, odakYapiId, hEsikleri, seviyeler]);

  // ---------------------------------------------------------------- Street View işareti
  useEffect(() => {
    const k = katman.current;
    if (!k) return;
    k.streetview.clearLayers();
    const konum = props.streetViewKonumu;
    if (!konum) return;
    const m = L.marker(ll(konum), { icon: STREETVIEW_IKON, draggable: true }).addTo(k.streetview);
    m.bindTooltip(metinOgesi('Street View konumu'), { permanent: true, direction: 'top', offset: [0, -6], className: 'paratoner-etiket' });
    m.on('dragend', () => {
      const { lat, lng } = m.getLatLng();
      guncel.current.props.onStreetView({ lat, lng });
    });
  }, [props.streetViewKonumu]);

  // ---------------------------------------------------------------- Poligon köşe düzenleme
  useEffect(() => {
    const k = katman.current;
    if (!k) return;
    k.kose.clearLayers();
    const id = props.poligonDuzenlenenYapiId;
    const yapi = id ? proje.yapilar.find((y) => y.id === id) : undefined;
    if (!id || !yapi) return;
    const koseler = yapi.poligon.map((n) => ({ ...n }));
    L.polygon(koseler.map(ll), { color: '#3b82f6', weight: 2, dashArray: '4 3', fillOpacity: 0.05, interactive: false }).addTo(k.kose);
    koseler.forEach((kose, i) => {
      const m = L.marker(ll(kose), { draggable: true, icon: KOSE_IKON }).addTo(k.kose);
      m.on('dragend', () => {
        const { lat, lng } = m.getLatLng();
        koseler[i] = { lat, lng };
        guncel.current.props.onPoligonGuncelle(id, koseler.map((n) => ({ ...n })));
      });
    });
  }, [props.poligonDuzenlenenYapiId, proje.yapilar]);

  const cizimde = props.mod !== 'yok';
  return <div ref={kapRef} className={`harita-kap ${cizimde ? 'mod-cizim' : ''}`} />;
});
