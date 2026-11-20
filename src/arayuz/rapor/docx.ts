// Word raporu: çekirdeğin rapor içeriğini (raporIcerigi) biçimlendirir; kendi başına metin ya da
// sayı üretmez. Görünüm resmi: Calibri, lacivert başlıklar, ince çizgili tablolar.

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { RaporBlogu, RaporIcerigi } from '../../core';
import type { RaporGorseli, RaporGorselleri } from './gorsel';

const FONT = 'Calibri';
const LACIVERT = '1F3862';
const KENAR = 'BFBFBF';
const ACIK = 'F2F2F2';
const GRI = '595959';
const P_GOVDE = 21;
const P_KUCUK = 17;
const P_TABLO = 18;
const P_BASLIK1 = 30;
const P_BASLIK2 = 24;
/** A4, 2 cm kenar boşluğu: yazı alanı genişliği (twip) ve piksel karşılığı (96 dpi). */
const ICERIK_TWIP = 11906 - 2 * 1134;
const ICERIK_PX = Math.round((ICERIK_TWIP / 1440) * 96);

const run = (text: string, o: { kalin?: boolean; boyut?: number; renk?: string; italik?: boolean } = {}) =>
  new TextRun({ text, font: FONT, size: o.boyut ?? P_GOVDE, bold: !!o.kalin, italics: !!o.italik, ...(o.renk ? { color: o.renk } : {}) });

/** Görseli oranını bozmadan en geniş/en yüksek kutuya sığdırır (küçük görsel büyütülmez). */
function gorselRun(g: RaporGorseli, enGenis: number, enYuksek = Infinity) {
  const oran = g.genislik > 0 ? g.yukseklik / g.genislik : 0.6;
  let genislik = Math.min(enGenis, g.genislik || enGenis);
  if (genislik * oran > enYuksek) genislik = enYuksek / oran;
  return new ImageRun({ data: g.veri, type: g.tur, transformation: { width: Math.round(genislik), height: Math.round(genislik * oran) } });
}

function hucre(metin: string, genislik: number, o: { baslik?: boolean; kalin?: boolean; dolgu?: string; punto: number; ortali?: boolean; birlesik?: number }) {
  return new TableCell({
    width: { size: genislik, type: WidthType.DXA },
    ...(o.birlesik ? { columnSpan: o.birlesik } : {}),
    ...(o.baslik ? { shading: { type: ShadingType.CLEAR, fill: LACIVERT } } : o.dolgu ? { shading: { type: ShadingType.CLEAR, fill: o.dolgu } } : {}),
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    children: [
      new Paragraph({
        keepNext: true,
        keepLines: true,
        ...(o.ortali ? { alignment: AlignmentType.CENTER } : {}),
        children: [run(metin, { kalin: o.baslik || o.kalin, boyut: o.punto, ...(o.baslik ? { renk: 'FFFFFF' } : {}) })],
      }),
    ],
  });
}

function tablo(b: Extract<RaporBlogu, { tur: 'tablo' }>): Table {
  const toplam = b.genislikler.reduce((a, c) => a + c, 0);
  const g = b.genislikler.map((x) => Math.round((x / toplam) * ICERIK_TWIP));
  const punto = b.kucuk ? P_KUCUK : P_TABLO;
  const kenar = { style: BorderStyle.SINGLE, size: 2, color: KENAR };
  const satirlar: TableRow[] = [];
  if (b.basliklar.length) {
    satirlar.push(new TableRow({ cantSplit: true, tableHeader: true, children: b.basliklar.map((h, i) => hucre(h, g[i] ?? 1000, { baslik: true, punto })) }));
  }
  for (const s of b.satirlar) {
    satirlar.push(
      new TableRow({
        cantSplit: true,
        children: s.map((h, i) => hucre(h, g[i] ?? 1000, { punto, ...(b.anahtarDeger && i === 0 ? { kalin: true, dolgu: ACIK } : {}) })),
      }),
    );
  }
  if (b.altBilgi) {
    satirlar.push(new TableRow({ cantSplit: true, children: [hucre(b.altBilgi, ICERIK_TWIP, { kalin: true, dolgu: ACIK, punto, ortali: true, birlesik: g.length })] }));
  }
  return new Table({
    width: { size: ICERIK_TWIP, type: WidthType.DXA },
    columnWidths: g,
    borders: { top: kenar, bottom: kenar, left: kenar, right: kenar, insideHorizontal: kenar, insideVertical: kenar },
    rows: satirlar,
  });
}

