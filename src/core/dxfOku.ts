// DXF okuma (harita altlığı için): ASCII DXF, AutoCAD R12 – 2018.
//
// Çizgi geometrisi düz çoklu çizgilere (çizim biriminde, WCS) çevrilir:
//   LINE, LWPOLYLINE ve POLYLINE (yaylı kenarlar), CIRCLE, ARC, ELLIPSE, SPLINE, SOLID/TRACE/3DFACE
//   kenarları, LEADER; INSERT (iç içe bloklar, ölçek, dönüş, MINSERT dizisi) ve DIMENSION blokları.
// Nesne koordinat sistemi (OCS): ekstrüzyonu (0,0,1) olmayan öğeler (ör. aynalanmış daireler)
// AutoCAD'in "keyfi eksen" kuralıyla dünya koordinatına çevrilir.
// Yazılar, taramalar, görüntüler ve 3B gövdeler çizilmez; sayıları raporlanır. Kağıt alanı atlanır.
//
// Kodlama: AC1021 (2007) ve sonrası UTF-8; öncesi başlıktaki $DWGCODEPAGE (ör. ANSI_1254).
// Metinlerdeki \U+XXXX kaçışları çözülür. İkili (binary) DXF desteklenmez.

export interface DxfAltlikKatmani {
  ad: string;
  /** AutoCAD renk dizini (ACI), 1–255. */
  renk: number;
  /** Dosyada kapalı (rengi eksi) ya da dondurulmuş: altlıkta başlangıçta gizlenir. */
  kapali: boolean;
  /** Bu katmandaki çoklu çizgi sayısı. */
  parca: number;
}

export interface DxfParcasi {
  katman: number;
  kapali: boolean;
  /** x0, y0, x1, y1, … (çizim birimi, dünya koordinatı) */
  noktalar: Float64Array;
}

export interface DxfAltligi {
  surum: string;
  /** $INSUNITS (0 birimsiz, 4 mm, 5 cm, 6 m …). */
  birim: number;
  katmanlar: DxfAltlikKatmani[];
  parcalar: DxfParcasi[];
  sinirlar: { minX: number; minY: number; maxX: number; maxY: number } | null;
  /** Öğe türüne göre çizilen ve atlanan sayıları. */
  cizilen: Record<string, number>;
  atlanan: Record<string, number>;
  /** Nokta sınırı aşıldığı için çizimin bir kısmı alınmadı. */
  kesildi: boolean;
}

export class DxfOkumaHatasi extends Error {
  constructor(public kod: 'IKILI' | 'BICIM' | 'BOS') {
    super(
      kod === 'IKILI'
        ? 'İkili (binary) DXF desteklenmiyor; çizimi ASCII DXF olarak kaydedin.'
        : kod === 'BOS'
          ? 'Çizimde gösterilebilecek çizgi yok.'
          : 'Dosya geçerli bir DXF değil.',
    );
  }
}

// ---------------------------------------------------------------- Kodlama ve okuma

function kodlamaBul(bayt: Uint8Array): string {
  const bas = new TextDecoder('latin1').decode(bayt.subarray(0, Math.min(bayt.length, 200_000)));
  const deger = (ad: string) => {
    const m = new RegExp(`\\$${ad}\\s*\\r?\\n\\s*\\d+\\s*\\r?\\n([^\\r\\n]*)`).exec(bas);
    return m ? m[1]!.trim() : null;
  };
  const surum = deger('ACADVER') ?? 'AC1009';
  if (surum >= 'AC1021') return 'utf-8';
  const sayfa = /ANSI_(\d+)/i.exec(deger('DWGCODEPAGE') ?? '');
  const aday = sayfa ? `windows-${sayfa[1]}` : 'windows-1252';
  try {
    new TextDecoder(aday);
    return aday;
  } catch {
    return 'windows-1252';
  }
}

const unicodeKacisi = (s: string) => (s.includes('\\U+') ? s.replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16))) : s);

/** Bir DXF öğesi: grup kodları ve değerleri (sırayla). */
interface Kayit {
  tip: string;
  kodlar: number[];
  degerler: string[];
}

function ilk(k: Kayit, kod: number): string | undefined {
  const i = k.kodlar.indexOf(kod);
  return i < 0 ? undefined : k.degerler[i];
}
function sayi(k: Kayit, kod: number, varsayilan = 0): number {
  const v = ilk(k, kod);
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : varsayilan;
}
function hepsi(k: Kayit, kod: number): number[] {
  const s: number[] = [];
  k.kodlar.forEach((c, i) => {
    if (c === kod) s.push(Number(k.degerler[i]));
  });
  return s;
}

