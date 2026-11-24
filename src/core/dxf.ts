// DXF çizim modeli (katmanlar ve öğeler) ve altlık çizimine yazılacak paratonerler. Öğeler var olan
// bir DXF dosyasına dxfEkle.ts ile eklenir; program kendi başına DXF dosyası üretmez.

import type { Metinler } from '../dil';
import { cizimKoordinati, type AltlikAyari } from './altlik';
import { kotMetni, sayi } from './bicim';
import { yerelDuzlem } from './koordinat';
import { paratonerTepeKotu } from './kot';
import type { LatLng, Proje } from './tipler';

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

/** Projenin alanının ortası (altlığın ilk konduğu yer, yazı boyutu için ölçek noktası), 1e-6° yuvarlanmış. */
export function projeOrtasi(proje: Proje): LatLng | null {
  const n: LatLng[] = [...proje.yapilar.flatMap((y) => y.poligon), ...proje.paratonerler, ...(proje.parsel_siniri ?? [])];
  if (!n.length) return null;
  const orta = (a: number[]) => Math.round(((Math.min(...a) + Math.max(...a)) / 2) * 1e6) / 1e6;
  return { lat: orta(n.map((x) => x.lat)), lng: orta(n.map((x) => x.lng)) };
}

const tekSatir = (s: string) => s.replace(/[\r\n\t]+/g, ' ').trim();

/** Altlık çizimine yazılan katmanlar: çizimin kendi katmanlarıyla karışmasın diye PT_ önekli. */
export const ALTLIK_KATMANLARI = {
  PARATONER: { ad: 'PT_PARATONER', renk: 1 },
} as const satisfies Record<string, DxfKatmani>;

/**
 * Altlık çizimine yazılacak paratonerler: konum (nokta ve sembol), ad ve mast yazısı; altlık çiziminin
 * kendi koordinatlarında ve biriminde (haritadaki yerleşimin tersi). Yapılar, parsel, sonuçlar ve koruma
 * daireleri yazılmaz (daire h'ye bağlıdır, analizi program yapar): plan olduğu gibi kalır, yalnızca
 * paratonerlerin yeri eklenir.
 */
export function altlikParatonerCizimi(proje: Proje, ayar: AltlikAyari, m: Metinler): DxfCizimi {
  const ciz = (n: LatLng) => cizimKoordinati(ayar.hizalama, ayar.birim, n);
  const xy = (n: LatLng): DxfNoktasi => {
    const p = ciz(n);
    return [Math.round(p.x * 1e6) / 1e6, Math.round(p.y * 1e6) / 1e6];
  };
  /** Noktada bir metrenin çizim birimindeki karşılığı (birim ve izdüşüm ölçek katsayısı içinde). */
  const metreBasina = (n: LatLng) => {
    const a = ciz(n);
    const b = ciz(yerelDuzlem(n).geri({ x: 100, y: 0 }));
    return Math.hypot(b.x - a.x, b.y - a.y) / 100;
  };
  const ogeler: DxfOgesi[] = [];
  const P = ALTLIK_KATMANLARI.PARATONER.ad;

  // Yazı yüksekliği: projenin köşegeninin ~1/200'ü, 0,3–3 m arası (400 m'lik sahada 2,5 m; 1/1000 paftada 2,5 mm).
  const tum = [...proje.yapilar.flatMap((y) => y.poligon), ...proje.paratonerler];
  const orta = projeOrtasi(proje);
  const k = orta ? metreBasina(orta) : 1 / ayar.birim;
  const noktalar = tum.map(xy);
  const xs = noktalar.map((p) => p[0]);
  const ys = noktalar.map((p) => p[1]);
  const kosegen = noktalar.length ? Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / k : 0;
  const hMetre = Math.min(3, Math.max(0.3, Math.round((kosegen / 200) * 10) / 10));
  const h = hMetre * k;
  const yazi = (katman: string, konum: DxfNoktasi, metin: string, oran = 1) =>
    ogeler.push({ tur: 'yazi', katman, konum, yukseklik: Math.round(h * oran * 1e4) / 1e4, metin: tekSatir(metin) });

  for (const pr of proje.paratonerler) {
    const p = xy(pr);
    ogeler.push({ tur: 'nokta', katman: P, konum: p });
    ogeler.push({ tur: 'daire', katman: P, merkez: p, yaricap: Math.round(0.4 * h * 1e4) / 1e4 });
    yazi(P, [p[0] + 0.6 * h, p[1] + 0.6 * h], pr.aktif_mi === false ? `${pr.isim} (${m.dxf.devreDisi})` : pr.isim);
    const uc = paratonerTepeKotu(pr, proje);
    yazi(P, [p[0] + 0.6 * h, p[1] - 0.5 * h], m.dxf.mast(sayi(pr.mast_yuksekligi_m), uc === null ? '-' : kotMetni(uc)), 0.7);
  }

  return { katmanlar: Object.values(ALTLIK_KATMANLARI).map((x) => ({ ...x })), ogeler };
}
