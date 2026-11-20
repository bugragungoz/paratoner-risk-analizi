// DXF altlığının haritaya yerleştirilmesi (hizalama). Altlık yalnızca görseldir; hesaba girmez.
//
//   - TUREF / TM: çizim ulusal koordinatlardaysa (vaziyet planı) doğrudan yerine oturur.
//   - Benzerlik: koordinatsız çizim, yerel düzlemde (orijin noktasında Transverse Mercator) döndürülüp
//     ötelenir; ölçek çizimin biriminden gelir. İki nokta hizalamasında ölçek isteğe bağlı olarak
//     serbest bırakılabilir; çizim ölçeğinin noktalardan bulunan ölçekten sapması bildirilir.
//
// Çizim → yerel düzlem: X = ölçek·(cos a·x − sin a·y) + tx,  Y = ölçek·(sin a·x + cos a·y) + ty.

import { TUREF_DILIMLERI, turefDuzlemi, yerelDuzlem, type TurefDilimi, type XY } from './koordinat';
import { tr as TR } from '../dil/tr';
import type { LatLng } from './tipler';

export type AltlikHizalamasi =
  | { tur: 'turef'; dilim: TurefDilimi }
  | { tur: 'benzerlik'; orijin: LatLng; aci: number; olcek: number; tx: number; ty: number };

/** Projede saklanan altlık ayarı (çizimin kendisi saklanmaz; dosya yolundan yeniden okunur). */
export interface AltlikAyari {
  /** Masaüstünde DXF dosyasının tam yolu; tarayıcıda bilinmez. */
  yol: string | null;
  ad: string;
  /** Bir çizim biriminin metre karşılığı. */
  birim: number;
  hizalama: AltlikHizalamasi;
  gizliKatmanlar: string[];
  /** 0 (görünmez) – 1 (tam). */
  opaklik: number;
  gorunur: boolean;
  /** 'katman': katman renkleri; 'tek': tek renk (uydu görüntüsü üzerinde daha okunaklı). */
  renk: 'katman' | 'tek';
}

