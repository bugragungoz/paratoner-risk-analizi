// AutoCAD DXF dışa aktarma: projenin metrik çizim modeli (katmanlar ve öğeler, birim metre). Bu modül
// hangi öğenin hangi katmana ve hangi koordinata gideceğini belirler; dosya metnini dxfYaz.ts
// (AutoCAD R12) üretir.
//
// Koordinat sistemi:
//   - TUREF / TM (3° dilim): vaziyet planlarıyla aynı; CAD X = sağa değer (Y), CAD Y = yukarı değer (X).
//     Rp daireleri izdüşümün o noktadaki ölçek katsayısıyla çizilir (dilim kenarında ~1,0003).
//   - Yerel: projede saklanan başlangıç noktası (0, 0), Transverse Mercator, ölçek 1.
// Arazinin deniz seviyesinden yüksekliği için ölçek düzeltmesi yapılmaz (1000 m'de ~%0,016).

import type { Metinler } from '../dil';
import { kotMetni, sayi } from './bicim';
import type { ProjeSonucu } from './hesap';
import { turefDuzlemi, turefEpsg, yerelDuzlem, type Duzlem, type TurefDilimi } from './koordinat';
import { paratonerTepeKotu } from './kot';
import type { LatLng, Proje } from './tipler';

export type DxfSistemi = { tur: 'yerel'; orijin: LatLng } | { tur: 'turef'; dilim: TurefDilimi };

export type DxfNoktasi = [number, number];

export type DxfOgesi =
  | { tur: 'cokgen'; katman: string; noktalar: DxfNoktasi[]; kapali: boolean }
  | { tur: 'daire'; katman: string; merkez: DxfNoktasi; yaricap: number }
  | { tur: 'nokta'; katman: string; konum: DxfNoktasi }
  | { tur: 'yazi'; katman: string; konum: DxfNoktasi; yukseklik: number; metin: string };

export interface DxfKatmani {
  ad: string;
  /** AutoCAD renk dizini (ACI). */
  renk: number;
}

export interface DxfCizimi {
  katmanlar: DxfKatmani[];
  ogeler: DxfOgesi[];
}

/** Katman adları ASCII'dir (eski AutoCAD sürümleri ve bazı CAD programları Türkçe harfte sorun çıkarır). */
export const DXF_KATMANLARI = {
  YAPI_KORUNUYOR: { ad: 'YAPI_KORUNUYOR', renk: 3 },
  YAPI_ISTEGE_BAGLI: { ad: 'YAPI_ISTEGE_BAGLI', renk: 82 },
  YAPI_KORUNMUYOR: { ad: 'YAPI_KORUNMUYOR', renk: 1 },
  YAPI_HESAPLANAMADI: { ad: 'YAPI_HESAPLANAMADI', renk: 8 },
  ACIK_ALAN: { ad: 'ACIK_ALAN', renk: 1 },
  PARATONER: { ad: 'PARATONER', renk: 30 },
  RP_DAIRE: { ad: 'RP_DAIRE', renk: 40 },
  PARSEL: { ad: 'PARSEL', renk: 8 },
  ETIKET: { ad: 'ETIKET', renk: 7 },
  BILGI: { ad: 'BILGI', renk: 7 },
} as const satisfies Record<string, DxfKatmani>;

type KatmanAdi = keyof typeof DXF_KATMANLARI;

/** Nihai sonuca göre yapı katmanı. */
export function yapiKatmani(kod: string | undefined): KatmanAdi {
  switch (kod) {
    case 'YETERLI':
    case 'YETERLI_KOMBINE':
      return 'YAPI_KORUNUYOR';
    case 'ISTEGE_BAGLI_ICINDE':
    case 'ISTEGE_BAGLI_DISINDA':
      return 'YAPI_ISTEGE_BAGLI';
    case 'HESAPLANAMADI':
    case undefined:
      return 'YAPI_HESAPLANAMADI';
    default:
      return 'YAPI_KORUNMUYOR';
  }
}

