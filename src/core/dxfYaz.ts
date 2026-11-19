// DXF dosya metni: AutoCAD R12 (AC1009) ASCII biçimi.
//
// R12, bütün CAD programlarının okuduğu en yalın DXF sürümüdür: tutamaç (handle), sınıf ve nesne
// bölümleri gerekmez. Yalnızca gereken kısım yazılır: başlık (sürüm, çizim sınırları), çizgi tipi,
// katman ve yazı stili tabloları, öğeler (POLYLINE/VERTEX, CIRCLE, POINT, TEXT).
//
// Metin Türkçe Windows kod sayfasıyla (ANSI_1254) yazılır ve başlıkta $DWGCODEPAGE ile belirtilir:
// R12'nin Türkçe harf için kendi yolu budur ve AutoCAD, BricsCAD, LibreCAD, ezdxf bunu okur. Kod
// sayfasında olmayan "→" ve "−" ASCII karşılıklarıyla, kalanlar AutoCAD'in \U+XXXX kaçışıyla yazılır.
// R12'de birim başlığı yoktur; koordinatlar metredir. Rust'taki `dxf` kütüphanesi R12'de R13'e özgü alt sınıf işaretleri,
// R2010'da tutamaçsız tablolar ve geçersiz saydamlık değerleri yazdığı için kullanılmadı.

import type { DxfCizimi, DxfNoktasi } from './dxf';

const SATIR = '\r\n';

/** Sayı: en fazla 6 ondalık, bilimsel gösterim yok. */
function sayi(x: number): string {
  if (!Number.isFinite(x)) throw new Error('DXF: sayı sonlu değil.');
  const s = Number(x.toFixed(6)).toString();
  return s.includes('e') ? x.toFixed(6) : s.includes('.') ? s : `${s}.0`;
}

/** Windows-1254 (Türkçe) kod sayfası: karakter → bayt (0x80–0xFF). */
const CP1254: Map<string, number> = (() => {
  const harita = new Map<string, number>();
  const cozucu = new TextDecoder('windows-1254');
  for (let b = 0x80; b <= 0xff; b++) {
    const c = cozucu.decode(new Uint8Array([b]));
    if (c !== '\uFFFD' && !harita.has(c)) harita.set(c, b);
  }
  return harita;
})();

const ASCII_KARSILIK: Record<string, string> = { '→': '->', '−': '-', '–': '-', '—': '-', '…': '...' };

/**
 * Metin: "^" işareti "^ " (DXF'te ^ denetim karakteri öneki), satır sonları boşluk; Windows-1254'te
 * olmayan karakterler ASCII karşılığıyla ya da \U+XXXX kaçışıyla; temel düzlem dışındakiler "?".
 */
export function dxfMetinKacisi(s: string): string {
  let sonuc = '';
  for (const c of s.replace(/[\r\n\t]+/g, ' ')) {
    const kod = c.codePointAt(0)!;
    if (c === '^') sonuc += '^ ';
    else if (kod < 32) sonuc += ' ';
    else if (kod < 128 || CP1254.has(c)) sonuc += c;
    else if (ASCII_KARSILIK[c]) sonuc += ASCII_KARSILIK[c];
    else if (kod <= 0xffff) sonuc += `\\U+${kod.toString(16).toUpperCase().padStart(4, '0')}`;
    else sonuc += '?';
  }
  return sonuc;
}

/** Kaçışı yapılmış metni Windows-1254 baytlarına çevirir. */
function cp1254(metin: string): Uint8Array {
  const b = new Uint8Array(metin.length);
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i]!;
    const kod = c.charCodeAt(0);
    b[i] = kod < 128 ? kod : (CP1254.get(c) ?? 0x3f);
  }
  return b;
}

class Yazici {
  private satirlar: string[] = [];
  kod(k: number, deger: string | number) {
    this.satirlar.push(String(k).padStart(3, ' '), typeof deger === 'number' ? sayi(deger) : deger);
  }
  tam(k: number, deger: number) {
    this.satirlar.push(String(k).padStart(3, ' '), String(Math.trunc(deger)).padStart(6, ' '));
  }
  nokta(p: DxfNoktasi, ilk = 10) {
    this.kod(ilk, p[0]);
    this.kod(ilk + 10, p[1]);
    this.kod(ilk + 20, 0);
  }
  metin() {
    return this.satirlar.join(SATIR) + SATIR;
  }
}

/** DXF dosyasının içeriği (Windows-1254 baytları). */
export function dxfBaytlari(cizim: DxfCizimi): Uint8Array {
  return cp1254(dxfMetni(cizim));
}

