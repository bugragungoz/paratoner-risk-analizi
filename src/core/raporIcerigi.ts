// Raporun bütün içeriği (metin, tablo, şekil yeri) tek bir listede üretilir. Word ve PDF
// çizicileri yalnızca bu listeyi biçimlendirir; böylece iki dosya aynı sayıları ve cümleleri taşır
// ve içerik arayüzden bağımsız olarak test edilebilir.

import { kotMetni, sayi } from './bicim';
import { etkinDeltaT, paratonerBazliDeltaTMi } from './dogrulama';
import { C1_SECENEKLERI, C2_MATRISI, C3_SECENEKLERI, C4_SECENEKLERI, C5_SECENEKLERI, CATI_MALZEMESI_ETIKETLERI, ESE_TABLOLARI, MALZEMELER, YAPI_MALZEMESI_ETIKETLERI, YAPI_TIPLERI, type Secenek } from './sabitler';
import { paratonerTepeKotu } from './kot';
import { eksikYapilar, genelSonucCumleleri, seviyeDagilimi, yapiAciklamaParagrafi } from './rapor';
import { ngHesapla } from './risk';
import { UYARI_EK_ONLEM, type ProjeSonucu, type YapiSonucu } from './hesap';
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

export interface RaporIcerigi {
  kapak: RaporKapagi;
  /** Her sayfanın üstündeki satır. */
  ustBilgi: string;
  muhendis: RaporGirdisi['muhendis'] & { tarih: string };
  bloklar: RaporBlogu[];
  belgeBasligi: string;
}

export const RAPOR_BASLIGI = 'Paratoner Sistemi İçin Risk Analizi ve Koruma Yeterlilik Raporu';

export const KAPSAM_NOTU = 'Bu analiz NF C 17-102 esaslıdır.';
export const KAPSAM_ACIKLAMASI =
  'Tesiste erken akış başlatmalı (ESE) aktif paratonerler kullanılmaktadır. ESE paratonerler TS EN 62305 serisinin kapsamında değildir; bu nedenle risk değerlendirmesi, gerekli koruma seviyesi ve koruma yarıçapı NF C 17-102 hükümlerine göre belirlenmiştir.';
export const KAPSAM_SINIRI =
  'Rapor, paratonerlerin (yakalama uçlarının) yapıları koruma yeterliliğini kapsar. İniş iletkenleri, topraklama tesisatı ve iç yıldırım koruması (aşırı gerilim koruması) bu raporun kapsamı dışındadır.';

const p = (metin: string, opt: { kalin?: boolean; kucuk?: boolean; italik?: boolean } = {}): RaporBlogu => ({
  tur: 'paragraf',
  parcalar: [{ metin, ...(opt.kalin ? { kalin: true } : {}) }],
  ...(opt.kucuk ? { kucuk: true } : {}),
  ...(opt.italik ? { italik: true } : {}),
});

const cDegeri = (d: number | null | undefined) => (d == null ? '-' : sayi(d, d % 1 === 0 ? 0 : 2));
const koordinat = (d: number) => sayi(d, 6);
const dolu = (s: string | undefined | null) => (s ?? '').trim();

/** Paratoner için raporda gösterilecek cihaz (paratonerin kendi bilgisi, yoksa projenin). */
export function paratonerCihazi(pr: Pick<Paratoner, 'cihaz'>, proje: Pick<Proje, 'cihaz'>): string {
  return dolu(pr.cihaz) || dolu(proje.cihaz);
}

/** Revizyon listesi boşsa raporun ilk yayını tek satır olarak yazılır. */
export function raporRevizyonlari(g: Pick<RaporGirdisi, 'revizyonlar' | 'raporTarihi'>): Revizyon[] {
  const dolular = g.revizyonlar.filter((r) => dolu(r.no) || dolu(r.aciklama) || dolu(r.tarih));
  return dolular.length ? dolular : [{ no: '00', tarih: g.raporTarihi, aciklama: 'İlk yayın' }];
}

