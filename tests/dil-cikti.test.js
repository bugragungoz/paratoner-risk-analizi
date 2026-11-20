// İngilizce çıktılar: hesap, rapor, CSV, Word, PDF ve dosya mesajları İngilizce üretilir; sayılar
// Türkçe çıktıyla aynıdır (dil yalnızca etiketleri ve biçimi değiştirir). İngilizce sözlükte Türkçe
// metin kalmamıştır.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, test, expect } from 'vitest';
import JSZip from 'jszip';
import { Packer } from 'docx';
import * as ck from '../src/core';
import { metinler } from '../src/dil';
import { raporBelgesi } from '../src/arayuz/rapor/docx';
import { PDF_YAZI_DOSYALARI, PDF_YAZI_TIPI, pdfTanimi } from '../src/arayuz/rapor/pdfTanimi';
import { ornekProfiller, tiptenProfilAdi } from '../src/arayuz/durum/cProfilleri';
import { kanitSenaryosu } from './veri/projeler';

const TR = metinler('tr');
const EN = metinler('en');
const TURKCE_HARF = /[çğıöşüÇĞİÖŞÜ]/;
/** İngilizce metinde bilerek Türkçe kalan özel adlar. */
const IZINLI = ['Türkçe', 'Türkiye', 'Paratoner Otomatik Kayıt', 'Buğra Güngöz', "d'amorçage"];
const izinlilerSiz = (s) => IZINLI.reduce((m, a) => m.split(a).join(''), s);

const GIRDI = {
  firmaAdi: 'Example Engineering',
  tesisAdresi: 'Example site',
  raporTarihi: '20/11/2026',
  raporNo: 'PR-2026-014',
  revizyonlar: [],
  muhendis: { ad: 'Name Surname', unvan: 'Electrical Engineer', sicilNo: '12345' },
  genelSonucNotu: '',
  yapiNotlari: {},
  haritaVar: false,
  haritaAtfi: '',
  uygulama: 'Paratoner Risk Analizi 1.10.0',
};
const GORSELSIZ = { logo: null, harita: null, imza: null };

/** Bir değerin bütün metin yaprakları (fonksiyonların kaynak metni dahil). */
function metinYapraklari(x, yol = '') {
  if (typeof x === 'string') return [[yol, x]];
  if (typeof x === 'function') return [[yol, x.toString()]];
  if (x && typeof x === 'object') return Object.entries(x).flatMap(([k, v]) => metinYapraklari(v, `${yol}.${k}`));
  return [];
}

/** Sonucun sayısal ve kod alanları (etiketler hariç): diller arasında aynı olmalı. */
function sayisalOz(sonuc) {
  return sonuc.yapilar.map((y) => ({
    kod: y.nihai.kod,
    seviye: y.risk?.seviyeKod ?? null,
    risk: y.risk ? [y.risk.Ae, y.risk.Nd, y.risk.Nc, y.risk.E] : null,
    kapsama: y.kapsama?.kapsamaOrani ?? null,
    satirlar: y.satirlar.map((s) => [s.paratonerId, s.gecerli, s.rp, s.enYakin, s.enUzak, s.marjEnYakin, s.marjEnUzak, s.durumKod]),
  }));
}