/** Metni (kod, değer) çiftlerine ayırıp bölümlere göre kayıtlara böler. */
function kayitlar(metin: string): { baslik: Map<string, Kayit>; tablolar: Kayit[]; bloklar: Kayit[]; ogeler: Kayit[] } {
  const baslik = new Map<string, Kayit>();
  const tablolar: Kayit[] = [];
  const bloklar: Kayit[] = [];
  const ogeler: Kayit[] = [];
  let bolum = '';
  let degisken: Kayit | null = null;
  let kayit: Kayit | null = null;
  let hedef: Kayit[] | null = null;
  let konum = 0;
  let ciftSayisi = 0;
  const satir = (): string | null => {
    if (konum >= metin.length) return null;
    let son = metin.indexOf('\n', konum);
    if (son < 0) son = metin.length;
    const s = metin.slice(konum, son > konum && metin.charCodeAt(son - 1) === 13 ? son - 1 : son);
    konum = son + 1;
    return s;
  };
  for (;;) {
    const kodSatiri = satir();
    if (kodSatiri === null) break;
    const degerSatiri = satir();
    if (degerSatiri === null) break;
    const kod = Number(kodSatiri.trim());
    if (!Number.isInteger(kod)) throw new DxfOkumaHatasi('BICIM');
    ciftSayisi++;
    const deger = degerSatiri.trim();
    if (kod === 0) {
      if (deger === 'SECTION' || deger === 'ENDSEC' || deger === 'EOF') {
        bolum = deger === 'SECTION' ? '?' : '';
        kayit = null;
        hedef = null;
        if (deger === 'EOF') break;
        continue;
      }
      if (bolum === 'TABLES') hedef = tablolar;
      else if (bolum === 'BLOCKS') hedef = bloklar;
      else if (bolum === 'ENTITIES') hedef = ogeler;
      else hedef = null;
      kayit = hedef ? { tip: deger, kodlar: [], degerler: [] } : null;
      if (kayit && hedef) hedef.push(kayit);
      continue;
    }
    if (bolum === '?' && kod === 2) {
      bolum = deger;
      continue;
    }
    if (bolum === 'HEADER') {
      if (kod === 9) {
        degisken = { tip: deger, kodlar: [], degerler: [] };
        baslik.set(deger, degisken);
      } else if (degisken) {
        degisken.kodlar.push(kod);
        degisken.degerler.push(deger);
      }
      continue;
    }
    if (kayit) {
      kayit.kodlar.push(kod);
      kayit.degerler.push(deger);
    }
  }
  if (ciftSayisi === 0) throw new DxfOkumaHatasi('BICIM');
  return { baslik, tablolar, bloklar, ogeler };
}

// ---------------------------------------------------------------- Dönüşüm

/** 2B afin dönüşüm: x' = a·x + c·y + e, y' = b·x + d·y + f. */
interface Afin {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}
const BIRIM: Afin = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const bilesik = (m: Afin, n: Afin): Afin => ({
  a: m.a * n.a + m.c * n.b,
  b: m.b * n.a + m.d * n.b,
  c: m.a * n.c + m.c * n.d,
  d: m.b * n.c + m.d * n.d,
  e: m.a * n.e + m.c * n.f + m.e,
  f: m.b * n.e + m.d * n.f + m.f,
});
const oteleme = (x: number, y: number): Afin => ({ ...BIRIM, e: x, f: y });
const olcekle = (sx: number, sy: number): Afin => ({ ...BIRIM, a: sx, d: sy });
const dondur = (derece: number): Afin => {
  const r = (derece * Math.PI) / 180;
  return { a: Math.cos(r), b: Math.sin(r), c: -Math.sin(r), d: Math.cos(r), e: 0, f: 0 };
};

