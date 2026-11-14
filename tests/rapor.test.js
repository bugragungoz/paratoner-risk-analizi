// Faz 4 bitti ölçütü: kanıt senaryosunun raporu kendi içinde tutarlı.
// Rapor içeriği çekirdekte tek listede üretilir; Word ve PDF bu listeyi biçimlendirir.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, test, expect } from 'vitest';
import { crc32, deflateSync } from 'node:zlib';
import JSZip from 'jszip';
import { Packer } from 'docx';
import * as ck from '../src/core';
import { raporBelgesi } from '../src/arayuz/rapor/docx';
import { PDF_YAZI_DOSYALARI, PDF_YAZI_TIPI, pdfTanimi } from '../src/arayuz/rapor/pdfTanimi';
import { olcekMetni, yuvarlakOlcek } from '../src/arayuz/harita/sekil';
import { kanitSenaryosu } from './veri/projeler';

const GIRDI = {
  firmaAdi: 'Örnek Mühendislik',
  tesisAdresi: 'Örnek saha, Ankara',
  raporTarihi: '29.10.2026',
  raporNo: 'PR-2026-014',
  revizyonlar: [
    { no: '00', tarih: '20.10.2026', aciklama: 'İlk yayın' },
    { no: '01', tarih: '29.10.2026', aciklama: 'P3 eklendi' },
  ],
  muhendis: { ad: 'Ad Soyad', unvan: 'Elektrik Mühendisi', sicilNo: '12345' },
  genelSonucNotu: '',
  yapiNotlari: {},
  haritaVar: false,
  haritaAtfi: '',
  uygulama: 'Paratoner Risk Analizi 1.9.0',
};
const GORSELSIZ = { logo: null, harita: null, imza: null };

