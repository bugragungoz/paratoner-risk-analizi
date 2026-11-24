// Var olan bir DXF dosyasına öğe ekler (altlık çizimine paratonerler). Dosyanın geri kalanına
// dokunulmaz: baytlar latin1 olarak bire bir işlenir, eklenen metinler ASCII'dir (Türkçe harfler
// \U+XXXX kaçışıyla), bu yüzden dosyanın kod sayfasıyla ya da UTF-8 olmasıyla bozulmaz.
//
//   - AutoCAD R13 ve sonrası (AC1012+): öğelere yeni tanıtıcı (handle), model uzayı sahibi ve alt sınıf
//     işaretleri yazılır; $HANDSEED güncellenir. Yeni katman kaydı "0" katmanının kaydından türetilir.
//   - R12 (AC1009): tanıtıcısız, alt sınıfsız basit öğeler.
//   - Hiçbir şey silinmez: zaten PT_PARATONER öğeleri olan bir dosyaya uygulanırsa yeni öğeler
//     eskilerin yanına eklenir. Katman zaten varsa yeniden kullanılır.

import type { DxfCizimi, DxfOgesi } from './dxf';

export class DxfEklemeHatasi extends Error {}

type Cift = [string, string];

const SURUM_SIRASI = ['AC1009', 'AC1012', 'AC1014', 'AC1015', 'AC1018', 'AC1021', 'AC1024', 'AC1027', 'AC1032'];

/** Sayı: en çok 6 ondalık, nokta ayraç, sondaki sıfırlar atılır. */
function sayi(x: number): string {
  if (!Number.isFinite(x)) throw new DxfEklemeHatasi('geçersiz sayı');
  const s = x.toFixed(6).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
}

/** Eklenecek metin: ASCII dışı karakterler \U+XXXX; "^" DXF'te denetim öneki olduğu için "^ ". */
export function dxfAsciiMetin(s: string): string {
  let sonuc = '';
  for (const c of s.replace(/[\r\n\t]+/g, ' ').trim()) {
    const kod = c.codePointAt(0)!;
    if (c === '^') sonuc += '^ ';
    else if (kod < 32) sonuc += ' ';
    else if (kod < 127) sonuc += c;
    else if (kod <= 0xffff) sonuc += `\\U+${kod.toString(16).toUpperCase().padStart(4, '0')}`;
    else sonuc += '?';
  }
  return sonuc;
}

const latin1 = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return s;
};

interface Bolum {
  /** Bölümün ilk öğesinin çift dizini ("2 AD" çiftinden sonraki). */
  bas: number;
  /** "0 ENDSEC" çiftinin dizini. */
  son: number;
}

/** Bir aralıktaki "0" ile başlayan kayıtlar: [başlangıç, bitiş) çift dizinleri. */
function kayitlar(c: Cift[], bas: number, son: number): { bas: number; son: number; tur: string }[] {
  const k: { bas: number; son: number; tur: string }[] = [];
  for (let i = bas; i < son; i++) {
    if (c[i]![0] !== '0') continue;
    let j = i + 1;
    while (j < son && c[j]![0] !== '0') j++;
    k.push({ bas: i, son: j, tur: c[i]![1].trim() });
  }
  return k;
}

const ilk = (c: Cift[], bas: number, son: number, kod: string) => {
  for (let i = bas + 1; i < son; i++) if (c[i]![0] === kod) return c[i]![1].trim();
  return undefined;
};