export interface Sinirlar {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Çizim sınırları Türkiye'deki TUREF / TM koordinat aralığında mı (sağa değer 100–900 km, yukarı değer 3900–4700 km)? */
export function turefOlabilir(s: Sinirlar, birim = 1): boolean {
  const [x0, x1, y0, y1] = [s.minX * birim, s.maxX * birim, s.minY * birim, s.maxY * birim];
  return x0 > 100_000 && x1 < 900_000 && y0 > 3_900_000 && y1 < 4_700_000;
}

const cizimMerkezi = (s: Sinirlar): XY => ({ x: (s.minX + s.maxX) / 2, y: (s.minY + s.maxY) / 2 });

/**
 * TUREF koordinatlı çizimin dilimi: aynı sağa/yukarı değer her dilimde ~250 km aralıklı başka bir
 * yere düşer; çizimi referans noktasına (proje ya da harita merkezi) en yakın yere koyan dilim seçilir.
 */
export function turefDilimiBul(s: Sinirlar, birim: number, referans: LatLng): TurefDilimi {
  const c = cizimMerkezi(s);
  let en: TurefDilimi = TUREF_DILIMLERI[0];
  let enUzaklik = Infinity;
  for (const d of TUREF_DILIMLERI) {
    const n = turefDuzlemi(d).geri({ x: c.x * birim, y: c.y * birim });
    const u = Math.hypot(n.lat - referans.lat, (n.lng - referans.lng) * Math.cos((referans.lat * Math.PI) / 180));
    if (u < enUzaklik) {
      enUzaklik = u;
      en = d;
    }
  }
  return en;
}

/** Koordinatsız çizimin ilk yerleşimi: çizimin ortası haritadaki noktaya, dönüş yok. */
export function ilkYerlesim(s: Sinirlar, birim: number, merkez: LatLng): AltlikHizalamasi {
  const c = cizimMerkezi(s);
  return { tur: 'benzerlik', orijin: merkez, aci: 0, olcek: birim, tx: -birim * c.x, ty: -birim * c.y };
}

/** Çizim koordinatını (çizim birimi) coğrafi koordinata çeviren işlev. */
export function altlikDonusturucu(h: AltlikHizalamasi, birim: number): (x: number, y: number) => LatLng {
  if (h.tur === 'turef') {
    const d = turefDuzlemi(h.dilim);
    return (x, y) => d.geri({ x: x * birim, y: y * birim });
  }
  const d = yerelDuzlem(h.orijin);
  const cos = Math.cos(h.aci) * h.olcek;
  const sin = Math.sin(h.aci) * h.olcek;
  return (x, y) => d.geri({ x: cos * x - sin * y + h.tx, y: sin * x + cos * y + h.ty });
}

/** Coğrafi koordinatı çizim koordinatına çevirir (ters dönüşüm). */
export function cizimKoordinati(h: AltlikHizalamasi, birim: number, n: LatLng): XY {
  if (h.tur === 'turef') {
    const p = turefDuzlemi(h.dilim).ileri(n);
    return { x: p.x / birim, y: p.y / birim };
  }
  const p = yerelDuzlem(h.orijin).ileri(n);
  const dx = p.x - h.tx;
  const dy = p.y - h.ty;
  const cos = Math.cos(h.aci);
  const sin = Math.sin(h.aci);
  return { x: (cos * dx + sin * dy) / h.olcek, y: (-sin * dx + cos * dy) / h.olcek };
}

export interface IkiNoktaSonucu {
  hizalama: AltlikHizalamasi;
  /** Haritadaki iki nokta arası uzaklığın çizimdeki uzaklığa oranı (birim uygulanmış); 1'e yakın olmalı. */
  olcekOrani: number;
}

/** İki noktanın çizimde ya da haritada çakışması (mesaj arayüzde dile göre verilir). */
export class HizalamaHatasi extends Error {
  constructor() {
    super(TR.altlik.ayniNokta);
  }
}

/**
 * İki nokta hizalaması: çizimdeki c1, c2 noktaları haritadaki h1, h2 noktalarına getirilir.
 * Ölçek kilitliyse (varsayılan) ölçek çizim biriminden gelir ve iki noktanın ortası eşlenir;
 * serbestse ölçek noktalardan bulunur ve c1 tam h1'e oturur.
 */
export function ikiNoktaHizala(c1: XY, c2: XY, h1: LatLng, h2: LatLng, birim: number, olcekSerbest = false): IkiNoktaSonucu {
  const d = yerelDuzlem(h1);
  const p2 = d.ileri(h2);
  const vx = (c2.x - c1.x) * birim;
  const vy = (c2.y - c1.y) * birim;
  const v = Math.hypot(vx, vy);
  const w = Math.hypot(p2.x, p2.y);
  if (v < 1e-6 || w < 1e-3) throw new HizalamaHatasi();
  const aci = Math.atan2(p2.y, p2.x) - Math.atan2(vy, vx);
  const olcekOrani = w / v;
  const olcek = olcekSerbest ? birim * olcekOrani : birim;
  const cos = Math.cos(aci) * olcek;
  const sin = Math.sin(aci) * olcek;
  const R = (c: XY): XY => ({ x: cos * c.x - sin * c.y, y: sin * c.x + cos * c.y });
  let tx: number;
  let ty: number;
  if (olcekSerbest) {
    const r1 = R(c1);
    tx = -r1.x;
    ty = -r1.y;
  } else {
    const rm = R({ x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 });
    tx = p2.x / 2 - rm.x;
    ty = p2.y / 2 - rm.y;
  }
  return { hizalama: { tur: 'benzerlik', orijin: h1, aci, olcek, tx, ty }, olcekOrani };
}

/**
 * TUREF yerleşimini, ince ayar yapılabilsin diye eşdeğer benzerlik dönüşümüne çevirir (çizim
 * sınırlarının iki köşesinden; birkaç yüz metrelik çizimde fark milimetrenin altındadır).
 */
export function benzerligeCevir(h: AltlikHizalamasi, s: Sinirlar, birim: number): AltlikHizalamasi {
  if (h.tur === 'benzerlik') return h;
  const don = altlikDonusturucu(h, birim);
  const c1 = { x: s.minX, y: s.minY };
  const c2 = { x: s.maxX, y: s.maxY };
  return ikiNoktaHizala(c1, c2, don(c1.x, c1.y), don(c2.x, c2.y), birim, true).hizalama;
}

/**
 * Çizim birimi değişince (ör. dosyada birim yokken metreden milimetreye) elle yerleşimin ölçeği
 * yeni birime göre ayarlanır; çizimin ortası yerinde kalır. TUREF yerleşimi birimi doğrudan kullanır.
 */
export function birimDegistir(h: AltlikHizalamasi, eski: number, yeni: number, s: Sinirlar): AltlikHizalamasi {
  if (h.tur !== 'benzerlik' || eski === yeni) return h;
  const c = cizimMerkezi(s);
  const cos = Math.cos(h.aci);
  const sin = Math.sin(h.aci);
  const yer = (olcek: number) => ({ x: olcek * (cos * c.x - sin * c.y), y: olcek * (sin * c.x + cos * c.y) });
  const olcek = (h.olcek * yeni) / eski;
  const once = yer(h.olcek);
  const sonra = yer(olcek);
  return { ...h, olcek, tx: h.tx + once.x - sonra.x, ty: h.ty + once.y - sonra.y };
}

/** Yerel düzlemde öteleme (metre; x doğu, y kuzey). */
export function kaydir(h: AltlikHizalamasi, dx: number, dy: number): AltlikHizalamasi {
  return h.tur === 'benzerlik' ? { ...h, tx: h.tx + dx, ty: h.ty + dy } : h;
}

/** Çizimi, çizim sınırlarının ortası yerinde kalacak biçimde döndürür (derece, saat yönünün tersi pozitif). */
export function dondur(h: AltlikHizalamasi, derece: number, s: Sinirlar): AltlikHizalamasi {
  if (h.tur !== 'benzerlik') return h;
  const c = cizimMerkezi(s);
  const yer = (a: number) => ({
    x: h.olcek * (Math.cos(a) * c.x - Math.sin(a) * c.y),
    y: h.olcek * (Math.sin(a) * c.x + Math.cos(a) * c.y),
  });
  const once = yer(h.aci);
  const aci = h.aci + (derece * Math.PI) / 180;
  const sonra = yer(aci);
  return { ...h, aci, tx: h.tx + once.x - sonra.x, ty: h.ty + once.y - sonra.y };
}