/** Projenin alanının ortası (yerel başlangıç noktası henüz yoksa önerilen nokta), 1e-6° yuvarlanmış. */
export function projeOrtasi(proje: Proje): LatLng | null {
  const n: LatLng[] = [...proje.yapilar.flatMap((y) => y.poligon), ...proje.paratonerler, ...(proje.parsel_siniri ?? [])];
  if (!n.length) return null;
  const orta = (a: number[]) => Math.round(((Math.min(...a) + Math.max(...a)) / 2) * 1e6) / 1e6;
  return { lat: orta(n.map((x) => x.lat)), lng: orta(n.map((x) => x.lng)) };
}

export function dxfDuzlemi(sistem: DxfSistemi): Duzlem {
  return sistem.tur === 'yerel' ? yerelDuzlem(sistem.orijin) : turefDuzlemi(sistem.dilim);
}

/** Düzlemin noktadaki ölçek katsayısı (izdüşüm mesafesi / elipsoit mesafesi). TM açı koruduğu için yönden bağımsızdır. */
export function olcekKatsayisi(d: Duzlem, n: LatLng): number {
  const a = d.ileri(n);
  const b = d.ileri(yerelDuzlem(n).geri({ x: 100, y: 0 }));
  return Math.hypot(b.x - a.x, b.y - a.y) / 100;
}

const yuvarla = (x: number) => Math.round(x * 1e4) / 1e4;
const tekSatir = (s: string) => s.replace(/[\r\n\t]+/g, ' ').trim();