/** DXF metni (kaçışları yapılmış; dosyaya dxfBaytlari ile yazılır). */
export function dxfMetni(cizim: DxfCizimi): string {
  const katmanlar = new Set(cizim.katmanlar.map((k) => k.ad));
  for (const k of cizim.katmanlar) if (!/^[A-Za-z0-9_-]{1,31}$/.test(k.ad)) throw new Error(`DXF: geçersiz katman adı ${k.ad}`);
  for (const o of cizim.ogeler) if (!katmanlar.has(o.katman)) throw new Error(`DXF: tanımsız katman ${o.katman}`);

  // Çizim sınırları (AutoCAD'de "tümünü göster").
  let min: DxfNoktasi = [Infinity, Infinity];
  let max: DxfNoktasi = [-Infinity, -Infinity];
  const kapsa = (p: DxfNoktasi, r = 0) => {
    min = [Math.min(min[0], p[0] - r), Math.min(min[1], p[1] - r)];
    max = [Math.max(max[0], p[0] + r), Math.max(max[1], p[1] + r)];
  };
  for (const o of cizim.ogeler) {
    if (o.tur === 'cokgen') o.noktalar.forEach((p) => kapsa(p));
    else if (o.tur === 'daire') kapsa(o.merkez, o.yaricap);
    else kapsa(o.konum);
  }
  if (!Number.isFinite(min[0])) {
    min = [0, 0];
    max = [0, 0];
  }

  const y = new Yazici();
  y.kod(0, 'SECTION');
  y.kod(2, 'HEADER');
  y.kod(9, '$ACADVER');
  y.kod(1, 'AC1009');
  y.kod(9, '$DWGCODEPAGE');
  y.kod(3, 'ANSI_1254');
  y.kod(9, '$INSBASE');
  y.nokta([0, 0]);
  y.kod(9, '$EXTMIN');
  y.nokta(min);
  y.kod(9, '$EXTMAX');
  y.nokta(max);
  y.kod(0, 'ENDSEC');

  y.kod(0, 'SECTION');
  y.kod(2, 'TABLES');
  y.kod(0, 'TABLE');
  y.kod(2, 'LTYPE');
  y.tam(70, 1);
  y.kod(0, 'LTYPE');
  y.kod(2, 'CONTINUOUS');
  y.tam(70, 0);
  y.kod(3, 'Solid line');
  y.tam(72, 65);
  y.tam(73, 0);
  y.kod(40, 0);
  y.kod(0, 'ENDTAB');

  y.kod(0, 'TABLE');
  y.kod(2, 'LAYER');
  y.tam(70, cizim.katmanlar.length + 1);
  for (const k of [{ ad: '0', renk: 7 }, ...cizim.katmanlar]) {
    y.kod(0, 'LAYER');
    y.kod(2, k.ad);
    y.tam(70, 0);
    y.tam(62, k.renk);
    y.kod(6, 'CONTINUOUS');
  }
  y.kod(0, 'ENDTAB');

  y.kod(0, 'TABLE');
  y.kod(2, 'STYLE');
  y.tam(70, 1);
  y.kod(0, 'STYLE');
  y.kod(2, 'STANDARD');
  y.tam(70, 0);
  y.kod(40, 0);
  y.kod(41, 1);
  y.kod(50, 0);
  y.tam(71, 0);
  y.kod(42, 2.5);
  y.kod(3, 'txt');
  y.kod(4, '');
  y.kod(0, 'ENDTAB');
  y.kod(0, 'ENDSEC');

  y.kod(0, 'SECTION');
  y.kod(2, 'BLOCKS');
  y.kod(0, 'ENDSEC');

  y.kod(0, 'SECTION');
  y.kod(2, 'ENTITIES');
  for (const o of cizim.ogeler) {
    switch (o.tur) {
      case 'cokgen':
        if (o.noktalar.length < 2) throw new Error('DXF: çoklu çizgide en az iki nokta olmalı.');
        y.kod(0, 'POLYLINE');
        y.kod(8, o.katman);
        y.tam(66, 1);
        y.nokta([0, 0]);
        y.tam(70, o.kapali ? 1 : 0);
        for (const p of o.noktalar) {
          y.kod(0, 'VERTEX');
          y.kod(8, o.katman);
          y.nokta(p);
        }
        y.kod(0, 'SEQEND');
        y.kod(8, o.katman);
        break;
      case 'daire':
        if (!(o.yaricap > 0)) throw new Error('DXF: daire yarıçapı sıfırdan büyük olmalı.');
        y.kod(0, 'CIRCLE');
        y.kod(8, o.katman);
        y.nokta(o.merkez);
        y.kod(40, o.yaricap);
        break;
      case 'nokta':
        y.kod(0, 'POINT');
        y.kod(8, o.katman);
        y.nokta(o.konum);
        break;
      case 'yazi':
        if (!(o.yukseklik > 0)) throw new Error('DXF: yazı yüksekliği sıfırdan büyük olmalı.');
        y.kod(0, 'TEXT');
        y.kod(8, o.katman);
        y.nokta(o.konum);
        y.kod(40, o.yukseklik);
        y.kod(1, dxfMetinKacisi(o.metin));
        y.kod(7, 'STANDARD');
        break;
    }
  }
  y.kod(0, 'ENDSEC');
  y.kod(0, 'EOF');
  return y.metin();
}
