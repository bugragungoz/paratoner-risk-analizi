// Raporun bütün içeriği (metin, tablo, şekil yeri) tek bir listede üretilir. Word ve PDF
// çizicileri yalnızca bu listeyi biçimlendirir; böylece iki dosya aynı sayıları ve cümleleri taşır
// ve içerik arayüzden bağımsız olarak test edilebilir. Dil `m` sözlüğünden gelir (varsayılan Türkçe);
// sonuç (`sonuc`) da aynı dille hesaplanmış olmalıdır (durum etiketleri ve mesajlar sonuçtadır).

import type { Metinler } from '../dil';
import { tr as TR } from '../dil/tr';
import { etkinDeltaT, paratonerBazliDeltaTMi } from './dogrulama';
import { C2_MATRISI, cSecenekleri, ESE_TABLOLARI, MALZEMELER, yapiTipleri, type Secenek } from './sabitler';
import { paratonerTepeKotu } from './kot';
import { eksikYapilar, genelSonucCumleleri, seviyeDagilimi, yapiAciklamaParagrafi } from './rapor';
import { ngHesapla } from './risk';
import type { ProjeSonucu, YapiSonucu } from './hesap';
import type { Paratoner, Proje, Revizyon } from './tipler';

export interface RaporGirdisi {
  firmaAdi: string;
  tesisAdresi: string;
  raporTarihi: string;
  raporNo: string;
  revizyonlar: Revizyon[];
  muhendis: { ad: string; unvan: string; sicilNo: string };
  genelSonucNotu: string;
  yapiNotlari: Record<string, string>;
  /** Rapora harita şekli eklenecek mi. */
  haritaVar: boolean;
  /** Harita görüntüsünün sağlayıcı atfı (ör. "© Google", "Tiles © Esri"). */
  haritaAtfi: string;
  /** "Paratoner Risk Analizi 1.9.0" */
  uygulama: string;
}

export interface Parca {
  metin: string;
  kalin?: boolean;
}

export type RaporBlogu =
  | { tur: 'baslik'; seviye: 1 | 2; numara: string; metin: string }
  | { tur: 'paragraf'; parcalar: Parca[]; kucuk?: boolean; italik?: boolean; ortali?: boolean }
  | { tur: 'maddeler'; maddeler: Parca[][] }
  | {
      tur: 'tablo';
      /** Boşsa başlık satırı yoktur. */
      basliklar: string[];
      satirlar: string[][];
      /** Göreli sütun genişlikleri. */
      genislikler: number[];
      altBilgi?: string;
      kucuk?: boolean;
      /** İlk sütun başlık gibi (anahtar–değer tablosu). */
      anahtarDeger?: boolean;
    }
  | { tur: 'gorsel'; kaynak: 'harita'; aciklama: string }
  | { tur: 'icindekiler' }
  | { tur: 'sayfaSonu' };

export interface RaporKapagi {
  firma: string;
  baslik: string;
  proje: string;
  adres: string;
  raporNo: string;
  revizyon: string;
  tarih: string;
}

/** Word ve PDF çizicilerinin kullandığı etiketler (raporun dilinde). */
export interface RaporEtiketleri {
  hazirlayan: string;
  adSoyad: string;
  unvan: string;
  sicilNo: string;
  tarih: string;
  imza: string;
  icindekiler: string;
  belgeAciklamasi: string;
  sayfa: string;
  /** Kapaktaki belge bilgileri. */
  raporNo: string;
  revizyon: string;
  raporTarihi: string;
  /** Belgenin dili (BCP 47; Word yazım denetimi ve PDF için). */
  dil: string;
}

export interface RaporIcerigi {
  kapak: RaporKapagi;
  etiketler: RaporEtiketleri;
  /** Her sayfanın üstündeki satır. */
  ustBilgi: string;
  muhendis: RaporGirdisi['muhendis'] & { tarih: string };
  bloklar: RaporBlogu[];
  belgeBasligi: string;
}

/** Türkçe başlık ve kapsam metinleri (dile göre: `m.rapor`). */
export const RAPOR_BASLIGI = TR.rapor.baslik;
export const KAPSAM_NOTU = TR.rapor.kapsamNotu;
export const KAPSAM_ACIKLAMASI = TR.rapor.kapsamAciklamasi;
export const KAPSAM_SINIRI = TR.rapor.kapsamSiniri;