const bosluk = (once = 120) => new Paragraph({ spacing: { before: once }, children: [] });

/** Kapağın altındaki "Hazırlayan" bloğu: ad, unvan, sicil, tarih ve imza. Sayfada ortalanır. */
function imzaBlogu(r: RaporIcerigi, imza: RaporGorseli | null): (Paragraph | Table)[] {
  const m = r.muhendis;
  const e = r.etiketler;
  const kenar = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const satir = (anahtar: string, deger: string) =>
    new TableRow({
      children: [
        new TableCell({ width: { size: 2200, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 0, right: 80 }, children: [new Paragraph({ children: [run(anahtar, { kalin: true })] })] }),
        new TableCell({ width: { size: 4400, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: [new Paragraph({ children: [run(deger)] })] }),
      ],
    });
  const imzaHucresi = imza
    ? new Paragraph({ children: [gorselRun(imza, 180, 70)] })
    : new Paragraph({ spacing: { before: 600 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GRI, space: 1 } }, children: [] });
  return [
    new Paragraph({
      keepNext: true,
      alignment: AlignmentType.CENTER,
      spacing: { before: 900, after: 120 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: KENAR, space: 12 } },
      children: [run(e.hazirlayan, { kalin: true, boyut: P_BASLIK2, renk: LACIVERT })],
    }),
    new Table({
      alignment: AlignmentType.CENTER,
      width: { size: 6600, type: WidthType.DXA },
      columnWidths: [2200, 4400],
      borders: { top: kenar, bottom: kenar, left: kenar, right: kenar, insideHorizontal: kenar, insideVertical: kenar },
      rows: [
        satir(e.adSoyad, m.ad || '-'),
        satir(e.unvan, m.unvan || '-'),
        satir(e.sicilNo, m.sicilNo || '-'),
        satir(e.tarih, m.tarih),
        new TableRow({
          children: [
            new TableCell({ width: { size: 2200, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 0, right: 80 }, children: [new Paragraph({ children: [run(e.imza, { kalin: true })] })] }),
            new TableCell({ width: { size: 4400, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: [imzaHucresi] }),
          ],
        }),
      ],
    }),
  ];
}

/** Kapak: logo, firma, başlık, proje, belge bilgileri ve hazırlayan/imza. Logo ve imza yalnızca burada yer alır. */
function kapak(r: RaporIcerigi, logo: RaporGorseli | null, imza: RaporGorseli | null): (Paragraph | Table)[] {
  const k = r.kapak;
  const ortali = (children: TextRun[] | ImageRun[], once: number, sonra = 120) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: once, after: sonra }, children });
  const p: (Paragraph | Table)[] = [];
  if (logo) p.push(ortali([gorselRun(logo, 200, 110)], 500, 200));
  p.push(
    ortali([run(k.firma, { kalin: true, boyut: 30, renk: LACIVERT })], logo ? 200 : 1500, 500),
    ortali([run(k.baslik, { kalin: true, boyut: 32 })], 400, 400),
    ortali([run(k.proje, { kalin: true, boyut: 26, renk: LACIVERT })], 0),
    ortali([run(k.adres)], 0, 800),
  );
  const e = r.etiketler;
  if (k.raporNo) p.push(ortali([run(`${e.raporNo}: ${k.raporNo}`)], 0));
  p.push(ortali([run(`${e.revizyon}: ${k.revizyon}`)], 0), ortali([run(`${e.raporTarihi}: ${k.tarih}`)], 0), ...imzaBlogu(r, imza), new Paragraph({ children: [new PageBreak()] }));
  return p;
}