export function dxfCizimi(proje: Proje, sonuc: ProjeSonucu, sistem: DxfSistemi, m: Metinler, uretim: string): DxfCizimi {
  const d = dxfDuzlemi(sistem);
  const xy = (n: LatLng): DxfNoktasi => {
    const p = d.ileri(n);
    return [yuvarla(p.x), yuvarla(p.y)];
  };
  const ogeler: DxfOgesi[] = [];
  const katman = (k: KatmanAdi) => DXF_KATMANLARI[k].ad;

  // Yazı yüksekliği: çizimin köşegeninin ~1/120'si, 0,3–5 m arası.
  const tum = [...proje.yapilar.flatMap((y) => y.poligon), ...proje.paratonerler, ...(proje.parsel_siniri ?? [])].map(xy);
  const xs = tum.map((p) => p[0]);
  const ys = tum.map((p) => p[1]);
  const kosegen = tum.length ? Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) : 0;
  const h = Math.min(5, Math.max(0.3, Math.round((kosegen / 120) * 10) / 10));
  const yazi = (k: KatmanAdi, konum: DxfNoktasi, metin: string, oran = 1) =>
    ogeler.push({ tur: 'yazi', katman: katman(k), konum: [yuvarla(konum[0]), yuvarla(konum[1])], yukseklik: Math.round(h * oran * 100) / 100, metin: tekSatir(metin) });

  if (proje.parsel_siniri && proje.parsel_siniri.length >= 3) {
    ogeler.push({ tur: 'cokgen', katman: katman('PARSEL'), noktalar: proje.parsel_siniri.map(xy), kapali: true });
  }

  const yapiMerkezi = new Map<string, DxfNoktasi>();
  for (const yapi of proje.yapilar) {
    if (yapi.poligon.length < 2) continue;
    const s = sonuc.yapilar.find((y) => y.yapiId === yapi.id);
    const noktalar = yapi.poligon.map(xy);
    ogeler.push({ tur: 'cokgen', katman: katman(yapiKatmani(s?.nihai.kod)), noktalar, kapali: true });
    const merkez: DxfNoktasi = [noktalar.reduce((t, p) => t + p[0], 0) / noktalar.length, noktalar.reduce((t, p) => t + p[1], 0) / noktalar.length];
    yapiMerkezi.set(yapi.id, merkez);
    yazi('ETIKET', [merkez[0], merkez[1] + 0.2 * h], yapi.isim);
    if (s) yazi('ETIKET', [merkez[0], merkez[1] - 1.2 * h], [s.risk?.seviye, s.nihai.etiket].filter(Boolean).join(' · '), 0.7);

    // Açıkta kalan alan (haritadaki kırmızı): her halka ayrı kapalı çoklu çizgi.
    const acik = s?.kapsama?.acikGeoJSON;
    if (acik) {
      const poligonlar = acik.geometry.type === 'Polygon' ? [acik.geometry.coordinates] : acik.geometry.coordinates;
      for (const halkalar of poligonlar) {
        for (const halka of halkalar) {
          const n = halka.map(([lng, lat]) => xy({ lat: lat!, lng: lng! }));
          if (n.length > 1 && n[0]![0] === n[n.length - 1]![0] && n[0]![1] === n[n.length - 1]![1]) n.pop();
          if (n.length >= 3) ogeler.push({ tur: 'cokgen', katman: katman('ACIK_ALAN'), noktalar: n, kapali: true });
        }
      }
    }
  }

  const sembol = Math.round(0.4 * h * 100) / 100;
  for (const pr of proje.paratonerler) {
    const p = xy(pr);
    ogeler.push({ tur: 'nokta', katman: katman('PARATONER'), konum: p });
    ogeler.push({ tur: 'daire', katman: katman('PARATONER'), merkez: p, yaricap: sembol });
    yazi('ETIKET', [p[0] + 0.6 * h, p[1] + 0.6 * h], pr.aktif_mi === false ? `${pr.isim} (${m.dxf.devreDisi})` : pr.isim);
    const uc = paratonerTepeKotu(pr, proje);
    yazi('ETIKET', [p[0] + 0.6 * h, p[1] - 0.5 * h], m.dxf.mast(sayi(pr.mast_yuksekligi_m), uc === null ? '-' : kotMetni(uc)), 0.7);
  }

  // Gerçek Rp daireleri: her yapıya ulaşan geçerli satır. Aynı paratonerin aynı Rp'si tek daire olarak
  // çizilir; etiket her yapı için, dairenin o yapıya bakan noktasına yazılır.
  const cizilen = new Set<string>();
  for (const y of sonuc.yapilar) {
    const yapi = proje.yapilar.find((x) => x.id === y.yapiId);
    const hedef = yapiMerkezi.get(y.yapiId);
    if (!yapi || !hedef) continue;
    for (const s of y.satirlar) {
      if (!s.gecerli || s.rp === undefined || s.enYakin === undefined || s.enYakin > s.rp) continue;
      const pr = proje.paratonerler.find((x) => x.id === s.paratonerId);
      if (!pr) continue;
      const merkez = xy(pr);
      const r = yuvarla(s.rp * olcekKatsayisi(d, pr));
      const anahtar = `${pr.id}|${r}`;
      if (!cizilen.has(anahtar)) {
        cizilen.add(anahtar);
        ogeler.push({ tur: 'daire', katman: katman('RP_DAIRE'), merkez, yaricap: r });
      }
      const dx = hedef[0] - merkez[0];
      const dy = hedef[1] - merkez[1];
      const uzunluk = Math.hypot(dx, dy) || 1;
      yazi('RP_DAIRE', [merkez[0] + (dx / uzunluk) * r, merkez[1] + (dy / uzunluk) * r], m.dxf.rp(pr.isim, yapi.isim, sayi(s.rp), s.sutun ?? '-'), 0.6);
    }
  }

  // Bilgi yazısı: çizimin sol üstünün üzerinde.
  if (tum.length) {
    const solUst: DxfNoktasi = [Math.min(...xs), Math.max(...ys) + 2 * h];
    const satirlar = [
      proje.isim,
      sistem.tur === 'yerel'
        ? m.dxf.sistemYerel(sistem.orijin.lat.toFixed(6).replace('.', ','), sistem.orijin.lng.toFixed(6).replace('.', ','))
        : m.dxf.sistemTuref(sistem.dilim, turefEpsg(sistem.dilim)),
      m.dxf.birim,
      uretim,
    ];
    satirlar.reverse().forEach((s, i) => yazi('BILGI', [solUst[0], solUst[1] + i * 1.6 * h], s, i === satirlar.length - 1 ? 1.2 : 0.8));
  }

  return { katmanlar: Object.values(DXF_KATMANLARI).map((k) => ({ ...k })), ogeler };
}