/** Ekstrüzyon yönüne göre OCS → WCS (keyfi eksen kuralı), XY düzlemine izdüşüm. */
function ocs(k: Kayit): Afin {
  const nx = sayi(k, 210, 0);
  const ny = sayi(k, 220, 0);
  const nz = sayi(k, 230, 1);
  const uz = Math.hypot(nx, ny, nz) || 1;
  const N = [nx / uz, ny / uz, nz / uz] as const;
  if (Math.abs(N[0]) < 1e-12 && Math.abs(N[1]) < 1e-12 && N[2] > 0) return BIRIM;
  const capraz = (u: readonly number[], v: readonly number[]) => [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
  const birimle = (v: number[]) => {
    const l = Math.hypot(v[0]!, v[1]!, v[2]!) || 1;
    return v.map((x) => x / l);
  };
  const Ax = birimle(Math.abs(N[0]) < 1 / 64 && Math.abs(N[1]) < 1 / 64 ? capraz([0, 1, 0], N) : capraz([0, 0, 1], N));
  const Ay = birimle(capraz(N, Ax));
  return { a: Ax[0]!, b: Ax[1]!, c: Ay[0]!, d: Ay[1]!, e: 0, f: 0 };
}

// ---------------------------------------------------------------- Eğriler

const DAIRE_KENARI = 72;

function yay(cx: number, cy: number, r: number, bas: number, tarama: number): number[] {
  const n = Math.max(2, Math.ceil((Math.abs(tarama) / (2 * Math.PI)) * DAIRE_KENARI));
  const s: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = bas + (tarama * i) / n;
    s.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return s;
}

/** Çoklu çizgi köşeleri ve kabarıklıkları (bulge) → noktalar. */
function kabarikCizgi(kose: [number, number][], kabarik: number[], kapali: boolean): number[] {
  const s: number[] = [];
  const n = kose.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = kose[i]!;
    if (i === 0) s.push(x1, y1);
    if (i === n - 1 && !kapali) break;
    const [x2, y2] = kose[(i + 1) % n]!;
    const b = kabarik[i] ?? 0;
    if (Math.abs(b) < 1e-12) {
      s.push(x2, y2);
      continue;
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    const k = (1 - b * b) / (4 * b);
    const cx = (x1 + x2) / 2 - k * dy;
    const cy = (y1 + y2) / 2 + k * dx;
    const r = Math.hypot(x1 - cx, y1 - cy);
    const nokta = yay(cx, cy, r, Math.atan2(y1 - cy, x1 - cx), 4 * Math.atan(b));
    s.push(...nokta.slice(2));
  }
  return s;
}

/** B-spline (NURBS) değerlendirmesi, de Boor algoritması. */
function bSpline(derece: number, dugumler: number[], kontrol: [number, number][], agirlik: number[]): number[] {
  const n = kontrol.length;
  const p = derece;
  if (n <= p || dugumler.length !== n + p + 1) return kontrol.flat();
  const w = agirlik.length === n ? agirlik : kontrol.map(() => 1);
  const t0 = dugumler[p]!;
  const t1 = dugumler[n]!;
  const ornek = Math.min(800, Math.max(24, n * 12));
  const s: number[] = [];
  for (let i = 0; i <= ornek; i++) {
    const t = i === ornek ? t1 : t0 + ((t1 - t0) * i) / ornek;
    let k = p;
    while (k < n - 1 && t >= dugumler[k + 1]!) k++;
    const d = Array.from({ length: p + 1 }, (_, j) => {
      const c = kontrol[j + k - p]!;
      const wj = w[j + k - p]!;
      return [c[0] * wj, c[1] * wj, wj];
    });
    for (let r = 1; r <= p; r++) {
      for (let j = p; j >= r; j--) {
        const pay = dugumler[j + 1 + k - r]! - dugumler[j + k - p]!;
        const alfa = pay === 0 ? 0 : (t - dugumler[j + k - p]!) / pay;
        for (let q = 0; q < 3; q++) d[j]![q] = (1 - alfa) * d[j - 1]![q]! + alfa * d[j]![q]!;
      }
    }
    const [x, y, ww] = d[p]!;
    s.push(x! / ww!, y! / ww!);
  }
  return s;
}

/**
 * Yalnızca geçiş noktalarıyla (fit point) tanımlı eğri: noktalardan geçen merkezcil Catmull-Rom
 * eğrisi. AutoCAD'in eğrisiyle birebir aynı değildir; altlık görüntüsü için yeterli yaklaşıklıktır.
 */
function gecisEgrisi(n: [number, number][]): number[] {
  if (n.length < 3) return n.flat();
  const s: number[] = [...n[0]!];
  const p = [n[0]!, ...n, n[n.length - 1]!];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1]!, p[i]!, p[i + 1]!, p[i + 2]!];
    const t = (a: [number, number], b: [number, number]) => Math.max(1e-12, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
    const t01 = t(p0, p1);
    const t12 = t(p1, p2);
    const t23 = t(p2, p3);
    for (let q = 1; q <= 12; q++) {
      const u = q / 12;
      const nokta = [0, 1].map((e) => {
        const m1 = (p2[e]! - p1[e]! + t12 * ((p1[e]! - p0[e]!) / t01 - (p2[e]! - p0[e]!) / (t01 + t12))) * 1;
        const m2 = (p2[e]! - p1[e]! + t12 * ((p3[e]! - p2[e]!) / t23 - (p3[e]! - p1[e]!) / (t12 + t23))) * 1;
        const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
        const h10 = u ** 3 - 2 * u ** 2 + u;
        const h01 = -2 * u ** 3 + 3 * u ** 2;
        const h11 = u ** 3 - u ** 2;
        return h00 * p1[e]! + h10 * m1 + h01 * p2[e]! + h11 * m2;
      });
      s.push(nokta[0]!, nokta[1]!);
    }
  }
  return s;
}