const p = (metin: string, opt: { kalin?: boolean; kucuk?: boolean; italik?: boolean } = {}): RaporBlogu => ({
  tur: 'paragraf',
  parcalar: [{ metin, ...(opt.kalin ? { kalin: true } : {}) }],
  ...(opt.kucuk ? { kucuk: true } : {}),
  ...(opt.italik ? { italik: true } : {}),
});

const dolu = (s: string | undefined | null) => (s ?? '').trim();

/** Paratoner için raporda gösterilecek cihaz (paratonerin kendi bilgisi, yoksa projenin). */
export function paratonerCihazi(pr: Pick<Paratoner, 'cihaz'>, proje: Pick<Proje, 'cihaz'>): string {
  return dolu(pr.cihaz) || dolu(proje.cihaz);
}

/** Revizyon listesi boşsa raporun ilk yayını tek satır olarak yazılır. */
export function raporRevizyonlari(g: Pick<RaporGirdisi, 'revizyonlar' | 'raporTarihi'>, m: Metinler = TR): Revizyon[] {
  const dolular = g.revizyonlar.filter((r) => dolu(r.no) || dolu(r.aciklama) || dolu(r.tarih));
  return dolular.length ? dolular : [{ no: '00', tarih: g.raporTarihi, aciklama: m.rapor.ilkYayin }];
}

/** Başlık numaralandırıcı: 1, 1.1, 1.2, 2 … */
function numaralayici() {
  let ana = 0;
  let alt = 0;
  return {
    bolum(metin: string): RaporBlogu {
      ana += 1;
      alt = 0;
      return { tur: 'baslik', seviye: 1, numara: `${ana}`, metin };
    },
    alt(metin: string): RaporBlogu {
      alt += 1;
      return { tur: 'baslik', seviye: 2, numara: `${ana}.${alt}`, metin };
    },
  };
}

function yapiDetayi(y: YapiSonucu, g: RaporGirdisi, m: Metinler): RaporBlogu[] {
  const b: RaporBlogu[] = [];
  const t = m.rapor;
  const { sayi } = m.bicim;
  const ozet: string[][] = [
    [t.gerekliSeviye, y.risk?.seviye ?? '-'],
    [t.nihaiDurum, y.nihai.etiket],
  ];
  if (y.risk) {
    ozet.push([t.riskDegerleri, `Ae = ${sayi(y.risk.Ae)} m² · Nd = ${sayi(y.risk.Nd, 5)} · Nc = ${sayi(y.risk.Nc, 5)} · E = ${sayi(y.risk.E, 3)}`]);
  }
  b.push({ tur: 'tablo', basliklar: [], satirlar: ozet, genislikler: [30, 70], anahtarDeger: true });

  const gecerli = y.satirlar.filter((s) => s.gecerli);
  if (gecerli.length) {
    b.push({
      tur: 'tablo',
      basliklar: [t.paratoner, 'ΔT (µs)', 'h (m)', 'Rp (m)', t.mesafeYakin, t.mesafeUzak, t.marjYakin, t.marjUzak, t.durum],
      satirlar: gecerli.map((s) => [
        s.paratonerId === y.birincilParatonerId ? `${s.paratonerIsim} (*)` : s.paratonerIsim,
        String(s.deltaT),
        `${sayi(s.gercekH)}${s.enterpoleEdildi ? ' (a)' : ''}`,
        sayi(s.rp),
        sayi(s.enYakin),
        sayi(s.enUzak),
        sayi(s.marjEnYakin),
        sayi(s.marjEnUzak),
        s.durum ?? '-',
      ]),
      genislikler: [13, 8, 9, 8, 11, 11, 11, 11, 14],
      kucuk: true,
      altBilgi: t.nihaiDurumAlt(y.nihai.etiket),
    });
    const notlar = [t.notBirincil];
    if (gecerli.some((s) => s.enterpoleEdildi)) notlar.push(t.notEnterpolasyon);
    b.push(p(notlar.join(' '), { kucuk: true }));
  }
  const disarida = y.satirlar.filter((s) => !s.gecerli);
  if (disarida.length && y.nihai.kod !== 'HESAPLANAMADI') {
    b.push({
      tur: 'tablo',
      basliklar: [t.koruyucuSayilmayan, 'h (m)', t.neden],
      satirlar: disarida.map((s) => [s.paratonerIsim, sayi(s.gercekH), s.neden ?? '-']),
      genislikler: [25, 10, 65],
      kucuk: true,
    });
  }

  b.push(p(yapiAciklamaParagrafi(y, m)));
  y.uyarilar.filter((u) => u !== m.hesap.uyariEkOnlem).forEach((u) => b.push(p(u)));
  const not = dolu(g.yapiNotlari[y.yapiId]);
  if (not) b.push({ tur: 'paragraf', parcalar: [{ metin: t.sahaNotu, kalin: true }, { metin: not }] });
  return b;
}

