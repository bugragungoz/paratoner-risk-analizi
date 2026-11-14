// PDF raporu: çekirdeğin rapor içeriğini (raporIcerigi) pdfmake belge tanımına çevirir. Word
// raporuyla aynı içerik, aynı kenar boşlukları ve Calibri ile aynı ölçülere sahip Carlito yazı tipi.
// Bu dosya tarayıcıya bağlı değildir; testlerde Node'da da çalışır.

import type { RaporBlogu, RaporIcerigi } from '../../core';
import type { RaporGorseli, RaporGorselleri } from './gorsel';

export const PDF_YAZI_TIPI = 'Carlito';
export const PDF_YAZI_DOSYALARI = {
  normal: 'Carlito-Regular.ttf',
  bold: 'Carlito-Bold.ttf',
  italics: 'Carlito-Italic.ttf',
  // Raporda kalın italik yok; pakete ayrı dosya eklenmez.
  bolditalics: 'Carlito-Bold.ttf',
} as const;

const LACIVERT = '#1F3862';
const KENAR = '#BFBFBF';
const ACIK = '#F2F2F2';
const GRI = '#595959';
/** A4 (pt) ve 2 cm kenar boşluğu. */
const SAYFA_GENISLIGI = 595.28;
const KENAR_BOSLUGU = 56.7;
const ICERIK = SAYFA_GENISLIGI - 2 * KENAR_BOSLUGU;

type Dugum = Record<string, unknown>;

function base64(veri: Uint8Array): string {
  let s = '';
  for (let i = 0; i < veri.length; i += 0x8000) s += String.fromCharCode(...veri.subarray(i, i + 0x8000));
  return btoa(s);
}

const gorselUrl = (g: RaporGorseli) => `data:image/${g.tur === 'png' ? 'png' : 'jpeg'};base64,${base64(g.veri)}`;

function tablo(b: Extract<RaporBlogu, { tur: 'tablo' }>): Dugum {
  const toplam = b.genislikler.reduce((a, c) => a + c, 0);
  // Hücre iç boşlukları ve çizgiler için birkaç pt pay bırakılır.
  const genislikler = b.genislikler.map((x) => Math.floor((x / toplam) * (ICERIK - b.genislikler.length * 8.5)));
  const boyut = b.kucuk ? 8.5 : 9;
  const govde: Dugum[][] = [];
  if (b.basliklar.length) govde.push(b.basliklar.map((h) => ({ text: h, bold: true, color: '#FFFFFF', fillColor: LACIVERT })));
  for (const s of b.satirlar) govde.push(s.map((h, i) => (b.anahtarDeger && i === 0 ? { text: h, bold: true, fillColor: ACIK } : { text: h })));
  if (b.altBilgi) govde.push([{ text: b.altBilgi, bold: true, fillColor: ACIK, alignment: 'center', colSpan: genislikler.length }, ...genislikler.slice(1).map(() => ({}))]);
  return {
    table: { headerRows: b.basliklar.length ? 1 : 0, dontBreakRows: true, widths: genislikler, body: govde },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => KENAR,
      vLineColor: () => KENAR,
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 2.5,
      paddingBottom: () => 2.5,
    },
    fontSize: boyut,
    margin: [0, 0, 0, 8],
  };
}

/** Kapağın altındaki "Hazırlayan" bloğu; sayfada ortalanır ve kapağı bitirir. */
function imzaBlogu(r: RaporIcerigi, imza: RaporGorseli | null): Dugum {
  const m = r.muhendis;
  const satir = (a: string, d: string) => [{ text: a, bold: true }, { text: d }];
  const imzaHucresi = imza ? { image: gorselUrl(imza), fit: [140, 60] } : { canvas: [{ type: 'line', x1: 0, y1: 40, x2: 200, y2: 40, lineWidth: 0.6, lineColor: GRI }] };
  return {
    unbreakable: true,
    pageBreak: 'after',
    margin: [0, 44, 0, 0],
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: ICERIK, y2: 0, lineWidth: 0.5, lineColor: KENAR }] },
      { text: 'Hazırlayan', bold: true, fontSize: 12, color: LACIVERT, alignment: 'center', margin: [0, 12, 0, 6] },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            layout: 'noBorders',
            table: {
              widths: [100, 220],
              body: [satir('Ad soyad', m.ad || '-'), satir('Unvan', m.unvan || '-'), satir('EMO sicil no', m.sicilNo || '-'), satir('Tarih', m.tarih), [{ text: 'İmza', bold: true }, imzaHucresi]],
            },
          },
          { width: '*', text: '' },
        ],
      },
    ],
  };
}