// ---------------------------------------------------------------- Ana işlev

const ATLANAN = new Set(['TEXT', 'MTEXT', 'ATTRIB', 'ATTDEF', 'HATCH', 'IMAGE', 'WIPEOUT', 'VIEWPORT', 'MLINE', 'REGION', '3DSOLID', 'BODY', 'SURFACE', 'MESH', 'OLE2FRAME', 'TOLERANCE', 'MULTILEADER', 'MLEADER', 'ACAD_TABLE', 'POINT', 'RAY', 'XLINE']);

export function dxfCoz(bayt: Uint8Array, secenek: { enFazlaNokta?: number } = {}): DxfAltligi {
  const ikili = new TextDecoder('latin1').decode(bayt.subarray(0, 22));
  if (ikili.startsWith('AutoCAD Binary DXF')) throw new DxfOkumaHatasi('IKILI');
  const metin = new TextDecoder(kodlamaBul(bayt)).decode(bayt);
  const { baslik, tablolar, bloklar, ogeler } = kayitlar(metin);
  const enFazla = secenek.enFazlaNokta ?? 3_000_000;

  const bv = (ad: string, kod: number) => {
    const k = baslik.get(ad);
    return k ? ilk(k, kod) : undefined;
  };
  const surum = bv('$ACADVER', 1) ?? 'AC1009';
  const birim = Number(bv('$INSUNITS', 70) ?? 0) || 0;

  // Katmanlar
  const katmanlar: DxfAltlikKatmani[] = [];
  const katmanNo = new Map<string, number>();
  const katman = (ad: string, renk = 7, kapali = false): number => {
    const var_ = katmanNo.get(ad);
    if (var_ !== undefined) return var_;
    katmanlar.push({ ad, renk, kapali, parca: 0 });
    katmanNo.set(ad, katmanlar.length - 1);
    return katmanlar.length - 1;
  };
  for (const t of tablolar) {
    if (t.tip !== 'LAYER') continue;
    const ad = unicodeKacisi(ilk(t, 2) ?? '');
    if (!ad) continue;
    const renk = sayi(t, 62, 7);
    const bayrak = sayi(t, 70, 0);
    katman(ad, Math.min(255, Math.max(1, Math.abs(renk) || 7)), renk < 0 || (bayrak & 1) === 1);
  }

  // Bloklar
  const blokTanimi = new Map<string, { taban: [number, number]; ogeler: Kayit[] }>();
  let acik: { taban: [number, number]; ogeler: Kayit[] } | null = null;
  for (const k of bloklar) {
    if (k.tip === 'BLOCK') {
      acik = { taban: [sayi(k, 10), sayi(k, 20)], ogeler: [] };
      blokTanimi.set(unicodeKacisi(ilk(k, 2) ?? ''), acik);
    } else if (k.tip === 'ENDBLK') acik = null;
    else acik?.ogeler.push(k);
  }

  const parcalar: DxfParcasi[] = [];
  const cizilen: Record<string, number> = {};
  const atlanan: Record<string, number> = {};
  let toplamNokta = 0;
  let kesildi = false;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const say = (r: Record<string, number>, tip: string) => (r[tip] = (r[tip] ?? 0) + 1);

  const ekle = (katmanAdi: string, n: number[], kapali: boolean, m: Afin) => {
    if (n.length < 4 || kesildi) return;
    if (toplamNokta + n.length / 2 > enFazla) {
      kesildi = true;
      return;
    }
    const d = new Float64Array(n.length);
    for (let i = 0; i < n.length; i += 2) {
      const x = m.a * n[i]! + m.c * n[i + 1]! + m.e;
      const y = m.b * n[i]! + m.d * n[i + 1]! + m.f;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      d[i] = x;
      d[i + 1] = y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const no = katman(katmanAdi);
    katmanlar[no]!.parca++;
    parcalar.push({ katman: no, kapali, noktalar: d });
    toplamNokta += n.length / 2;
  };

  /** Öğeyi (ve blok içindekileri) çizer. `ustKatman`: blok içinde "0" katmanının alacağı katman. */
  const ciz = (liste: Kayit[], m: Afin, ustKatman: string | null, derinlik: number, zincir: string[]) => {
    for (let i = 0; i < liste.length; i++) {
      const k = liste[i]!;
      if (kesildi) return;
      if (ilk(k, 67) === '1') {
        say(atlanan, 'KAGIT_ALANI');
        continue;
      }
      const kendi = unicodeKacisi(ilk(k, 8) ?? '0');
      const kat = ustKatman !== null && kendi === '0' ? ustKatman : kendi;
      switch (k.tip) {
        case 'LINE':
          ekle(kat, [sayi(k, 10), sayi(k, 20), sayi(k, 11), sayi(k, 21)], false, m);
          break;
        case 'LWPOLYLINE': {
          const kose: [number, number][] = [];
          const kabarik: number[] = [];
          k.kodlar.forEach((c, j) => {
            if (c === 10) {
              kose.push([Number(k.degerler[j]), 0]);
              kabarik.push(0);
            } else if (c === 20 && kose.length) kose[kose.length - 1]![1] = Number(k.degerler[j]);
            else if (c === 42 && kose.length) kabarik[kose.length - 1] = Number(k.degerler[j]);
          });
          const kapali = (sayi(k, 70) & 1) === 1;
          ekle(kat, kabarikCizgi(kose, kabarik, kapali), kapali, bilesik(m, ocs(k)));
          break;
        }
        case 'POLYLINE': {
          const bayrak = sayi(k, 70);
          const kose: [number, number][] = [];
          const kabarik: number[] = [];
          let j = i + 1;
          for (; j < liste.length && liste[j]!.tip === 'VERTEX'; j++) {
            const v = liste[j]!;
            const vb = sayi(v, 70);
            if (vb & 16) continue; // eğri çerçeve kontrol noktası
            kose.push([sayi(v, 10), sayi(v, 20)]);
            kabarik.push(sayi(v, 42));
          }
          if (liste[j]?.tip === 'SEQEND') j++;
          i = j - 1;
          if (bayrak & (16 | 64)) {
            say(atlanan, 'POLYLINE_AG');
            continue;
          }
          const kapali = (bayrak & 1) === 1;
          ekle(kat, kabarikCizgi(kose, kabarik, kapali), kapali, bayrak & 8 ? m : bilesik(m, ocs(k)));
          break;
        }
        case 'CIRCLE':
          ekle(kat, yay(sayi(k, 10), sayi(k, 20), sayi(k, 40), 0, 2 * Math.PI), true, bilesik(m, ocs(k)));
          break;
        case 'ARC': {
          const bas = (sayi(k, 50) * Math.PI) / 180;
          let son = (sayi(k, 51) * Math.PI) / 180;
          while (son <= bas) son += 2 * Math.PI;
          ekle(kat, yay(sayi(k, 10), sayi(k, 20), sayi(k, 40), bas, son - bas), false, bilesik(m, ocs(k)));
          break;
        }
        case 'ELLIPSE': {
          const cx = sayi(k, 10);
          const cy = sayi(k, 20);
          const mx = sayi(k, 11);
          const my = sayi(k, 21);
          const oran = sayi(k, 40, 1);
          const nz = sayi(k, 230, 1) < 0 ? -1 : 1;
          // Küçük eksen = (N × büyük eksen) · oran; N = (0, 0, ±1).
          const kx = -my * oran * nz;
          const ky = mx * oran * nz;
          const t0 = sayi(k, 41, 0);
          let t1 = sayi(k, 42, 2 * Math.PI);
          while (t1 <= t0) t1 += 2 * Math.PI;
          const parca = Math.max(4, Math.ceil(((t1 - t0) / (2 * Math.PI)) * DAIRE_KENARI));
          const n: number[] = [];
          for (let q = 0; q <= parca; q++) {
            const t = t0 + ((t1 - t0) * q) / parca;
            n.push(cx + mx * Math.cos(t) + kx * Math.sin(t), cy + my * Math.cos(t) + ky * Math.sin(t));
          }
          ekle(kat, n, Math.abs(t1 - t0 - 2 * Math.PI) < 1e-9, m);
          break;
        }
        case 'SPLINE': {
          const x = hepsi(k, 10);
          const y = hepsi(k, 20);
          const kontrol = x.map((v, q): [number, number] => [v, y[q] ?? 0]);
          const fy = hepsi(k, 21);
          const n =
            kontrol.length >= 2
              ? bSpline(sayi(k, 71, 3), hepsi(k, 40), kontrol, hepsi(k, 41))
              : gecisEgrisi(hepsi(k, 11).map((v, q): [number, number] => [v, fy[q] ?? 0]));
          ekle(kat, n, (sayi(k, 70) & 1) === 1, m);
          break;
        }
        case 'SOLID':
        case 'TRACE':
        case '3DFACE': {
          const p = [10, 11, 12, 13].map((c) => [sayi(k, c), sayi(k, c + 10)]);
          const sira = k.tip === '3DFACE' ? [0, 1, 2, 3] : [0, 1, 3, 2];
          ekle(kat, sira.flatMap((q) => p[q]!), true, k.tip === '3DFACE' ? m : bilesik(m, ocs(k)));
          break;
        }
        case 'LEADER':
          ekle(kat, hepsi(k, 10).flatMap((v, q) => [v, hepsi(k, 20)[q] ?? 0]), false, m);
          break;
        case 'INSERT':
        case 'DIMENSION': {
          const ad = unicodeKacisi(ilk(k, 2) ?? '');
          const blok = blokTanimi.get(ad);
          // Bir INSERT'ten sonra gelen nitelikler (ATTRIB … SEQEND) atlanır.
          if (k.tip === 'INSERT' && ilk(k, 66) === '1') {
            while (i + 1 < liste.length && liste[i + 1]!.tip === 'ATTRIB') i++;
            if (liste[i + 1]?.tip === 'SEQEND') i++;
          }
          if (!blok || derinlik > 16 || zincir.includes(ad)) {
            say(atlanan, k.tip);
            continue;
          }
          if (k.tip === 'DIMENSION') {
            ciz(blok.ogeler, m, kat, derinlik + 1, [...zincir, ad]);
          } else {
            const sx = sayi(k, 41, 1);
            const sy = sayi(k, 42, 1);
            const sutun = Math.max(1, sayi(k, 70, 1));
            const satir = Math.max(1, sayi(k, 71, 1));
            const temel = bilesik(bilesik(m, ocs(k)), bilesik(oteleme(sayi(k, 10), sayi(k, 20)), dondur(sayi(k, 50))));
            for (let a = 0; a < sutun; a++) {
              for (let b = 0; b < satir; b++) {
                const yerel = bilesik(oteleme(a * sayi(k, 44), b * sayi(k, 45)), bilesik(olcekle(sx, sy), oteleme(-blok.taban[0], -blok.taban[1])));
                ciz(blok.ogeler, bilesik(temel, yerel), kat, derinlik + 1, [...zincir, ad]);
              }
            }
          }
          break;
        }
        case 'VERTEX':
        case 'SEQEND':
          break;
        default:
          say(atlanan, ATLANAN.has(k.tip) ? k.tip : 'DIGER');
          continue;
      }
      if (k.tip !== 'VERTEX' && k.tip !== 'SEQEND') say(cizilen, k.tip);
    }
  };
  ciz(ogeler, BIRIM, null, 0, []);
  if (!parcalar.length) throw new DxfOkumaHatasi('BOS');

  return {
    surum,
    birim,
    katmanlar: katmanlar.filter((k) => k.parca > 0),
    parcalar: (() => {
      // Boş katmanlar listeden çıkınca katman numaraları yeniden sıralanır.
      const yeniNo = new Map<number, number>();
      katmanlar.forEach((k, i) => {
        if (k.parca > 0) yeniNo.set(i, yeniNo.size);
      });
      return parcalar.map((p) => ({ ...p, katman: yeniNo.get(p.katman)! }));
    })(),
    sinirlar: { minX, minY, maxX, maxY },
    cizilen,
    atlanan,
    kesildi,
  };
}

/** $INSUNITS → bir çizim biriminin metre karşılığı (birimsiz ya da bilinmiyorsa null). */
export function birimMetresi(insunits: number): number | null {
  const tablo: Record<number, number> = { 1: 0.0254, 2: 0.3048, 3: 1609.344, 4: 0.001, 5: 0.01, 6: 1, 7: 1000, 8: 0.0000254, 9: 0.0000254, 10: 0.9144, 14: 0.1, 15: 10, 16: 100 };
  return tablo[insunits] ?? null;
}