/** Düz renkli, geçerli bir PNG (rapor görseli biçiminde). */
function ornekPng(genislik, yukseklik, [r, g, b]) {
  const parca = (tur, veri) => {
    const govde = Buffer.concat([Buffer.from(tur, 'latin1'), veri]);
    const uzunluk = Buffer.alloc(4);
    uzunluk.writeUInt32BE(veri.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(govde));
    return Buffer.concat([uzunluk, govde, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(genislik, 0);
  ihdr.writeUInt32BE(yukseklik, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const satir = Buffer.concat([Buffer.from([0]), Buffer.alloc(genislik * 3, Buffer.from([r, g, b]))]);
  const ham = Buffer.concat(Array.from({ length: yukseklik }, () => satir));
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), parca('IHDR', ihdr), parca('IDAT', deflateSync(ham)), parca('IEND', Buffer.alloc(0))]);
  return { veri: new Uint8Array(png), tur: 'png', genislik, yukseklik };
}

function rapor(proje) {
  const sonuc = ck.projeyiHesapla(proje);
  return { proje, sonuc, icerik: ck.raporIcerigi(proje, sonuc, GIRDI) };
}

const tablolar = (icerik) => icerik.bloklar.filter((b) => b.tur === 'tablo');
const basliklar = (icerik) => icerik.bloklar.filter((b) => b.tur === 'baslik');
/** Bir bölüm başlığından sonraki ilk tablo. */
function bolumTablosu(icerik, baslik) {
  const i = icerik.bloklar.findIndex((b) => b.tur === 'baslik' && b.metin === baslik);
  return icerik.bloklar.slice(i + 1).find((b) => b.tur === 'tablo');
}
/** Yapı alt başlığından sonraki bloklar (bir sonraki başlığa kadar). */
function yapiBloklari(icerik, isim) {
  const i = icerik.bloklar.findIndex((b) => b.tur === 'baslik' && b.seviye === 2 && b.metin === isim && b.numara.startsWith('6.'));
  const son = icerik.bloklar.findIndex((b, j) => j > i && b.tur === 'baslik');
  return icerik.bloklar.slice(i + 1, son);
}

const SENARYOLAR = {
  'kanıt senaryosu (ΔT 60)': () => kanitSenaryosu({ deltaT: 60 }),
  'ΔT 30 (kısmi koruma)': () => kanitSenaryosu({ deltaT: 30 }),
  'P2 devre dışı': () => {
    const p = kanitSenaryosu();
    p.paratonerler.find((x) => x.isim === 'P2').aktif_mi = false;
    return p;
  },
};

describe.each(Object.entries(SENARYOLAR))('Rapor tutarlılığı: %s', (_ad, uret) => {
  const { proje, sonuc, icerik } = rapor(uret());
  const metinler = ck.raporMetinleri(icerik);

  test('boş, tanımsız ya da sayı olmayan değer yok', () => {
    for (const m of metinler) expect(m).not.toMatch(/NaN|undefined|null|\[object|Infinity/);
    for (const t of tablolar(icerik)) {
      for (const satir of t.satirlar) {
        expect(satir.length).toBe(t.genislikler.length);
        satir.forEach((h) => expect(h.trim()).not.toBe(''));
      }
      if (t.basliklar.length) expect(t.basliklar.length).toBe(t.genislikler.length);
    }
  });

  test('her yapının risk satırı, alt başlığı ve paragrafı var; seviye ve E iki yerde aynı', () => {
    const risk = bolumTablosu(icerik, 'Risk Hesap Sonuçları');
    expect(risk.satirlar.map((s) => s[0])).toEqual(proje.yapilar.map((y) => y.isim));
    for (const y of sonuc.yapilar) {
      const bloklar = yapiBloklari(icerik, y.yapiIsim);
      expect(bloklar.length).toBeGreaterThan(0);
      const ozet = bloklar.find((b) => b.tur === 'tablo');
      const satir = risk.satirlar.find((s) => s[0] === y.yapiIsim);
      expect(ozet.satirlar[0][1]).toBe(y.risk?.seviye ?? '-');
      expect(satir.at(-1)).toBe(y.risk?.seviye ?? y.nihai.etiket);
      expect(ozet.satirlar[1][1]).toBe(y.nihai.etiket);
      if (y.risk) expect(ozet.satirlar[2][1]).toContain(`E = ${satir[10]}`);
      expect(bloklar.some((b) => b.tur === 'paragraf' && b.parcalar[0].metin === ck.yapiAciklamaParagrafi(y))).toBe(true);
    }
  });

  test('paratoner satırlarının Rp değeri, raporda basılan ESE tablosuyla aynı', () => {
    let denenen = 0;
    for (const y of sonuc.yapilar) {
      for (const s of y.satirlar.filter((x) => x.gecerli && !x.enterpoleEdildi)) {
        const satir = ck.ESE_TABLOLARI[s.deltaT].find((t) => t.h === s.gercekH);
        expect(satir[s.sutun]).toBe(s.rp);
        const basilan = icerik.bloklar.some(
          (b) => b.tur === 'tablo' && b.basliklar[0] === 'h (m)' && b.satirlar.some((r) => r[0] === String(satir.h) && r.includes(String(s.rp))),
        );
        expect(basilan).toBe(true);
        denenen++;
      }
    }
    expect(denenen).toBeGreaterThan(0);
  });

  test('genel sonuç sayıları, eksik listesi ve yapı durumları birbirini tutar', () => {
    const o = ck.raporOzeti(sonuc);
    const yeterliSay = sonuc.yapilar.filter((y) => y.nihai.kod === 'YETERLI' || y.nihai.kod === 'YETERLI_KOMBINE').length;
    expect(o.yeterli).toBe(yeterliSay);
    const tum = metinler.join('\n');
    expect(tum).toContain(`toplam ${proje.yapilar.length} adet yapı`);
    expect(tum).toContain(`yapıların ${yeterliSay} tanesinde`);
    const maddeler = icerik.bloklar.filter((b) => b.tur === 'maddeler').flatMap((b) => b.maddeler.map((m) => m.map((x) => x.metin).join('')));
    ck.eksikYapilar(sonuc).forEach((y) => expect(maddeler).toContain(`${y.yapiIsim}: ${y.nihai.etiket}`));
  });

  test('girdi tabloları projedeki bütün kot, yapı ve paratonerleri içerir; devre dışı işaretli', () => {
    expect(bolumTablosu(icerik, 'Kot Seviyeleri').satirlar.length).toBe(proje.kot_seviyeleri.length);
    expect(bolumTablosu(icerik, 'Yapılar').satirlar.length).toBe(proje.yapilar.length);
    const pt = bolumTablosu(icerik, 'Paratonerler');
    expect(pt.satirlar.length).toBe(proje.paratonerler.length);
    proje.paratonerler.forEach((pr, i) => expect(pt.satirlar[i].at(-1)).toBe(pr.aktif_mi === false ? 'Hayır (devre dışı)' : 'Evet'));
  });

  test('kapsam notu, revizyon, başlık numaraları', () => {
    expect(metinler).toContain(ck.KAPSAM_NOTU);
    expect(icerik.kapak.revizyon).toBe('01');
    expect(icerik.ustBilgi).toBe(`${proje.isim} · Rapor no PR-2026-014 · Rev. 01`);
    const numaralar = basliklar(icerik).map((b) => b.numara);
    expect(new Set(numaralar).size).toBe(numaralar.length);
  });
});

describe('Rapor dosyaları', () => {
  const { icerik } = rapor(kanitSenaryosu());

  test('Word: başlıklar, içindekiler alanı, sayfa numarası, imza bloğu', async () => {
    const docx = await Packer.toBuffer(raporBelgesi(icerik, GORSELSIZ));
    // İncelemek için: RAPOR_CIKTI=klasör npx vitest run tests/rapor.test.js
    if (process.env.RAPOR_CIKTI) writeFileSync(`${process.env.RAPOR_CIKTI}/ornek-rapor.docx`, docx);
    const zip = await JSZip.loadAsync(docx);
    const belge = await zip.file('word/document.xml').async('string');
    const duzMetin = belge.replace(/<[^>]+>/g, '');
    for (const b of basliklar(icerik)) expect(duzMetin).toContain(`${b.numara}. ${b.metin}`);
    expect(belge).toContain('TOC \\h \\o &quot;1-2&quot;');
    expect(duzMetin).toContain('Hazırlayan');
    const altBilgiler = await Promise.all(Object.keys(zip.files).filter((f) => /word\/footer\d+\.xml/.test(f)).map((f) => zip.file(f).async('string')));
    expect(altBilgiler.join('')).toMatch(/NUMPAGES/);
    expect(await zip.file('word/settings.xml').async('string')).toContain('updateFields');
  });

  test('Word: logo ve imza yalnızca kapakta, hazırlayan bloğu kapakta', async () => {
    const gorseller = { logo: ornekPng(400, 160, [31, 56, 98]), harita: null, imza: ornekPng(300, 90, [20, 20, 20]) };
    const docx = await Packer.toBuffer(raporBelgesi(icerik, gorseller));
    if (process.env.RAPOR_CIKTI) writeFileSync(`${process.env.RAPOR_CIKTI}/ornek-rapor-gorselli.docx`, docx);
    const belge = await (await JSZip.loadAsync(docx)).file('word/document.xml').async('string');
    const kapakSonu = belge.indexOf('<w:br w:type="page"/>');
    expect(kapakSonu).toBeGreaterThan(0);
    const kapak = belge.slice(0, kapakSonu);
    const govde = belge.slice(kapakSonu);
    // Kapakta iki görsel (logo, imza); gövdede hiç görsel yok (harita verilmedi).
    expect((kapak.match(/<w:drawing>/g) ?? []).length).toBe(2);
    expect(govde).not.toContain('<w:drawing>');
    const kapakMetni = kapak.replace(/<[^>]+>/g, ' ');
    for (const m of ['Hazırlayan', 'Ad Soyad', 'Elektrik Mühendisi', '12345', 'İmza']) expect(kapakMetni).toContain(m);
    // Sonda ayrı bir imza bloğu yok: "İmza" satırı belgede yalnızca bir kez geçer.
    expect(belge.split('>İmza<').length - 1).toBe(1);
    expect(icerik.bloklar.some((b) => b.tur === 'imza')).toBe(false);
    // Logo en fazla 200 × 110 px, imza en fazla 180 × 70 px kutuya sığar (EMU = px × 9525).
    const boyutlar = [...kapak.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"/g)].map((m) => [Number(m[1]) / 9525, Number(m[2]) / 9525]);
    expect(boyutlar).toHaveLength(2);
    expect(boyutlar[0][0]).toBeLessThanOrEqual(200);
    expect(boyutlar[0][1]).toBeLessThanOrEqual(110);
    expect(boyutlar[1][0]).toBeLessThanOrEqual(180);
    expect(boyutlar[1][1]).toBeLessThanOrEqual(70);
  });

  test('Word: çok uzun (dikey) logo kapağı taşırmaz', async () => {
    const docx = await Packer.toBuffer(raporBelgesi(icerik, { logo: ornekPng(200, 900, [31, 56, 98]), harita: null, imza: null }));
    const belge = await (await JSZip.loadAsync(docx)).file('word/document.xml').async('string');
    const [, cx, cy] = belge.match(/<wp:extent cx="(\d+)" cy="(\d+)"/);
    expect(Number(cy) / 9525).toBeLessThanOrEqual(110);
    expect(Number(cx) / Number(cy)).toBeCloseTo(200 / 900, 1);
  });

  test('PDF: Carlito gömülü, birden çok sayfa', async () => {
    const require = createRequire(import.meta.url);
    const pdfmake = require('pdfmake');
    const dizin = 'node_modules/@expo-google-fonts/carlito/';
    const dosyalar = {
      normal: '400Regular/Carlito_400Regular.ttf',
      bold: '700Bold/Carlito_700Bold.ttf',
      italics: '400Regular_Italic/Carlito_400Regular_Italic.ttf',
    };
    for (const [stil, yol] of Object.entries(dosyalar)) pdfmake.virtualfs.writeFileSync(PDF_YAZI_DOSYALARI[stil], readFileSync(dizin + yol));
    pdfmake.setFonts({ [PDF_YAZI_TIPI]: { ...PDF_YAZI_DOSYALARI } });
    pdfmake.setUrlAccessPolicy(() => false);
    pdfmake.setLocalAccessPolicy(() => false);
    const pdf = Buffer.from(await pdfmake.createPdf(pdfTanimi(icerik, GORSELSIZ)).getBuffer());
    if (process.env.RAPOR_CIKTI) {
      writeFileSync(`${process.env.RAPOR_CIKTI}/ornek-rapor.pdf`, pdf);
      const gorseller = { logo: ornekPng(400, 160, [31, 56, 98]), harita: null, imza: ornekPng(300, 90, [20, 20, 20]) };
      writeFileSync(`${process.env.RAPOR_CIKTI}/ornek-rapor-gorselli.pdf`, Buffer.from(await pdfmake.createPdf(pdfTanimi(icerik, gorseller)).getBuffer()));
    }
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const metin = pdf.toString('latin1');
    expect(metin).toContain('Carlito');
    expect((metin.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThanOrEqual(6);
  }, 30_000);
});

describe('Rapor girdileri', () => {
  test('cihaz, rapor no ve revizyonlar proje dosyasıyla kaydedilip açılır', () => {
    const p = ck.yeniProje('Deneme');
    p.cihaz = 'Örnek ESE 60';
    p.rapor_no = 'R-1';
    p.revizyonlar = [{ no: '00', tarih: '01.10.2026', aciklama: 'İlk yayın' }];
    p.kot_seviyeleri.push({ id: 'k', isim: 'Zemin', taban_kottan_yukseklik_m: 0 });
    p.paratonerler.push({ ...ck.yeniParatoner({ isim: 'P1', lat: 39, lng: 32, kot_seviyesi_id: 'k', mast_yuksekligi_m: 10 }), cihaz: 'Özel model' });
    const { proje } = ck.projeDosyasiOku(ck.projeDosyasiYaz(p, 'test'));
    expect(proje).toMatchObject({ cihaz: 'Örnek ESE 60', rapor_no: 'R-1', revizyonlar: p.revizyonlar });
    expect(ck.paratonerCihazi(proje.paratonerler[0], proje)).toBe('Özel model');
    expect(ck.paratonerCihazi({ cihaz: '' }, proje)).toBe('Örnek ESE 60');
  });

  test('revizyon girilmezse "00, İlk yayın"; boş satırlar yazılmaz', () => {
    expect(ck.raporRevizyonlari({ revizyonlar: [], raporTarihi: '29.10.2026' })).toEqual([{ no: '00', tarih: '29.10.2026', aciklama: 'İlk yayın' }]);
    expect(ck.raporRevizyonlari({ revizyonlar: [{ no: ' ', tarih: '', aciklama: '' }, { no: '01', tarih: 'x', aciklama: 'y' }], raporTarihi: '' })).toEqual([{ no: '01', tarih: 'x', aciklama: 'y' }]);
  });

  test('harita şekli ölçek çubuğu 1-2-5 dizisinden ve sığacak uzunlukta', () => {
    expect(yuvarlakOlcek(0.5, 140)).toEqual({ metre: 50, px: 100 });
    expect(yuvarlakOlcek(2.3, 140)).toEqual({ metre: 200, px: 200 / 2.3 });
    expect(yuvarlakOlcek(0.07, 140).metre).toBe(5);
    expect(olcekMetni(2000)).toBe('2 km');
    expect(olcekMetni(500)).toBe('500 m');
  });
});