export function raporBelgesi(r: RaporIcerigi, gorseller: RaporGorselleri): Document {
  const c: (Paragraph | Table | TableOfContents)[] = [...kapak(r, gorseller.logo, gorseller.imza)];
  const basliklar = r.bloklar.filter((b): b is Extract<RaporBlogu, { tur: 'baslik' }> => b.tur === 'baslik');

  for (const b of r.bloklar) {
    switch (b.tur) {
      case 'baslik':
        c.push(
          new Paragraph({
            heading: b.seviye === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
            keepNext: true,
            keepLines: true,
            spacing: { before: b.seviye === 1 ? 360 : 240, after: 140 },
            children: [run(`${b.numara}. ${b.metin}`, { kalin: true, boyut: b.seviye === 1 ? P_BASLIK1 : P_BASLIK2, renk: LACIVERT })],
          }),
        );
        break;
      case 'paragraf':
        c.push(
          new Paragraph({
            spacing: { after: b.kucuk ? 100 : 160 },
            ...(b.ortali ? { alignment: AlignmentType.CENTER } : {}),
            children: b.parcalar.map((x) => run(x.metin, { kalin: x.kalin, boyut: b.kucuk ? P_KUCUK : P_GOVDE, italik: b.italik })),
          }),
        );
        break;
      case 'maddeler':
        for (const madde of b.maddeler) {
          c.push(new Paragraph({ spacing: { after: 80 }, indent: { left: 360, hanging: 240 }, children: [run('•\t'), ...madde.map((x) => run(x.metin, { kalin: x.kalin }))] }));
        }
        c.push(bosluk(40));
        break;
      case 'tablo':
        c.push(tablo(b), bosluk());
        break;
      case 'gorsel': {
        const g = gorseller[b.kaynak];
        if (!g) break;
        c.push(
          new Paragraph({ keepNext: true, spacing: { before: 200, after: 120 }, alignment: AlignmentType.CENTER, children: [gorselRun(g, ICERIK_PX)] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [run(b.aciklama, { italik: true, boyut: P_KUCUK })] }),
        );
        break;
      }
      case 'icindekiler':
        c.push(
          new Paragraph({ spacing: { before: 360, after: 160 }, children: [run(r.etiketler.icindekiler, { kalin: true, boyut: P_BASLIK1, renk: LACIVERT })] }),
          new TableOfContents(r.etiketler.icindekiler, {
            hyperlink: true,
            headingStyleRange: '1-2',
            // Word açılışta sayfa numaralarını günceller; güncellenmezse başlıklar yine görünür.
            cachedEntries: basliklar.map((h) => ({ title: `${h.numara}. ${h.metin}`, level: h.seviye })),
          }),
        );
        break;
      case 'sayfaSonu':
        c.push(new Paragraph({ children: [new PageBreak()] }));
        break;
    }
  }

  const ustBilgi = new Header({
    children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: KENAR, space: 4 } }, children: [run(r.ustBilgi, { boyut: P_KUCUK, renk: GRI })] })],
  });
  const altBilgi = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ font: FONT, size: P_KUCUK, color: GRI, children: [`${r.etiketler.sayfa} `, PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES] })],
      }),
    ],
  });
  const bos = { default: new Header({ children: [] }) };

  return new Document({
    creator: 'bugragungoz',
    title: r.belgeBasligi,
    description: r.etiketler.belgeAciklamasi,
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: FONT, size: P_GOVDE, language: { value: r.etiketler.dil } } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: P_BASLIK1, bold: true, color: LACIVERT } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: P_BASLIK2, bold: true, color: LACIVERT } },
      ],
    },
    sections: [
      {
        properties: { titlePage: true, page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        headers: { default: ustBilgi, first: bos.default },
        footers: { default: altBilgi, first: new Footer({ children: [] }) },
        children: c,
      },
    ],
  });
}

export async function raporBaytlari(r: RaporIcerigi, gorseller: RaporGorselleri): Promise<Uint8Array> {
  const blob = await Packer.toBlob(raporBelgesi(r, gorseller));
  return new Uint8Array(await blob.arrayBuffer());
}
