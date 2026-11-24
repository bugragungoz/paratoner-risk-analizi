// KML okuma ve projeye aktarma. Google Earth'ten ya da saha uygulamasından gelen noktalar ve
// poligonlar önce bir öneri listesine çevrilir (tür, yükseklik, taban); kullanıcı önizlemede
// düzeltir, sonra `projeyeAktar` yeni öğeleri tek adımda projeye ekler. Şema: kml.ts.
//
// Kot ve yükseklik KML'in yükseklik (z) değerinden ALINMAZ: Google Earth'te bu değer deniz
// seviyesine ya da araziye göre olabilir, telefon GPS'inde hatası 10 m'yi bulabilir.

import type { Metinler } from '../dil';
import { tr as TR } from '../dil/tr';
import { yeniKotSeviyesi, yeniParatoner, yeniYapi } from './model';
import { kotListesiOku } from './sahaKml';
import type { KotSeviyesi, LatLng, Paratoner, Proje, Yapi } from './tipler';

export type KmlGeometrisi =
  | { tur: 'nokta'; nokta: LatLng }
  | { tur: 'poligon'; poligon: LatLng[]; delikVar: boolean }
  | { tur: 'cizgi'; noktalar: LatLng[] };

export interface KmlOgesi {
  sira: number;
  ad: string;
  aciklama: string;
  geometri: KmlGeometrisi;
  /** ExtendedData: <Data name><value> ve <SchemaData><SimpleData name>. */
  veri: Record<string, string>;
}

export interface KmlBelgesi {
  ad: string;
  veri: Record<string, string>;
  ogeler: KmlOgesi[];
}

/** DOMParser ile aynı arayüz (testlerde @xmldom/xmldom verilir). */
export interface XmlAyristirici {
  parseFromString(metin: string, tur: 'application/xml'): Document;
}

export class KmlHatasi extends Error {
  constructor(public kod: 'XML' | 'BOS') {
    super(kod === 'XML' ? TR.kml.xmlHatasi : TR.kml.ogeYok);
  }
}

// ---------------------------------------------------------------- XML yardımcıları
// Yalnızca childNodes / localName / textContent kullanılır: tarayıcıdaki DOMParser ile
// xmldom aynı biçimde çalışsın ve "kml:" gibi ad alanı önekleri sonucu değiştirmesin.

type Dugum = Element;

function cocuklar(e: Dugum, ad?: string): Dugum[] {
  const sonuc: Dugum[] = [];
  for (let i = 0; i < e.childNodes.length; i++) {
    const c = e.childNodes[i]!;
    if (c.nodeType === 1 && (!ad || (c as Dugum).localName === ad)) sonuc.push(c as Dugum);
  }
  return sonuc;
}

const cocuk = (e: Dugum, ad: string): Dugum | undefined => cocuklar(e, ad)[0];
const metin = (e: Dugum | undefined) => (e?.textContent ?? '').trim();

function torunlar(e: Dugum, ad: string): Dugum[] {
  const sonuc: Dugum[] = [];
  const gez = (d: Dugum) => {
    for (const c of cocuklar(d)) {
      if (c.localName === ad) sonuc.push(c);
      else gez(c);
    }
  };
  gez(e);
  return sonuc;
}

function genisVeri(e: Dugum): Record<string, string> {
  const v: Record<string, string> = {};
  const ed = cocuk(e, 'ExtendedData');
  if (!ed) return v;
  for (const d of cocuklar(ed, 'Data')) {
    const ad = d.getAttribute('name');
    if (ad) v[ad] = metin(cocuk(d, 'value'));
  }
  for (const sd of cocuklar(ed, 'SchemaData')) {
    for (const s of cocuklar(sd, 'SimpleData')) {
      const ad = s.getAttribute('name');
      if (ad) v[ad] = metin(s);
    }
  }
  return v;
}

/** "boylam,enlem[,yükseklik] …" → noktalar (yükseklik atılır, geçersiz demetler alınmaz). */
function koordinatlar(e: Dugum | undefined): LatLng[] {
  const sonuc: LatLng[] = [];
  for (const demet of metin(e).split(/\s+/)) {
    if (!demet) continue;
    const [lng, lat] = demet.split(',').map(Number);
    if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    sonuc.push({ lat, lng });
  }
  return sonuc;
}