function cTablosu(ad: string, secenekler: readonly Secenek[]): RaporBlogu {
  return { tur: 'tablo', basliklar: [ad, 'Açıklama'], satirlar: secenekler.map((s) => [cDegeri(s.deger), s.etiket]), genislikler: [12, 88] };
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

function yapiDetayi(y: YapiSonucu, proje: Proje, g: RaporGirdisi): RaporBlogu[] {
  const b: RaporBlogu[] = [];
  const ozet: string[][] = [
    ['Gerekli koruma seviyesi', y.risk?.seviye ?? '-'],
    ['Nihai durum', y.nihai.etiket],
  ];
  if (y.risk) {
    ozet.push(['Risk değerleri', `Ae = ${sayi(y.risk.Ae)} m² · Nd = ${sayi(y.risk.Nd, 5)} · Nc = ${sayi(y.risk.Nc, 5)} · E = ${sayi(y.risk.E, 3)}`]);
  }
  b.push({ tur: 'tablo', basliklar: [], satirlar: ozet, genislikler: [30, 70], anahtarDeger: true });

  const gecerli = y.satirlar.filter((s) => s.gecerli);
  if (gecerli.length) {
    b.push({
      tur: 'tablo',
      basliklar: ['Paratoner', 'ΔT (µs)', 'h (m)', 'Rp (m)', 'Mesafe, yakın (m)', 'Mesafe, uzak (m)', 'Marj, yakın (m)', 'Marj, uzak (m)', 'Durum'],
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
      altBilgi: `Nihai durum: ${y.nihai.etiket}`,
    });
    const notlar = ['(*) Birincil koruyucu: yapının en uzak noktasını en büyük marjla koruyan paratoner.'];
    if (gecerli.some((s) => s.enterpoleEdildi)) notlar.push('(a) Rp, tablo satırları arasında doğrusal ara değerle bulunmuştur.');
    b.push(p(notlar.join(' '), { kucuk: true }));
  }
  const disarida = y.satirlar.filter((s) => !s.gecerli);
  if (disarida.length && y.nihai.kod !== 'HESAPLANAMADI') {
    b.push({
      tur: 'tablo',
      basliklar: ['Koruyucu sayılmayan paratoner', 'h (m)', 'Neden'],
      satirlar: disarida.map((s) => [s.paratonerIsim, sayi(s.gercekH), s.neden ?? '-']),
      genislikler: [25, 10, 65],
      kucuk: true,
    });
  }

  b.push(p(yapiAciklamaParagrafi(y)));
  y.uyarilar.filter((u) => u !== UYARI_EK_ONLEM).forEach((u) => b.push(p(u)));
  const not = dolu(g.yapiNotlari[y.yapiId]);
  if (not) b.push({ tur: 'paragraf', parcalar: [{ metin: 'Saha notu: ', kalin: true }, { metin: not }] });
  return b;
}

export function raporIcerigi(proje: Proje, sonuc: ProjeSonucu, g: RaporGirdisi): RaporIcerigi {
  const n = numaralayici();
  const b: RaporBlogu[] = [];
  const revizyonlar = raporRevizyonlari(g);
  const sonRevizyon = revizyonlar[revizyonlar.length - 1]?.no ?? '00';
  const firma = dolu(g.firmaAdi) || 'bugra';
  const adres = dolu(g.tesisAdresi) || 'bugra';
  const m = g.muhendis;
  const etkinler = proje.paratonerler.filter((pr) => pr.aktif_mi !== false);
  const devreDisi = proje.paratonerler.length - etkinler.length;
  const kotAdi = (id: string | null) => proje.kot_seviyeleri.find((k) => k.id === id)?.isim ?? '-';
  const yapiAdi = (id: string | null) => proje.yapilar.find((y) => y.id === id)?.isim ?? '-';

  // Belge bilgileri, revizyonlar, içindekiler
  b.push(
    { tur: 'paragraf', parcalar: [{ metin: 'Belge bilgileri', kalin: true }] },
    {
      tur: 'tablo',
      basliklar: [],
      satirlar: [
        ['Rapor no', dolu(g.raporNo) || '-'],
        ['Proje', proje.isim],
        ['Tesis adresi', dolu(g.tesisAdresi) || '-'],
        ['Rapor tarihi', g.raporTarihi],
        ['Hazırlayan', [dolu(m.ad), dolu(m.unvan)].filter(Boolean).join(', ') || '-'],
        ['EMO sicil no', dolu(m.sicilNo) || '-'],
        ['Hesap aracı', g.uygulama],
      ],
      genislikler: [30, 70],
      anahtarDeger: true,
    },
    { tur: 'paragraf', parcalar: [{ metin: 'Revizyonlar', kalin: true }] },
    { tur: 'tablo', basliklar: ['Rev.', 'Tarih', 'Açıklama'], satirlar: revizyonlar.map((r) => [dolu(r.no) || '-', dolu(r.tarih) || '-', dolu(r.aciklama) || '-']), genislikler: [12, 20, 68] },
    { tur: 'icindekiler' },
    { tur: 'sayfaSonu' },
  );

  // 1. Giriş
  b.push(
    n.bolum('Giriş ve Amaç'),
    p(
      `Bu rapor, ${proje.isim} bünyesindeki yapıların yıldırım risk değerlendirmesini, yapı envanterini, ${etkinler.length} paratonerin bu yapıları hangi konfigürasyonla koruduğunu ve sağlanan koruma yarıçapının (Rp) gerekli koruma seviyesini karşıladığının doğrulamasını içermektedir.`,
    ),
    p(
      'Her yapı için etkin eşdeğer toplama alanı (Ae), bölgesel yıldırım yoğunluğu (Ng) ve yapıya özgü risk katsayıları (C1–C5) ile gerekli koruma seviyesi belirlenmiş; ardından erken akış başlatmalı (ESE) paratoner seçim tablosundan koruma yarıçapı (Rp) okunmuş ve paratoner–yapı geometrisi bu yarıçapla karşılaştırılmıştır.',
    ),
  );
  if (g.haritaVar) b.push({ tur: 'gorsel', kaynak: 'harita', aciklama: 'Şekil 1: Tesisin harita üzerindeki görünümü ve koruma alanları' });

  // 2. Kapsam ve dayanak
  b.push(n.bolum('Kapsam ve Dayanak'), p(KAPSAM_NOTU, { kalin: true }), p(KAPSAM_ACIKLAMASI), p(KAPSAM_SINIRI));
  b.push(
    p(
      `Rapor kapsamında ${proje.yapilar.length} yapı ve ${etkinler.length} paratoner değerlendirilmiştir${devreDisi ? ` (${devreDisi} paratoner devre dışı bırakıldığı için hesaba katılmamıştır)` : ''}.`,
    ),
  );
  const dagilim = seviyeDagilimi(sonuc);
  if (dagilim.length) {
    b.push(p('Gerekli koruma seviyesine göre yapılar:'), {
      tur: 'maddeler',
      maddeler: dagilim.map((d) => [{ metin: `${d.seviye}: `, kalin: true }, { metin: `${d.yapilar.length} yapı (${d.yapilar.join(', ')})` }]),
    });
  }

  // 3. Girdiler
  const paratonerBazli = paratonerBazliDeltaTMi(proje);
  b.push(n.bolum('Girdiler'), n.alt('Proje Parametreleri'), {
    tur: 'tablo',
    basliklar: ['Parametre', 'Değer'],
    satirlar: [
      ['Yıldırımlı gün sayısı, Nk', sayi(proje.Nk, proje.Nk !== null && proje.Nk % 1 === 0 ? 0 : 1)],
      ['Yer yıldırım yoğunluğu, Ng', proje.Nk !== null ? `${sayi(ngHesapla(proje.Nk), 3)} (1/km²·yıl)` : '-'],
      ['ΔT seçimi', paratonerBazli ? 'Paratoner bazlı (paratoner tablosunda)' : 'Proje bazlı (bütün paratonerler)'],
      [paratonerBazli ? 'Varsayılan ΔT' : 'ΔT', proje.deltaT !== null ? `${proje.deltaT} µs` : '-'],
      ['Paratoner cihazı', dolu(proje.cihaz) || (etkinler.some((pr) => dolu(pr.cihaz)) ? 'Paratoner tablosunda' : '-')],
      ['Koordinat sistemi', 'WGS 84 (enlem, boylam; derece)'],
      ['Kot referansı', 'Kot seviyeleri, proje referans kotuna (0,00 m) göre yüksekliktir.'],
    ],
    genislikler: [35, 65],
    anahtarDeger: true,
  });

  b.push(n.alt('Kot Seviyeleri'), {
    tur: 'tablo',
    basliklar: ['Kot seviyesi', 'Yükseklik (m)', 'Açıklama'],
    satirlar: [...proje.kot_seviyeleri].sort((a, b) => a.taban_kottan_yukseklik_m - b.taban_kottan_yukseklik_m).map((k) => [k.isim, kotMetni(k.taban_kottan_yukseklik_m, 2), dolu(k.aciklama) || '-']),
    genislikler: [30, 20, 50],
  });

  b.push(n.alt('Yapılar'), {
    tur: 'tablo',
    basliklar: ['Yapı', 'Tip', 'Kot', 'H (m)', 'Boyut', 'Taban alanı (m²)', 'Çevre (m)', 'Malzeme (C2)', 'Kritik'],
    satirlar: proje.yapilar.map((y) => {
      const s = sonuc.yapilar.find((x) => x.yapiId === y.id);
      // Eski projelerde tip yerleşik bir anahtardır; yeni kayıtlarda kullanıcının profil adıdır.
      const tip = YAPI_TIPLERI.find((t) => t.deger === y.tip)?.etiket ?? (dolu(y.tip) || 'Diğer');
      const c2 = y.C2_secim ? `${YAPI_MALZEMESI_ETIKETLERI[y.C2_secim.yapi]} / ${CATI_MALZEMESI_ETIKETLERI[y.C2_secim.cati]}` : '-';
      const boyut = y.manuelBoyut && y.L_m && y.W_m ? `L × W = ${sayi(y.L_m)} × ${sayi(y.W_m)}` : 'Poligon';
      return [y.isim, tip, kotAdi(y.kot_seviyesi_id), sayi(y.H_m), boyut, sayi(s?.alan), sayi(s?.cevre), c2, y.kritik_mi ? 'Evet' : 'Hayır'];
    }),
    genislikler: [13, 11, 10, 7, 13, 11, 9, 19, 7],
    kucuk: true,
  });

  b.push(n.alt('Paratonerler'), {
    tur: 'tablo',
    basliklar: ['Paratoner', 'Enlem', 'Boylam', 'Taban', 'Mast (m)', 'Uç kotu (m)', 'ΔT (µs)', 'Cihaz', 'Hesapta'],
    satirlar: proje.paratonerler.map((pr) => {
      const taban = pr.yapi_id ? `${yapiAdi(pr.yapi_id)} (çatı)` : kotAdi(pr.kot_seviyesi_id);
      const dT = etkinDeltaT(pr, proje);
      const etkin = pr.aktif_mi !== false;
      return [pr.isim, koordinat(pr.lat), koordinat(pr.lng), taban, sayi(pr.mast_yuksekligi_m, 2), kotMetni(paratonerTepeKotu(pr, proje), 2), dT === null ? '-' : String(dT), paratonerCihazi(pr, proje) || '-', etkin ? 'Evet' : 'Hayır (devre dışı)'];
    }),
    genislikler: [10, 11, 11, 13, 7, 8, 7, 18, 15],
    kucuk: true,
  });

  // 4. Yöntem
  b.push(n.bolum('Hesap Yöntemi'), n.alt('Risk Katsayıları (C1–C5)'));
  b.push(cTablosu('C1', C1_SECENEKLERI), {
    tur: 'tablo',
    basliklar: ['C2: Yapı \\ Çatı', ...MALZEMELER.map((x) => CATI_MALZEMESI_ETIKETLERI[x])],
    satirlar: MALZEMELER.map((y) => [YAPI_MALZEMESI_ETIKETLERI[y], ...MALZEMELER.map((cati) => sayi(C2_MATRISI[y][cati], 1))]),
    genislikler: [31, 23, 23, 23],
  });
  b.push(cTablosu('C3', C3_SECENEKLERI), cTablosu('C4', C4_SECENEKLERI), cTablosu('C5', C5_SECENEKLERI));
  b.push(n.alt('Risk Bağıntıları'), {
    tur: 'tablo',
    basliklar: ['Büyüklük', 'Bağıntı'],
    satirlar: [
      ['Eşdeğer toplama alanı, Ae (m²)', 'Ae = A + 3H·P + 9πH²  (elle girilen boyutta: L·W + 6H(L+W) + 9πH²)'],
      ['Yer yıldırım yoğunluğu, Ng', 'Ng = 0,04 · Nk^1,25'],
      ['Beklenen yıldırım sıklığı, Nd', 'Nd = Ae · Ng · C1 · 10⁻⁶'],
      ['Kabul edilebilir sıklık, Nc', 'Nc = 5,5 · 10⁻³ / (C2 · C3 · C4 · C5)'],
      ['Verimlilik, E', 'E = 1 − Nc / Nd'],
    ],
    genislikler: [35, 65],
    anahtarDeger: true,
  });
  b.push(n.alt('Gerekli Koruma Seviyesi'), {
    tur: 'tablo',
    basliklar: ['E aralığı', 'Gerekli seviye'],
    satirlar: [
      ['E > 0,98', 'Seviye 1 + ek önlem'],
      ['0,95 < E ≤ 0,98', 'Seviye 1'],
      ['0,90 < E ≤ 0,95', 'Seviye 2'],
      ['0,80 < E ≤ 0,90', 'Seviye 3'],
      ['0 < E ≤ 0,80', 'Seviye 4'],
      ['E ≤ 0 (Nd ≤ Nc)', 'İsteğe bağlı'],
    ],
    genislikler: [45, 55],
  });

  b.push(n.alt('Koruma Yarıçapı (Rp)'));
  b.push(
    p(
      'Rp, paratonerin ΔT değerine karşılık gelen ESE seçim tablosundan, yapının gerekli koruma seviyesi sütunundan okunmuştur. Buradaki h, paratoner ucunun korunan yapının çatı düzleminden yüksekliğidir; kot seviyeleri arasındaki farklar dahildir.',
    ),
  );
  const kullanilanDeltaT = [...new Set(sonuc.yapilar.flatMap((y) => y.satirlar.filter((s) => s.gecerli).map((s) => s.deltaT as number)))].sort((a, c) => a - c);
  const tablodakiDeltaT = kullanilanDeltaT.length ? kullanilanDeltaT : proje.deltaT ? [proje.deltaT] : [];
  for (const dT of tablodakiDeltaT) {
    const t = ESE_TABLOLARI[dT];
    if (!t) continue;
    b.push(p(`ESE seçim tablosu, ΔT = ${dT} µs (Rp, m):`, { kalin: true }), {
      tur: 'tablo',
      basliklar: ['h (m)', 'Seviye I', 'Seviye II', 'Seviye III', 'Seviye IV'],
      satirlar: t.map((s) => [String(s.h), String(s.I), String(s.II), String(s.III), String(s.IV)]),
      genislikler: [20, 20, 20, 20, 20],
      kucuk: true,
    });
  }

  const ekOnlemVar = sonuc.yapilar.some((y) => y.risk?.ekOnlemGerekli);
  b.push(n.alt('Varsayımlar'), {
    tur: 'maddeler',
    maddeler: [
      'Ng, yıldırımlı gün sayısından (Nk) Ng = 0,04 · Nk^1,25 bağıntısıyla hesaplanmıştır; ölçülmüş yer yıldırım yoğunluğu verisi kullanılmamıştır.',
      'Ae, yapı poligonunun alanı (A) ve çevresinden (P) hesaplanmıştır. Bu bağıntı dışbükey yapılarda 3H mesafeli toplama alanının tam karşılığıdır; içbükey yapılarda güvenli yönde büyük sonuç verir.',
      'Tablo satırları arasındaki h değerlerinde Rp doğrusal ara değerle bulunmuştur. h < 2 m veya h > 60 m için tabloda değer bulunmadığından, bu durumdaki paratoner o yapıyı korumuş sayılmamıştır.',
      'Bir yapının korunup korunmadığı en uzak noktasına göre değerlendirilmiştir. Tek paratoner yetmediğinde, bütün paratonerlerin koruma alanlarının birleşimi yapı poligonuyla karşılaştırılmıştır (birleşik koruma).',
      'Mesafeler yatay düzlemde WGS 84 koordinatlarından hesaplanmıştır. Bir yapının çatısındaki paratonerin o yapıya en yakın mesafesi 0 alınmıştır.',
      'Devre dışı bırakılan paratonerler hiçbir hesaba katılmamıştır. Haritada yalnızca gizlenen paratonerler hesaba katılmıştır.',
      ...(ekOnlemVar ? ['Gerekli seviyesi "Seviye 1 + ek önlem" olan yapılarda Seviye I koruma yarıçapı kullanılmış; standardın öngördüğü ek önlemler bu raporun hesabına dahil edilmemiştir.'] : []),
    ].map((metin) => [{ metin }]),
  });

  // 5. Risk sonuçları
  b.push(n.bolum('Risk Hesap Sonuçları'), {
    tur: 'tablo',
    basliklar: ['Yapı', 'H (m)', 'Ae (m²)', 'C1', 'C2', 'C3', 'C4', 'C5', 'Nd', 'Nc', 'E', 'Gerekli seviye'],
    satirlar: sonuc.yapilar.map((y) => {
      const yapi = proje.yapilar.find((x) => x.id === y.yapiId);
      const r = y.risk;
      return [y.yapiIsim, sayi(yapi?.H_m), sayi(r?.Ae), cDegeri(yapi?.C1), cDegeri(yapi?.C2), cDegeri(yapi?.C3), cDegeri(yapi?.C4), cDegeri(yapi?.C5), sayi(r?.Nd, 5), sayi(r?.Nc, 5), sayi(r?.E, 3), r?.seviye ?? y.nihai.etiket];
    }),
    genislikler: [13, 6, 9, 5, 5, 5, 5, 5, 9, 9, 7, 14],
    kucuk: true,
  });

  // 6. Yapı bazlı
  b.push(n.bolum('Yapı Bazlı Değerlendirme'));
  for (const y of sonuc.yapilar) b.push(n.alt(y.yapiIsim), ...yapiDetayi(y, proje, g));

  // 7. Genel sonuç
  b.push(n.bolum('Genel Sonuç'));
  genelSonucCumleleri(sonuc).forEach((c) => b.push(p(c)));
  const eksikler = eksikYapilar(sonuc);
  if (eksikler.length) {
    b.push(p('Aşağıdaki yapılarda gerekli koruma tam olarak sağlanamamaktadır; ek önlem alınması önerilir:', { kalin: true }), {
      tur: 'maddeler',
      maddeler: eksikler.map((y) => [{ metin: `${y.yapiIsim}: `, kalin: true }, { metin: y.nihai.etiket }]),
    });
  }
  const projeUyarilari = sonuc.dogrulama.uyarilar.map((u) => u.mesaj);
  if (projeUyarilari.length) {
    b.push(p('Dikkat edilmesi gerekenler:', { kalin: true }), { tur: 'maddeler', maddeler: [...new Set(projeUyarilari)].map((metin) => [{ metin }]) });
  }
  if (dolu(g.genelSonucNotu)) b.push(p(dolu(g.genelSonucNotu)));

  // 8. Kaynaklar
  b.push(n.bolum('Kaynaklar'), {
    tur: 'maddeler',
    maddeler: [
      'NF C 17-102 (Eylül 2011): Protection contre la foudre — Systèmes de protection contre la foudre à dispositif d\'amorçage. Koruma yarıçapı ve koruma seviyeleri bu baskıya göredir.',
      'Risk değerlendirmesi: NF C 17-102 esaslı basitleştirilmiş yöntem (Nd, Nc, E); bağıntılar "Hesap Yöntemi" bölümünde verilmiştir.',
      `ESE seçim tabloları, ΔT = ${tablodakiDeltaT.length ? tablodakiDeltaT.join(', ') : '-'} µs: NF C 17-102 koruma yarıçapı bağıntısından türetilmiş tablolar.`,
      ...(g.haritaVar && dolu(g.haritaAtfi) ? [`Harita görüntüsü: ${dolu(g.haritaAtfi)}.`] : []),
      `Hesap aracı: ${g.uygulama} (GPL-3.0, github.com/bugragungoz/paratoner-risk-analizi). Araç hiçbir garanti verilmeden sunulan bir hesap yardımcısıdır; girdilerin ve sonuçların doğruluğundan raporu hazırlayan sorumludur.`,
    ].map((metin) => [{ metin }]),
  });

  // Hazırlayan mühendis ve imza yalnızca kapakta yer alır (bkz. `muhendis`); sona ayrıca eklenmez.

  const ustBilgi = [proje.isim, dolu(g.raporNo) ? `Rapor no ${dolu(g.raporNo)}` : '', `Rev. ${sonRevizyon}`].filter(Boolean).join(' · ');
  return {
    kapak: { firma, baslik: RAPOR_BASLIGI, proje: proje.isim, adres, raporNo: dolu(g.raporNo), revizyon: sonRevizyon, tarih: g.raporTarihi },
    ustBilgi,
    muhendis: { ad: dolu(m.ad), unvan: dolu(m.unvan), sicilNo: dolu(m.sicilNo), tarih: g.raporTarihi },
    bloklar: b,
    belgeBasligi: `${RAPOR_BASLIGI}: ${proje.isim}`,
  };
}

/** İçerikteki bütün metinler (test ve arama için). */
export function raporMetinleri(r: RaporIcerigi): string[] {
  const m: string[] = [...Object.values(r.kapak), r.ustBilgi, ...Object.values(r.muhendis)];
  for (const b of r.bloklar) {
    if (b.tur === 'baslik') m.push(`${b.numara}. ${b.metin}`);
    else if (b.tur === 'paragraf') m.push(b.parcalar.map((x) => x.metin).join(''));
    else if (b.tur === 'maddeler') b.maddeler.forEach((x) => m.push(x.map((y) => y.metin).join('')));
    else if (b.tur === 'tablo') m.push(...b.basliklar, ...b.satirlar.flat(), ...(b.altBilgi ? [b.altBilgi] : []));
    else if (b.tur === 'gorsel') m.push(b.aciklama);
  }
  return m;
}