/** Kapak: logo ve imza yalnızca burada yer alır. */
function kapak(r: RaporIcerigi, logo: RaporGorseli | null, imza: RaporGorseli | null): Dugum[] {
  const k = r.kapak;
  const d: Dugum[] = [];
  if (logo) d.push({ image: gorselUrl(logo), fit: [150, 82], alignment: 'center', margin: [0, 26, 0, 10] });
  d.push(
    { text: k.firma, bold: true, fontSize: 15, color: LACIVERT, alignment: 'center', margin: [0, logo ? 10 : 90, 0, 30] },
    { text: k.baslik, bold: true, fontSize: 16, alignment: 'center', margin: [0, 20, 0, 20] },
    { text: k.proje, bold: true, fontSize: 13, color: LACIVERT, alignment: 'center', margin: [0, 0, 0, 6] },
    { text: k.adres, alignment: 'center', margin: [0, 0, 0, 40] },
  );
  if (k.raporNo) d.push({ text: `Rapor no: ${k.raporNo}`, alignment: 'center', margin: [0, 0, 0, 6] });
  d.push({ text: `Revizyon: ${k.revizyon}`, alignment: 'center', margin: [0, 0, 0, 6] }, { text: `Rapor tarihi: ${k.tarih}`, alignment: 'center' }, imzaBlogu(r, imza));
  return d;
}

export function pdfTanimi(r: RaporIcerigi, gorseller: RaporGorselleri): Dugum {
  const icerik: Dugum[] = kapak(r, gorseller.logo, gorseller.imza);

  for (const b of r.bloklar) {
    switch (b.tur) {
      case 'baslik':
        icerik.push({
          text: `${b.numara}. ${b.metin}`,
          bold: true,
          color: LACIVERT,
          fontSize: b.seviye === 1 ? 15 : 12,
          margin: [0, b.seviye === 1 ? 14 : 10, 0, 6],
          headlineLevel: b.seviye,
          tocItem: true,
          ...(b.seviye === 2 ? { tocMargin: [14, 0, 0, 0] } : {}),
        });
        break;
      case 'paragraf':
        icerik.push({
          text: b.parcalar.map((x) => ({ text: x.metin, bold: !!x.kalin })),
          fontSize: b.kucuk ? 8.5 : 10.5,
          italics: !!b.italik,
          ...(b.ortali ? { alignment: 'center' } : {}),
          margin: [0, 0, 0, b.kucuk ? 6 : 8],
        });
        break;
      case 'maddeler':
        icerik.push({ ul: b.maddeler.map((m) => ({ text: m.map((x) => ({ text: x.metin, bold: !!x.kalin })) })), margin: [0, 0, 0, 8] });
        break;
      case 'tablo':
        icerik.push(tablo(b));
        break;
      case 'gorsel': {
        const g = gorseller[b.kaynak];
        if (!g) break;
        icerik.push({
          unbreakable: true,
          stack: [
            { image: gorselUrl(g), fit: [ICERIK, 560], alignment: 'center', margin: [0, 8, 0, 6] },
            { text: b.aciklama, italics: true, fontSize: 8.5, alignment: 'center', margin: [0, 0, 0, 12] },
          ],
        });
        break;
      }
      case 'icindekiler':
        icerik.push({ toc: { title: { text: 'İçindekiler', bold: true, fontSize: 15, color: LACIVERT, margin: [0, 18, 0, 8] } }, margin: [0, 0, 0, 0] });
        break;
      case 'sayfaSonu':
        icerik.push({ text: '', pageBreak: 'after' });
        break;
    }
  }

  return {
    pageSize: 'A4',
    pageMargins: [KENAR_BOSLUGU, 64, KENAR_BOSLUGU, 56],
    info: { title: r.belgeBasligi, creator: 'Paratoner Risk Analizi', producer: 'Paratoner Risk Analizi' },
    defaultStyle: { font: PDF_YAZI_TIPI, fontSize: 10.5, lineHeight: 1.12 },
    header: (sayfa: number) =>
      sayfa === 1
        ? null
        : {
            margin: [KENAR_BOSLUGU, 28, KENAR_BOSLUGU, 0],
            stack: [
              { text: r.ustBilgi, fontSize: 8.5, color: GRI, alignment: 'right' },
              { canvas: [{ type: 'line', x1: 0, y1: 4, x2: ICERIK, y2: 4, lineWidth: 0.5, lineColor: KENAR }] },
            ],
          },
    footer: (sayfa: number, toplam: number) => (sayfa === 1 ? null : { text: `Sayfa ${sayfa} / ${toplam}`, fontSize: 8.5, color: GRI, alignment: 'center', margin: [0, 18, 0, 0] }),
    // Başlık sayfanın son satırına düşmesin.
    pageBreakBefore: (dugum: { headlineLevel?: number }, sorgu: { getFollowingNodesOnPage: () => unknown[] }) => !!dugum.headlineLevel && sorgu.getFollowingNodesOnPage().length === 0,
    content: icerik,
  };
}