/** Kapalı halkanın son (ilkini tekrarlayan) noktasını atar. */
function acikHalka(n: LatLng[]): LatLng[] {
  const ilk = n[0];
  const son = n[n.length - 1];
  return n.length > 1 && ilk && son && ilk.lat === son.lat && ilk.lng === son.lng ? n.slice(0, -1) : n;
}

function geometriler(e: Dugum): KmlGeometrisi[] {
  const sonuc: KmlGeometrisi[] = [];
  for (const g of cocuklar(e)) {
    switch (g.localName) {
      case 'Point': {
        const n = koordinatlar(cocuk(g, 'coordinates'))[0];
        if (n) sonuc.push({ tur: 'nokta', nokta: n });
        break;
      }
      case 'Polygon': {
        const dis = cocuk(g, 'outerBoundaryIs');
        const halka = dis && cocuk(dis, 'LinearRing');
        const poligon = acikHalka(koordinatlar(halka && cocuk(halka, 'coordinates')));
        if (poligon.length >= 3) sonuc.push({ tur: 'poligon', poligon, delikVar: cocuklar(g, 'innerBoundaryIs').length > 0 });
        break;
      }
      case 'LinearRing': {
        const poligon = acikHalka(koordinatlar(cocuk(g, 'coordinates')));
        if (poligon.length >= 3) sonuc.push({ tur: 'poligon', poligon, delikVar: false });
        break;
      }
      case 'LineString': {
        const noktalar = koordinatlar(cocuk(g, 'coordinates'));
        if (noktalar.length >= 2) sonuc.push({ tur: 'cizgi', noktalar });
        break;
      }
      case 'MultiGeometry':
        sonuc.push(...geometriler(g));
        break;
      default:
        break;
    }
  }
  return sonuc;
}