describe('İngilizce çıktılar', () => {
  const proje = kanitSenaryosu();
  const sonucTr = ck.projeyiHesapla(proje);
  const sonucEn = ck.projeyiHesapla(proje, undefined, EN);

  test('İngilizce sözlükte Türkçe metin yok', () => {
    const sizan = metinYapraklari(EN).filter(([, s]) => TURKCE_HARF.test(izinlilerSiz(s)));
    expect(sizan).toEqual([]);
  });

  test('hesap: sayılar aynı, etiket ve mesajlar İngilizce', () => {
    expect(sayisalOz(sonucEn)).toEqual(sayisalOz(sonucTr));
    const metinler = sonucEn.yapilar.flatMap((y) => [y.nihai.etiket, y.risk?.seviye ?? '', ...y.uyarilar, ...y.hatalar, ...y.satirlar.flatMap((s) => [s.durum ?? '', s.neden ?? ''])]);
    for (const m of metinler) expect(m, m).not.toMatch(TURKCE_HARF);
    expect(sonucEn.yapilar.map((y) => y.risk?.seviye)).toEqual(sonucTr.yapilar.map((y) => (y.risk ? EN.hesap.seviye[y.risk.seviyeKod] : undefined)));
  });

  test('rapor: aynı yapı, İngilizce metin', () => {
    const tr = ck.raporIcerigi(proje, sonucTr, { ...GIRDI, raporTarihi: '20.11.2026' });
    const en = ck.raporIcerigi(proje, sonucEn, GIRDI, EN);
    expect(en.bloklar.map((b) => b.tur)).toEqual(tr.bloklar.map((b) => b.tur));
    const tablo = (r) => r.bloklar.filter((b) => b.tur === 'tablo').map((b) => [b.satirlar.length, b.basliklar.length]);
    expect(tablo(en)).toEqual(tablo(tr));
    const metin = ck.raporMetinleri(en).join('\n');
    expect(izinlilerSiz(metin)).not.toMatch(TURKCE_HARF);
    expect(en.kapak.baslik).toBe(EN.rapor.baslik);
    expect(en.etiketler).toMatchObject({ hazirlayan: 'Prepared by', icindekiler: 'Contents', dil: 'en-GB' });
    expect(en.ustBilgi).toBe(`${proje.isim} · Report no. PR-2026-014 · Rev. 00`);
    // Ondalık nokta: Türkçede "0,04", İngilizcede "0.04".
    expect(metin).toContain('Ng = 0.04 · Nk^1.25');
    expect(ck.raporMetinleri(tr).join('\n')).toContain('Ng = 0,04 · Nk^1,25');
  });

  test('CSV: virgül ayraç, ondalık nokta, İngilizce başlık', () => {
    const tr = ck.hesapTablosuCsv(sonucTr).split('\r\n');
    const en = ck.hesapTablosuCsv(sonucEn, EN).split('\r\n');
    expect(en.length).toBe(tr.length);
    expect(en[0]).toBe(EN.rapor.csv.basliklar.join(','));
    expect(tr[0]).toBe(TR.rapor.csv.basliklar.join(';'));
    expect(izinlilerSiz(en.join('\n'))).not.toMatch(TURKCE_HARF);
    // Ondalık virgülü yok (ayraçla karışır); her satırda sütun sayısı başlıkla aynı.
    const sutun = (satir) => satir.match(/("([^"]|"")*"|[^,]*)(,|$)/g).filter((x) => x !== '').length;
    for (const satir of en.slice(1)) expect(sutun(satir), satir).toBe(EN.rapor.csv.basliklar.length);
  });

  test('Word: İngilizce etiketler ve belge dili', async () => {
    const icerik = ck.raporIcerigi(proje, sonucEn, GIRDI, EN);
    const docx = await Packer.toBuffer(raporBelgesi(icerik, GORSELSIZ));
    if (process.env.RAPOR_CIKTI) writeFileSync(`${process.env.RAPOR_CIKTI}/ornek-rapor-en.docx`, docx);
    const zip = await JSZip.loadAsync(docx);
    const belge = (await zip.file('word/document.xml').async('string')).replace(/<[^>]+>/g, '');
    expect(belge).toContain('Prepared by');
    expect(belge).toContain('Contents');
    expect(belge).not.toContain('Hazırlayan');
    expect(await zip.file('word/styles.xml').async('string')).toContain('w:val="en-GB"');
    const altBilgi = (await Promise.all(Object.keys(zip.files).filter((f) => /word\/footer\d+\.xml/.test(f)).map((f) => zip.file(f).async('string')))).join('');
    expect(altBilgi).toContain('Page ');
  });

  test('Word ve PDF: Türkçe rapor etiketlerinin hiçbiri İngilizce çıktıda yok (Türkçe harfsizler dahil)', async () => {
    const icerik = ck.raporIcerigi(proje, sonucEn, GIRDI, EN);
    const docx = await Packer.toBuffer(raporBelgesi(icerik, GORSELSIZ));
    const zip = await JSZip.loadAsync(docx);
    const parcalar = await Promise.all(Object.keys(zip.files).filter((f) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(f)).map((f) => zip.file(f).async('string')));
    const word = parcalar.join('\n').replace(/<[^>]+>/g, ' ');
    const pdfMetni = [];
    const topla = (x) => {
      if (typeof x === 'string') pdfMetni.push(x);
      else if (Array.isArray(x)) x.forEach(topla);
      else if (x && typeof x === 'object') Object.entries(x).forEach(([k, v]) => k !== 'image' && topla(v));
    };
    const tanim = pdfTanimi(icerik, GORSELSIZ);
    topla(tanim.content);
    pdfMetni.push(tanim.footer(2, 9).text, JSON.stringify(tanim.header(2)));
    const pdf = pdfMetni.join('\n');
    // Türkçe sözlükte İngilizcesinden farklı olan, yeterince uzun bütün sabit etiketler.
    const enMetinleri = new Map(metinYapraklari(EN));
    const turkceEtiketler = metinYapraklari({ rapor: TR.rapor, hesap: TR.hesap, sabit: TR.sabit })
      .filter(([yol, s]) => !s.includes('=>') && s.length >= 5 && enMetinleri.get(yol) !== s)
      .map(([, s]) => s);
    expect(turkceEtiketler.length).toBeGreaterThan(100);
    // Kelime sınırıyla ("Proje", "Project" içinde sayılmaz); program adı özel addır.
    const harf = 'A-Za-zçğıöşüÇĞİÖŞÜ';
    const geciyor = (metin, s) => new RegExp(`(^|[^${harf}])${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^${harf}])`).test(metin.split('Paratoner Risk Analizi').join(''));
    expect(turkceEtiketler.filter((s) => geciyor(word, s))).toEqual([]);
    expect(turkceEtiketler.filter((s) => geciyor(pdf, s))).toEqual([]);
  });

  test('PDF: İngilizce etiketler ve belge dili', async () => {
    const icerik = ck.raporIcerigi(proje, sonucEn, GIRDI, EN);
    const tanim = pdfTanimi(icerik, GORSELSIZ);
    expect(tanim.language).toBe('en-GB');
    expect(tanim.footer(2, 9).text).toBe('Page 2 / 9');
    if (process.env.RAPOR_CIKTI) {
      const require = createRequire(import.meta.url);
      const pdfmake = require('pdfmake');
      const dizin = 'node_modules/@expo-google-fonts/carlito/';
      const dosyalar = { normal: '400Regular/Carlito_400Regular.ttf', bold: '700Bold/Carlito_700Bold.ttf', italics: '400Regular_Italic/Carlito_400Regular_Italic.ttf' };
      for (const [stil, yol] of Object.entries(dosyalar)) pdfmake.virtualfs.writeFileSync(PDF_YAZI_DOSYALARI[stil], readFileSync(dizin + yol));
      pdfmake.setFonts({ [PDF_YAZI_TIPI]: { ...PDF_YAZI_DOSYALARI } });
      pdfmake.setUrlAccessPolicy(() => false);
      pdfmake.setLocalAccessPolicy(() => false);
      writeFileSync(`${process.env.RAPOR_CIKTI}/ornek-rapor-en.pdf`, Buffer.from(await pdfmake.createPdf(tanim).getBuffer()));
    }
  });

  test('proje dosyası hataları İngilizce, Türkçe varsayılan değişmedi', () => {
    expect(() => ck.projeDosyasiOku('{', EN)).toThrow('The file could not be read: it is not valid JSON.');
    expect(() => ck.projeDosyasiOku('{', TR)).toThrow('Dosya okunamadı: geçerli bir JSON değil.');
    expect(() => ck.projeDosyasiOku('{}')).toThrow(TR.dosya.listeYok);
    const bozuk = { ...proje, yapilar: [{ ...proje.yapilar[0], H_m: 'yüksek' }] };
    expect(() => ck.projeVerisiOku(bozuk, EN)).toThrow(`Structure "${proje.yapilar[0].isim}" height (H) must be a valid number.`);
  });

  test('örnek C profilleri ve yapı tipleri dile göre', () => {
    expect(ornekProfiller(EN).map((p) => p.ad)).toEqual(ck.yapiTipleri(EN).filter((t) => t.deger !== 'diger').map((t) => t.etiket));
    expect(tiptenProfilAdi('kumes', EN)).toBe('Poultry house');
    expect(tiptenProfilAdi('kumes')).toBe('Kümes');
    for (const p of ornekProfiller(EN)) expect(p.ad).not.toMatch(TURKCE_HARF);
  });

  test('DXF ve KML okuma hataları kodlu: arayüz dile göre gösterir', () => {
    expect(() => ck.dxfCoz(new TextEncoder().encode('AutoCAD Binary DXF\r\n\x1a\x00'))).toThrow(ck.DxfOkumaHatasi);
    try {
      ck.dxfCoz(new TextEncoder().encode('AutoCAD Binary DXF\r\n\x1a\x00'));
    } catch (e) {
      expect(e.kod).toBe('IKILI');
    }
    expect(EN.altlik.hataIkili).toMatch(/Binary DXF/);
  });
});