/** `orijinal` DXF'e `cizim`deki katmanları ve öğeleri ekler; dosyadaki hiçbir şey silinmez ya da değişmez. */
export function dxfeEkle(orijinal: Uint8Array, cizim: DxfCizimi): Uint8Array {
  const metin = latin1(orijinal);
  if (metin.startsWith('AutoCAD Binary DXF')) throw new DxfEklemeHatasi('ikili DXF');
  const satirSonu = metin.includes('\r\n') ? '\r\n' : '\n';
  const satir = metin.split(/\r?\n/);
  while (satir.length && satir[satir.length - 1] === '') satir.pop();
  const c: Cift[] = [];
  // UTF-8 BOM (latin1 olarak okunduğunda üç karakter) yalnızca karşılaştırmada atılır; çıktıya ham
  // satır aynen yazılır, BOM korunur.
  for (let i = 0; i + 1 < satir.length; i += 2) c.push([satir[i]!.replace(/^\u00ef\u00bb\u00bf/, '').trim(), satir[i + 1]!]);

  const bolumler: Record<string, Bolum> = {};
  for (let i = 0; i + 1 < c.length; i++) {
    if (c[i]![0] === '0' && c[i]![1].trim() === 'SECTION' && c[i + 1]![0] === '2') {
      const ad = c[i + 1]![1].trim();
      let j = i + 2;
      while (j < c.length && !(c[j]![0] === '0' && c[j]![1].trim() === 'ENDSEC')) j++;
      if (j >= c.length) throw new DxfEklemeHatasi('bölüm kapanmıyor');
      bolumler[ad] = { bas: i + 2, son: j };
      i = j;
    }
  }
  const H = bolumler.HEADER;
  const T = bolumler.TABLES;
  const E = bolumler.ENTITIES;
  if (!E || !T) throw new DxfEklemeHatasi('ENTITIES ya da TABLES bölümü yok');

  // Sürüm: R13 ve sonrası tanıtıcılı.
  let surum = 'AC1009';
  if (H) for (let i = H.bas; i + 1 < H.son; i++) if (c[i]![0] === '9' && c[i]![1].trim() === '$ACADVER') surum = c[i + 1]![1].trim();
  const tanitici = SURUM_SIRASI.indexOf(surum) !== 0;

  // En büyük tanıtıcı ve yeni tanıtıcı üretici.
  let enBuyuk = 0n;
  for (const [k, v] of c) {
    if (k !== '5' && k !== '105') continue;
    const t = v.trim();
    if (/^[0-9A-Fa-f]{1,16}$/.test(t)) {
      const n = BigInt(`0x${t}`);
      if (n > enBuyuk) enBuyuk = n;
    }
  }
  const yeniTanitici = () => (++enBuyuk).toString(16).toUpperCase();

  // 1) Katman tablosu, model uzayı sahibi ve yazı stili.
  const tablolar = kayitlar(c, T.bas, T.son);
  let katmanTablosu: string | undefined;
  let katmanTablosuSonu = -1;
  let modelUzayi: string | undefined;
  let yaziStili: string | undefined;
  let sifirKatmani: { bas: number; son: number } | undefined;
  const varOlanKatman = new Set<string>();
  let tablo = '';
  for (const k of tablolar) {
    if (k.tur === 'TABLE') {
      tablo = ilk(c, k.bas, k.son, '2') ?? '';
      if (tablo === 'LAYER') katmanTablosu = ilk(c, k.bas, k.son, '5');
    } else if (k.tur === 'ENDTAB') {
      if (tablo === 'LAYER') katmanTablosuSonu = k.bas;
      tablo = '';
    } else if (k.tur === 'LAYER') {
      const ad = ilk(c, k.bas, k.son, '2') ?? '';
      varOlanKatman.add(ad.toUpperCase());
      if (ad === '0') sifirKatmani = k;
    } else if (k.tur === 'BLOCK_RECORD' && (ilk(c, k.bas, k.son, '2') ?? '').toUpperCase() === '*MODEL_SPACE') {
      modelUzayi = ilk(c, k.bas, k.son, '5');
    } else if (k.tur === 'STYLE' && (ilk(c, k.bas, k.son, '2') ?? '').toUpperCase() === 'STANDARD') {
      yaziStili = ilk(c, k.bas, k.son, '2');
    }
  }
  if (katmanTablosuSonu < 0) throw new DxfEklemeHatasi('katman tablosu yok');
  if (tanitici && !modelUzayi) throw new DxfEklemeHatasi('model uzayı kaydı yok');

  // 2) Yeni katman kayıtları.
  const yeniKatmanlar: string[] = [];
  for (const k of cizim.katmanlar) {
    if (varOlanKatman.has(k.ad.toUpperCase())) continue;
    const renk = String(Math.abs(Math.round(k.renk)) || 7);
    if (!tanitici) {
      yeniKatmanlar.push('0', 'LAYER', '2', k.ad, '70', '0', '62', renk, '6', 'CONTINUOUS');
      continue;
    }
    const h = yeniTanitici();
    if (sifirKatmani) {
      // "0" katmanının kaydından türetilir (sürüme özgü zorunlu alanlar korunur); tepki ve uzantı grupları atılır.
      let grupta = false;
      for (let j = sifirKatmani.bas; j < sifirKatmani.son; j++) {
        const [kod, v] = c[j]!;
        if (kod === '102') {
          grupta = v.trim().startsWith('{');
          continue;
        }
        if (grupta || Number(kod) >= 1000) continue;
        const deger = kod === '5' ? h : kod === '2' ? k.ad : kod === '70' ? '0' : kod === '62' ? renk : v;
        yeniKatmanlar.push(satir[2 * j]!, deger);
      }
    } else {
      yeniKatmanlar.push('0', 'LAYER', '5', h);
      if (katmanTablosu) yeniKatmanlar.push('330', katmanTablosu);
      yeniKatmanlar.push('100', 'AcDbSymbolTableRecord', '100', 'AcDbLayerTableRecord', '2', k.ad, '70', '0', '62', renk, '6', 'Continuous');
    }
  }

  // 3) Yeni öğeler.
  const yeniOgeler: string[] = [];
  const bas = (tur: string, katman: string, altSinif: string) => {
    yeniOgeler.push('0', tur);
    if (tanitici) yeniOgeler.push('5', yeniTanitici(), '330', modelUzayi!, '100', 'AcDbEntity');
    yeniOgeler.push('8', katman);
    if (tanitici) yeniOgeler.push('100', altSinif);
  };
  const nokta = (kod: number, [x, y]: [number, number]) => yeniOgeler.push(String(kod), sayi(x), String(kod + 10), sayi(y), String(kod + 20), '0');
  const ekle = (o: DxfOgesi) => {
    switch (o.tur) {
      case 'nokta':
        bas('POINT', o.katman, 'AcDbPoint');
        nokta(10, o.konum);
        break;
      case 'daire':
        bas('CIRCLE', o.katman, 'AcDbCircle');
        nokta(10, o.merkez);
        yeniOgeler.push('40', sayi(o.yaricap));
        break;
      case 'yazi':
        bas('TEXT', o.katman, 'AcDbText');
        nokta(10, o.konum);
        yeniOgeler.push('40', sayi(o.yukseklik), '1', dxfAsciiMetin(o.metin));
        if (yaziStili) yeniOgeler.push('7', yaziStili);
        if (tanitici) yeniOgeler.push('100', 'AcDbText');
        break;
      case 'cokgen':
        if (tanitici) {
          bas('LWPOLYLINE', o.katman, 'AcDbPolyline');
          yeniOgeler.push('90', String(o.noktalar.length), '70', o.kapali ? '1' : '0');
          for (const [x, y] of o.noktalar) yeniOgeler.push('10', sayi(x), '20', sayi(y));
        } else {
          bas('POLYLINE', o.katman, '');
          yeniOgeler.push('66', '1', '10', '0', '20', '0', '30', '0', '70', o.kapali ? '1' : '0');
          for (const p of o.noktalar) {
            yeniOgeler.push('0', 'VERTEX', '8', o.katman);
            nokta(10, p);
          }
          yeniOgeler.push('0', 'SEQEND', '8', o.katman);
        }
        break;
    }
  };
  for (const o of cizim.ogeler) ekle(o);

  // 4) $HANDSEED: bir sonraki boş tanıtıcı.
  const handseed = tanitici ? (enBuyuk + 1n).toString(16).toUpperCase() : null;

  // 5) Dosyayı yeniden kur: satırlar aynen, eklemeler yerine konur.
  const cikti: string[] = [];
  for (let j = 0; j < c.length; j++) {
    if (j === katmanTablosuSonu) cikti.push(...yeniKatmanlar);
    if (j === E.son) cikti.push(...yeniOgeler);
    let deger = satir[2 * j + 1]!;
    if (handseed && H && j > H.bas && j < H.son && c[j]![0] === '5' && c[j - 1]![0] === '9' && c[j - 1]![1].trim() === '$HANDSEED') deger = handseed;
    cikti.push(satir[2 * j]!, deger);
  }
  // Çift sayılarının dışında kalan son satırlar (EOF'tan sonrası) korunur.
  for (let j = 2 * c.length; j < satir.length; j++) cikti.push(satir[j]!);
  const yazi = cikti.join(satirSonu) + satirSonu;
  const b = new Uint8Array(yazi.length);
  for (let i = 0; i < yazi.length; i++) b[i] = yazi.charCodeAt(i) & 0xff;
  return b;
}