/** HTML açıklamayı düz metne çevirir (Google Earth açıklamaları HTML olabilir). */
function duzMetin(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** KML metnini okur. Çizgiler de döner (önizlemede listelenmez); geometrisiz öğeler atlanır. */
export function kmlCoz(xmlMetni: string, ayristirici: XmlAyristirici = new DOMParser()): KmlBelgesi {
  const temiz = xmlMetni.replace(/^﻿/, '');
  let belge: Document;
  try {
    belge = ayristirici.parseFromString(temiz, 'application/xml');
  } catch {
    throw new KmlHatasi('XML');
  }
  const kok = belge?.documentElement;
  if (!kok || kok.localName !== 'kml' || belge.getElementsByTagName('parsererror').length > 0) throw new KmlHatasi('XML');

  const dokuman = cocuk(kok, 'Document') ?? cocuk(kok, 'Folder') ?? kok;
  const ogeler: KmlOgesi[] = [];
  for (const pm of torunlar(kok, 'Placemark')) {
    const ad = metin(cocuk(pm, 'name'));
    const aciklama = duzMetin(metin(cocuk(pm, 'description')));
    const veri = genisVeri(pm);
    const g = geometriler(pm);
    g.forEach((geometri, i) => {
      ogeler.push({ sira: ogeler.length, ad: g.length > 1 ? `${ad || '?'} (${i + 1})` : ad, aciklama, geometri, veri });
    });
  }
  return { ad: metin(cocuk(dokuman, 'name')), veri: genisVeri(dokuman), ogeler };
}

// ---------------------------------------------------------------- Aktarım önerisi

export type AktarimTuru = 'yapi' | 'paratoner' | 'parsel' | 'alma';

/** Taban seçeneği: var olan kot, dosyadan gelen (ya da varsayılan) yeni kot, ya da bir yapının çatısı. */
export interface TabanSecenegi {
  anahtar: string;
  tur: 'kot' | 'yeniKot' | 'cati';
  isim: string;
  yukseklik?: number;
  /** Çatı seçeneğinde: dosyadaki yapının pt_kimlik'i ya da projedeki yapının kimliği. */
  yapiKimligi?: string;
}

export interface AktarimSatiri {
  oge: KmlOgesi;
  al: boolean;
  tur: AktarimTuru;
  ad: string;
  /** Yapıda H, paratonerde mast yüksekliği (m). */
  yukseklik: number | null;
  /** TabanSecenegi.anahtar */
  taban: string;
  notlar: NotKodu[];
}

export type NotKodu = 'VAR' | 'DELIK' | 'PARSEL_DEGISIR' | 'PARSEL_FAZLA';

export interface AktarimOnerisi {
  satirlar: AktarimSatiri[];
  tabanlar: TabanSecenegi[];
  /** Listelenmeyen öğe sayısı: çizgiler ve (kendi dışa aktarımımızdaki) koruma daireleri. */
  atlanan: number;
  /** Belgedeki kot listesi (saha uygulaması, pt_kotlar): öğe yerleştirilmemiş kotlar da eklenir. Taban anahtarları. */
  belgeKotlari: string[];
}

const sayiOku = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const KOT_TOLERANSI = 0.0005;

function kotAnahtari(isim: string, yukseklik: number) {
  return `yeni:${isim}|${yukseklik}`;
}

/** Bir öğenin geometrisine uygun türler. */
export function uygunTurler(g: KmlGeometrisi): AktarimTuru[] {
  if (g.tur === 'nokta') return ['paratoner', 'alma'];
  if (g.tur === 'poligon') return ['yapi', 'parsel', 'alma'];
  return ['alma'];
}

export function aktarimOnerisi(belge: KmlBelgesi, proje: Proje, m: Metinler = TR): AktarimOnerisi {
  const ogeler = belge.ogeler.filter((o) => o.geometri.tur !== 'cizgi' && o.veri.pt_tur !== 'rp_daire');
  const tabanlar: TabanSecenegi[] = [...proje.kot_seviyeleri]
    .sort((a, b) => a.taban_kottan_yukseklik_m - b.taban_kottan_yukseklik_m)
    .map((k) => ({ anahtar: k.id, tur: 'kot', isim: k.isim, yukseklik: k.taban_kottan_yukseklik_m }));

  /** Dosyadaki kot bilgisine uyan taban; yoksa yeni kot olarak eklenir. */
  const kotBul = (isim: string | undefined, yukseklik: number | null): string | null => {
    if (yukseklik === null) {
      const adla = isim ? tabanlar.find((t) => t.tur !== 'cati' && t.isim === isim) : undefined;
      return adla?.anahtar ?? null;
    }
    const uyan =
      tabanlar.find((t) => t.tur !== 'cati' && t.isim === isim && Math.abs((t.yukseklik ?? NaN) - yukseklik) < KOT_TOLERANSI) ??
      tabanlar.find((t) => t.tur !== 'cati' && Math.abs((t.yukseklik ?? NaN) - yukseklik) < KOT_TOLERANSI);
    if (uyan) return uyan.anahtar;
    const ad = isim || m.kml.kotAdi(m.bicim.kot(yukseklik));
    const yeni: TabanSecenegi = { anahtar: kotAnahtari(ad, yukseklik), tur: 'yeniKot', isim: ad, yukseklik };
    tabanlar.push(yeni);
    return yeni.anahtar;
  };

  // Önce belgenin kot listesi (saha uygulaması), sonra öğelerin kotları, sonra varsayılan.
  const belgeKotlari = kotListesiOku(belge.veri.pt_kotlar).flatMap((k) => kotBul(k.ad, k.m) ?? []);
  const ogeKotu = ogeler.map((o) => kotBul(o.veri.pt_kot, sayiOku(o.veri.pt_kot_m)));
  if (!tabanlar.some((t) => t.tur !== 'cati')) tabanlar.push({ anahtar: kotAnahtari(m.kml.varsayilanKot, 0), tur: 'yeniKot', isim: m.kml.varsayilanKot, yukseklik: 0 });
  const varsayilanKot = tabanlar.find((t) => t.tur !== 'cati')!.anahtar;

  // Çatı seçenekleri: dosyadaki yapılar ve projedeki yapılar.
  const projeKimlikleri = new Set([...proje.yapilar.map((y) => y.id), ...proje.paratonerler.map((p) => p.id)]);
  for (const o of ogeler) {
    if (o.geometri.tur === 'poligon' && o.veri.pt_tur !== 'parsel' && o.veri.pt_kimlik && !projeKimlikleri.has(o.veri.pt_kimlik)) {
      tabanlar.push({ anahtar: `cati:${o.veri.pt_kimlik}`, tur: 'cati', isim: o.ad, yapiKimligi: o.veri.pt_kimlik });
    }
  }
  for (const y of proje.yapilar) tabanlar.push({ anahtar: `cati:${y.id}`, tur: 'cati', isim: y.isim, yapiKimligi: y.id });

  let parselSayisi = 0;
  const satirlar = ogeler.map((oge, i): AktarimSatiri => {
    const v = oge.veri;
    const turler = uygunTurler(oge.geometri);
    const tur: AktarimTuru = (['yapi', 'paratoner', 'parsel'] as const).find((t) => t === v.pt_tur && turler.includes(t)) ?? turler[0]!;
    const notlar: NotKodu[] = [];
    const var_ = !!v.pt_kimlik && projeKimlikleri.has(v.pt_kimlik);
    if (var_) notlar.push('VAR');
    if (oge.geometri.tur === 'poligon' && oge.geometri.delikVar) notlar.push('DELIK');
    if (tur === 'parsel') {
      parselSayisi++;
      if (parselSayisi > 1) notlar.push('PARSEL_FAZLA');
      else if (proje.parsel_siniri && proje.parsel_siniri.length >= 3) notlar.push('PARSEL_DEGISIR');
    }
    const cati = tur === 'paratoner' && v.pt_yapi ? tabanlar.find((t) => t.tur === 'cati' && t.yapiKimligi === v.pt_yapi) : undefined;
    return {
      oge,
      al: !var_ && !(tur === 'parsel' && parselSayisi > 1),
      tur,
      ad: oge.ad || (tur === 'paratoner' ? `P${i + 1}` : m.kml.varsayilanYapi(i + 1)),
      yukseklik: sayiOku(tur === 'paratoner' ? v.pt_mast_m : v.pt_H_m),
      taban: cati?.anahtar ?? ogeKotu[i] ?? varsayilanKot,
      notlar,
    };
  });
  return { satirlar, tabanlar, atlanan: belge.ogeler.length - ogeler.length, belgeKotlari: [...new Set(belgeKotlari)] };
}

export type SatirHatasi = 'MAST' | 'GEOMETRI' | 'TABAN' | 'CATI' | null;

/**
 * Satır projeye eklenebilir mi: tür geometriye uymalı, paratonerde mast yüksekliği şart, yapının
 * tabanı bir kot olmalı, çatıdaki paratonerin yapısı da eklenmeli ya da projede bulunmalı.
 */
export function satirHatasi(s: AktarimSatiri, oneri: Pick<AktarimOnerisi, 'satirlar' | 'tabanlar'>, proje: Proje): SatirHatasi {
  if (!s.al || s.tur === 'alma') return null;
  if (!uygunTurler(s.oge.geometri).includes(s.tur)) return 'GEOMETRI';
  const taban = oneri.tabanlar.find((t) => t.anahtar === s.taban);
  if (s.tur === 'yapi' && (!taban || taban.tur === 'cati')) return 'TABAN';
  if (s.tur === 'paratoner') {
    if (!(s.yukseklik !== null && s.yukseklik > 0)) return 'MAST';
    if (!taban) return 'TABAN';
    if (taban.tur === 'cati') {
      const dosyada = oneri.satirlar.some((x) => x.al && x.tur === 'yapi' && x.oge.veri.pt_kimlik === taban.yapiKimligi);
      const projede = proje.yapilar.some((y) => y.id === taban.yapiKimligi);
      if (!dosyada && !projede) return 'CATI';
    }
  }
  return null;
}

export interface AktarimSonucu {
  proje: Proje;
  yapi: number;
  paratoner: number;
  parsel: boolean;
  kot: number;
}

const C_ALANLARI = ['C1', 'C2', 'C3', 'C4', 'C5'] as const;

/** Seçili satırları projeye ekler. Hatalı satır varsa hiçbir şey eklenmez (çağıran önce satirHatasi'na bakar). */
export function projeyeAktar(proje: Proje, oneri: Pick<AktarimOnerisi, 'satirlar' | 'tabanlar'> & Partial<Pick<AktarimOnerisi, 'belgeKotlari'>>): AktarimSonucu {
  const secili = oneri.satirlar.filter((s) => s.al && s.tur !== 'alma');
  if (secili.some((s) => satirHatasi(s, oneri, proje) !== null)) throw new Error('İçe aktarılacak satırlarda eksik bilgi var.');

  const tabanBul = (anahtar: string) => oneri.tabanlar.find((t) => t.anahtar === anahtar);
  const kotlar: KotSeviyesi[] = [];
  const kotIdleri = new Map<string, string>();
  const kotId = (anahtar: string): string => {
    const t = tabanBul(anahtar);
    if (!t) throw new Error('Taban seçeneği bulunamadı.');
    if (t.tur === 'kot') return t.anahtar;
    const onceki = kotIdleri.get(anahtar);
    if (onceki) return onceki;
    const k = yeniKotSeviyesi(t.isim, t.yukseklik ?? 0);
    kotlar.push(k);
    kotIdleri.set(anahtar, k.id);
    return k.id;
  };

  // Belgenin kot listesindeki kotlar önce ve belgedeki sırayla; üzerine öğe konmamış olsa da eklenir (saha keşfi).
  for (const anahtar of oneri.belgeKotlari ?? []) kotId(anahtar);

  // Yapılar önce: çatıdaki paratonerler dosyadaki yapı kimliğiyle bağlanır.
  const yapilar: Yapi[] = [];
  const yapiIdleri = new Map<string, string>();
  for (const s of secili.filter((x) => x.tur === 'yapi')) {
    if (s.oge.geometri.tur !== 'poligon') continue;
    const v = s.oge.veri;
    const C = Object.fromEntries(C_ALANLARI.map((c) => [c, sayiOku(v[`pt_${c}`])])) as Record<(typeof C_ALANLARI)[number], number | null>;
    const yapi = yeniYapi({
      isim: s.ad,
      poligon: s.oge.geometri.poligon,
      kot_seviyesi_id: kotId(s.taban),
      H_m: s.yukseklik,
      ...C,
    });
    yapilar.push(yapi);
    if (v.pt_kimlik) yapiIdleri.set(v.pt_kimlik, yapi.id);
  }

  const paratonerler: Paratoner[] = [];
  for (const s of secili.filter((x) => x.tur === 'paratoner')) {
    if (s.oge.geometri.tur !== 'nokta') continue;
    const taban = tabanBul(s.taban);
    const v = s.oge.veri;
    const catiYapisi = taban?.tur === 'cati' ? (yapiIdleri.get(taban.yapiKimligi!) ?? taban.yapiKimligi!) : null;
    const pr = yeniParatoner({
      isim: s.ad,
      ...s.oge.geometri.nokta,
      yapi_id: catiYapisi,
      kot_seviyesi_id: catiYapisi ? null : kotId(s.taban),
      mast_yuksekligi_m: s.yukseklik as number,
      h_esikleri: proje.h_esikleri_varsayilan,
      deltaT: sayiOku(v.pt_deltaT),
      cihaz: v.pt_cihaz,
    });
    if (v.pt_aktif === '0') pr.aktif_mi = false;
    paratonerler.push(pr);
  }

  const parsel = secili.find((x) => x.tur === 'parsel' && x.oge.geometri.tur === 'poligon');
  const yeni: Proje = {
    ...proje,
    kot_seviyeleri: [...proje.kot_seviyeleri, ...kotlar],
    yapilar: [...proje.yapilar, ...yapilar],
    paratonerler: [...proje.paratonerler, ...paratonerler],
    parsel_siniri: parsel && parsel.oge.geometri.tur === 'poligon' ? parsel.oge.geometri.poligon : proje.parsel_siniri,
  };
  return { proje: yeni, yapi: yapilar.length, paratoner: paratonerler.length, parsel: !!parsel, kot: kotlar.length };
}