export function raporIcerigi(proje: Proje, sonuc: ProjeSonucu, g: RaporGirdisi, m: Metinler = TR): RaporIcerigi {
  const n = numaralayici();
  const b: RaporBlogu[] = [];
  const t = m.rapor;
  const { sayi, kot: kotMetni, evet, hayir } = m.bicim;
  const cDegeri = (d: number | null | undefined) => (d == null ? '-' : sayi(d, d % 1 === 0 ? 0 : 2));
  const koordinat = (d: number) => sayi(d, 6);
  const cTablosu = (ad: string, secenekler: readonly Secenek[]): RaporBlogu => ({
    tur: 'tablo',
    basliklar: [ad, t.aciklama],
    satirlar: secenekler.map((s) => [cDegeri(s.deger), s.etiket]),
    genislikler: [12, 88],
  });
  const secenek = cSecenekleri(m);
  const revizyonlar = raporRevizyonlari(g, m);
  const sonRevizyon = revizyonlar[revizyonlar.length - 1]?.no ?? '00';
  const firma = dolu(g.firmaAdi) || 'bugra';
  const adres = dolu(g.tesisAdresi) || 'bugra';
  const muh = g.muhendis;
  const etkinler = proje.paratonerler.filter((pr) => pr.aktif_mi !== false);
  const devreDisi = proje.paratonerler.length - etkinler.length;
  const kotAdi = (id: string | null) => proje.kot_seviyeleri.find((k) => k.id === id)?.isim ?? '-';
  const yapiAdi = (id: string | null) => proje.yapilar.find((y) => y.id === id)?.isim ?? '-';

  // Belge bilgileri, revizyonlar, içindekiler
  b.push(
    { tur: 'paragraf', parcalar: [{ metin: t.belgeBilgileri, kalin: true }] },
    {
      tur: 'tablo',
      basliklar: [],
      satirlar: [
        [t.raporNo, dolu(g.raporNo) || '-'],
        [t.proje, proje.isim],
        [t.tesisAdresi, dolu(g.tesisAdresi) || '-'],
        [t.raporTarihi, g.raporTarihi],
        [t.hazirlayan, [dolu(muh.ad), dolu(muh.unvan)].filter(Boolean).join(', ') || '-'],
        [t.sicilNo, dolu(muh.sicilNo) || '-'],
        [t.hesapAraci, g.uygulama],
      ],
      genislikler: [30, 70],
      anahtarDeger: true,
    },
    { tur: 'paragraf', parcalar: [{ metin: t.revizyonlar, kalin: true }] },
    { tur: 'tablo', basliklar: [t.rev, t.tarih, t.aciklama], satirlar: revizyonlar.map((r) => [dolu(r.no) || '-', dolu(r.tarih) || '-', dolu(r.aciklama) || '-']), genislikler: [12, 20, 68] },
    { tur: 'icindekiler' },
    { tur: 'sayfaSonu' },
  );

  // 1. Giriş
  b.push(
    n.bolum(t.bolumGiris),
    p(t.giris1(proje.isim, etkinler.length)),
    p(t.giris2),
  );
  if (g.haritaVar) b.push({ tur: 'gorsel', kaynak: 'harita', aciklama: t.sekil1 });

  // 2. Kapsam ve dayanak
  b.push(n.bolum(t.bolumKapsam), p(t.kapsamNotu, { kalin: true }), p(t.kapsamAciklamasi), p(t.kapsamSiniri));
  b.push(p(t.kapsamSayilar(proje.yapilar.length, etkinler.length, devreDisi)));
  const dagilim = seviyeDagilimi(sonuc, m);
  if (dagilim.length) {
    b.push(p(t.seviyeyeGore), {
      tur: 'maddeler',
      maddeler: dagilim.map((d) => [{ metin: `${d.seviye}: `, kalin: true }, { metin: t.seviyeGrubu(d.yapilar.length, d.yapilar.join(', ')) }]),
    });
  }

  // 3. Girdiler
  const paratonerBazli = paratonerBazliDeltaTMi(proje);
  b.push(n.bolum(t.bolumGirdiler), n.alt(t.altProjeParametreleri), {
    tur: 'tablo',
    basliklar: [t.parametre, t.deger],
    satirlar: [
      [t.nk, sayi(proje.Nk, proje.Nk !== null && proje.Nk % 1 === 0 ? 0 : 1)],
      [t.ng, proje.Nk !== null ? t.ngBirim(sayi(ngHesapla(proje.Nk), 3)) : '-'],
      [t.deltaTSecimi, paratonerBazli ? t.deltaTParatoner : t.deltaTProje],
      [paratonerBazli ? t.varsayilanDeltaT : 'ΔT', proje.deltaT !== null ? `${proje.deltaT} µs` : '-'],
      [t.cihaz, dolu(proje.cihaz) || (etkinler.some((pr) => dolu(pr.cihaz)) ? t.cihazTabloda : '-')],
      [t.koordinatSistemi, t.koordinatDegeri],
      [t.kotReferansi, t.kotReferansiDegeri],
    ],
    genislikler: [35, 65],
    anahtarDeger: true,
  });

  b.push(n.alt(t.altKotSeviyeleri), {
    tur: 'tablo',
    basliklar: [t.kotSeviyesi, t.yukseklik, t.aciklama],
    satirlar: [...proje.kot_seviyeleri].sort((a, b) => a.taban_kottan_yukseklik_m - b.taban_kottan_yukseklik_m).map((k) => [k.isim, kotMetni(k.taban_kottan_yukseklik_m, 2), dolu(k.aciklama) || '-']),
    genislikler: [30, 20, 50],
  });

  const tipler = yapiTipleri(m);
  b.push(n.alt(t.altYapilar), {
    tur: 'tablo',
    basliklar: [t.yapi, t.tip, t.kot, 'H (m)', t.boyut, t.tabanAlani, t.cevre, t.malzeme, t.kritik],
    satirlar: proje.yapilar.map((y) => {
      const s = sonuc.yapilar.find((x) => x.yapiId === y.id);
      // Eski projelerde tip yerleşik bir anahtardır; yeni kayıtlarda kullanıcının profil adıdır.
      const tip = tipler.find((x) => x.deger === y.tip)?.etiket ?? (dolu(y.tip) || t.digerTip);
      const c2 = y.C2_secim ? `${m.sabit.yapiMalzemesi[y.C2_secim.yapi]} / ${m.sabit.catiMalzemesi[y.C2_secim.cati]}` : '-';
      const boyut = y.manuelBoyut && y.L_m && y.W_m ? `L × W = ${sayi(y.L_m)} × ${sayi(y.W_m)}` : t.poligon;
      return [y.isim, tip, kotAdi(y.kot_seviyesi_id), sayi(y.H_m), boyut, sayi(s?.alan), sayi(s?.cevre), c2, y.kritik_mi ? evet : hayir];
    }),
    genislikler: [13, 11, 10, 7, 13, 11, 9, 19, 7],
    kucuk: true,
  });

  b.push(n.alt(t.altParatonerler), {
    tur: 'tablo',
    basliklar: [t.paratoner, t.enlem, t.boylam, t.taban, t.mast, t.ucKotu, 'ΔT (µs)', t.cihazSutun, t.hesapta],
    satirlar: proje.paratonerler.map((pr) => {
      const taban = pr.yapi_id ? t.cati(yapiAdi(pr.yapi_id)) : kotAdi(pr.kot_seviyesi_id);
      const dT = etkinDeltaT(pr, proje);
      const etkin = pr.aktif_mi !== false;
      return [pr.isim, koordinat(pr.lat), koordinat(pr.lng), taban, sayi(pr.mast_yuksekligi_m, 2), kotMetni(paratonerTepeKotu(pr, proje), 2), dT === null ? '-' : String(dT), paratonerCihazi(pr, proje) || '-', etkin ? evet : t.devreDisiHayir];
    }),
    genislikler: [10, 11, 11, 13, 7, 8, 7, 18, 15],
    kucuk: true,
  });

  // 4. Yöntem
  b.push(n.bolum(t.bolumYontem), n.alt(t.altKatsayilar));
  b.push(cTablosu('C1', secenek.C1), {
    tur: 'tablo',
    basliklar: [t.c2Baslik, ...MALZEMELER.map((x) => m.sabit.catiMalzemesi[x])],
    satirlar: MALZEMELER.map((y) => [m.sabit.yapiMalzemesi[y], ...MALZEMELER.map((cati) => sayi(C2_MATRISI[y][cati], 1))]),
    genislikler: [31, 23, 23, 23],
  });
  b.push(cTablosu('C3', secenek.C3), cTablosu('C4', secenek.C4), cTablosu('C5', secenek.C5));
  b.push(n.alt(t.altBagintilar), {
    tur: 'tablo',
    basliklar: [t.buyukluk, t.baginti],
    satirlar: t.bagintilar.map((x) => [...x]),
    genislikler: [35, 65],
    anahtarDeger: true,
  });
  const seviyeler = ['EK', 'I', 'II', 'III', 'IV', 'ISTEGE_BAGLI'] as const;
  b.push(n.alt(t.altGerekliSeviye), {
    tur: 'tablo',
    basliklar: [t.eAraligi, t.gerekliSeviyeSutun],
    satirlar: seviyeler.map((s, i) => [t.eAraliklari[i] ?? '', m.hesap.seviye[s]]),
    genislikler: [45, 55],
  });

  b.push(n.alt(t.altRp));
  b.push(p(t.rpAciklama));
  const kullanilanDeltaT = [...new Set(sonuc.yapilar.flatMap((y) => y.satirlar.filter((s) => s.gecerli).map((s) => s.deltaT as number)))].sort((a, c) => a - c);
  const tablodakiDeltaT = kullanilanDeltaT.length ? kullanilanDeltaT : proje.deltaT ? [proje.deltaT] : [];
  for (const dT of tablodakiDeltaT) {
    const tablo = ESE_TABLOLARI[dT];
    if (!tablo) continue;
    b.push(p(t.eseTablosu(dT), { kalin: true }), {
      tur: 'tablo',
      basliklar: ['h (m)', t.seviyeSutunu('I'), t.seviyeSutunu('II'), t.seviyeSutunu('III'), t.seviyeSutunu('IV')],
      satirlar: tablo.map((s) => [String(s.h), String(s.I), String(s.II), String(s.III), String(s.IV)]),
      genislikler: [20, 20, 20, 20, 20],
      kucuk: true,
    });
  }

  const ekOnlemVar = sonuc.yapilar.some((y) => y.risk?.ekOnlemGerekli);
  b.push(n.alt(t.altVarsayimlar), {
    tur: 'maddeler',
    maddeler: [...t.varsayimlar, ...(ekOnlemVar ? [t.varsayimEkOnlem] : [])].map((metin) => [{ metin }]),
  });

  // 5. Risk sonuçları
  b.push(n.bolum(t.bolumRiskSonuclari), {
    tur: 'tablo',
    basliklar: [t.yapi, 'H (m)', 'Ae (m²)', 'C1', 'C2', 'C3', 'C4', 'C5', 'Nd', 'Nc', 'E', t.gerekliSeviyeSutun],
    satirlar: sonuc.yapilar.map((y) => {
      const yapi = proje.yapilar.find((x) => x.id === y.yapiId);
      const r = y.risk;
      return [y.yapiIsim, sayi(yapi?.H_m), sayi(r?.Ae), cDegeri(yapi?.C1), cDegeri(yapi?.C2), cDegeri(yapi?.C3), cDegeri(yapi?.C4), cDegeri(yapi?.C5), sayi(r?.Nd, 5), sayi(r?.Nc, 5), sayi(r?.E, 3), r?.seviye ?? y.nihai.etiket];
    }),
    genislikler: [13, 6, 9, 5, 5, 5, 5, 5, 9, 9, 7, 14],
    kucuk: true,
  });

  // 6. Yapı bazlı
  b.push(n.bolum(t.bolumYapiBazli));
  for (const y of sonuc.yapilar) b.push(n.alt(y.yapiIsim), ...yapiDetayi(y, g, m));

  // 7. Genel sonuç
  b.push(n.bolum(t.bolumGenelSonuc));
  genelSonucCumleleri(sonuc, m).forEach((c) => b.push(p(c)));
  const eksikler = eksikYapilar(sonuc);
  if (eksikler.length) {
    b.push(p(t.eksiklerBaslik, { kalin: true }), {
      tur: 'maddeler',
      maddeler: eksikler.map((y) => [{ metin: `${y.yapiIsim}: `, kalin: true }, { metin: y.nihai.etiket }]),
    });
  }
  const projeUyarilari = sonuc.dogrulama.uyarilar.map((u) => u.mesaj);
  if (projeUyarilari.length) {
    b.push(p(t.dikkat, { kalin: true }), { tur: 'maddeler', maddeler: [...new Set(projeUyarilari)].map((metin) => [{ metin }]) });
  }
  if (dolu(g.genelSonucNotu)) b.push(p(dolu(g.genelSonucNotu)));

  // 8. Kaynaklar
  b.push(n.bolum(t.bolumKaynaklar), {
    tur: 'maddeler',
    maddeler: [
      t.kaynakStandart,
      t.kaynakRisk,
      t.kaynakTablolar(tablodakiDeltaT.length ? tablodakiDeltaT.join(', ') : '-'),
      ...(g.haritaVar && dolu(g.haritaAtfi) ? [t.kaynakHarita(dolu(g.haritaAtfi))] : []),
      t.kaynakArac(g.uygulama),
    ].map((metin) => [{ metin }]),
  });

  // Hazırlayan mühendis ve imza yalnızca kapakta yer alır (bkz. `muhendis`); sona ayrıca eklenmez.

  const ustBilgi = [proje.isim, dolu(g.raporNo) ? t.ustBilgiRaporNo(dolu(g.raporNo)) : '', `${t.rev} ${sonRevizyon}`].filter(Boolean).join(' · ');
  return {
    kapak: { firma, baslik: t.baslik, proje: proje.isim, adres, raporNo: dolu(g.raporNo), revizyon: sonRevizyon, tarih: g.raporTarihi },
    etiketler: {
      hazirlayan: t.hazirlayan,
      adSoyad: t.adSoyad,
      unvan: t.unvan,
      sicilNo: t.sicilNo,
      tarih: t.tarih,
      imza: t.imza,
      icindekiler: t.icindekiler,
      belgeAciklamasi: t.belgeAciklamasi,
      sayfa: t.sayfa,
      raporNo: t.raporNo,
      revizyon: t.revizyon,
      raporTarihi: t.raporTarihi,
      dil: m.bicim.yerel,
    },
    ustBilgi,
    muhendis: { ad: dolu(muh.ad), unvan: dolu(muh.unvan), sicilNo: dolu(muh.sicilNo), tarih: g.raporTarihi },
    bloklar: b,
    belgeBasligi: `${t.baslik}: ${proje.isim}`,
  };
}

/** İçerikteki bütün metinler (test ve arama için). */
export function raporMetinleri(r: RaporIcerigi): string[] {
  const m: string[] = [...Object.values(r.kapak), ...Object.values(r.etiketler).filter((e) => e !== r.etiketler.dil), r.ustBilgi, ...Object.values(r.muhendis)];
  for (const b of r.bloklar) {
    if (b.tur === 'baslik') m.push(`${b.numara}. ${b.metin}`);
    else if (b.tur === 'paragraf') m.push(b.parcalar.map((x) => x.metin).join(''));
    else if (b.tur === 'maddeler') b.maddeler.forEach((x) => m.push(x.map((y) => y.metin).join('')));
    else if (b.tur === 'tablo') m.push(...b.basliklar, ...b.satirlar.flat(), ...(b.altBilgi ? [b.altBilgi] : []));
    else if (b.tur === 'gorsel') m.push(b.aciklama);
  }
  return m;
}
