// Rapor içeriği: özet sayılar, genel sonuç cümleleri ve yapı bazlı açıklama paragrafları.
// Hepsi hesap motorunun nihai (kombine) sonucuna dayanır. v3.2'deki doğru mantık geri
// getirildi; v5'teki "birincil paratonere göre sayım" çelişkisi giderildi (M5, Kanıt 6/9).

import { SEVIYE_NUMARASI, sayi, yuzde } from './bicim';
import { UYARI_EK_ONLEM, type NihaiKod, type ProjeSonucu, type YapiSonucu } from './hesap';

export interface RaporOzeti {
  toplam: number;
  /** Tek bir paratonerle ya da birleşik koruma alanıyla tamamen korunan yapılar. */
  yeterli: number;
  /** `yeterli` içinden yalnızca birleşik (kombine) koruma alanıyla korunanlar. */
  yeterliKombine: number;
  /** Nd ≤ Nc: koruma isteğe bağlı. */
  istegeBagli: number;
  kismi: number;
  yetersiz: number;
  koruyucuYok: number;
  geometriHatasi: number;
  hesaplanamadi: number;
  /**
   * Tek bir paratonerle tamamen korunan yapılarda (koruma isteğe bağlı olanlar dahil), birincil
   * paratonerin EN UZAK noktadaki marjı. Kombine korunan yapılarda tek paratonerin marjı anlamlı
   * olmadığından dahil edilmez.
   */
  marj: { enDar: number | null; enGenis: number | null; yapiSayisi: number };
}

const EKSIK_KODLAR: readonly NihaiKod[] = ['KISMI', 'YETERSIZ', 'KORUYUCU_YOK', 'GEOMETRI_HATASI', 'HESAPLANAMADI'];

export function birincilSatir(y: YapiSonucu) {
  return y.satirlar.find((s) => s.paratonerId === y.birincilParatonerId && s.gecerli) ?? null;
}

export function raporOzeti(sonuc: ProjeSonucu): RaporOzeti {
  const say = (...kodlar: NihaiKod[]) => sonuc.yapilar.filter((y) => kodlar.includes(y.nihai.kod)).length;
  // Birincil satırı "YETERLİ" olan yapı, tek paratonerin dairesi içinde kalır (koruma isteğe bağlı olsa bile).
  const marjlar = sonuc.yapilar
    .filter((y) => y.nihai.kod !== 'GEOMETRI_HATASI')
    .map(birincilSatir)
    .filter((s) => s?.durumKod === 'YETERLI')
    .map((s) => s?.marjEnUzak as number);
  return {
    toplam: sonuc.yapilar.length,
    yeterli: say('YETERLI', 'YETERLI_KOMBINE'),
    yeterliKombine: say('YETERLI_KOMBINE'),
    istegeBagli: say('ISTEGE_BAGLI_ICINDE', 'ISTEGE_BAGLI_DISINDA'),
    kismi: say('KISMI'),
    yetersiz: say('YETERSIZ'),
    koruyucuYok: say('KORUYUCU_YOK'),
    geometriHatasi: say('GEOMETRI_HATASI'),
    hesaplanamadi: say('HESAPLANAMADI'),
    marj: {
      enDar: marjlar.length ? Math.min(...marjlar) : null,
      enGenis: marjlar.length ? Math.max(...marjlar) : null,
      yapiSayisi: marjlar.length,
    },
  };
}

/** Gerekli korumanın sağlanamadığı yapılar (isteğe bağlı olanlar hariç). */
export function eksikYapilar(sonuc: ProjeSonucu): YapiSonucu[] {
  return sonuc.yapilar.filter((y) => EKSIK_KODLAR.includes(y.nihai.kod));
}

const SEVIYE_SIRASI = ['Seviye 1 + ek önlem', 'Seviye 1', 'Seviye 2', 'Seviye 3', 'Seviye 4', 'İsteğe bağlı'] as const;

/** Gerekli koruma seviyesine göre gruplanmış yapı adları. */
export function seviyeDagilimi(sonuc: ProjeSonucu): { seviye: string; yapilar: string[] }[] {
  const gruplar = new Map<string, string[]>();
  for (const y of sonuc.yapilar) {
    if (!y.risk) continue;
    gruplar.set(y.risk.seviye, [...(gruplar.get(y.risk.seviye) ?? []), y.yapiIsim]);
  }
  return SEVIYE_SIRASI.filter((s) => gruplar.has(s)).map((seviye) => ({ seviye, yapilar: gruplar.get(seviye) ?? [] }));
}

/** Yapı bazlı otomatik değerlendirme paragrafı. */
export function yapiAciklamaParagrafi(y: YapiSonucu): string {
  const t = y.yapiIsim;
  if (y.nihai.kod === 'HESAPLANAMADI') return `${t} için hesap yapılamadı: ${y.hatalar.join(' ')}`;
  if (y.nihai.kod === 'GEOMETRI_HATASI') {
    return `Uyarı: ${t} poligonunun sınırları geçersiz (kenarlar kesişiyor ya da poligon bozuk). Koruma alanı hesaplanamadı; poligonun köşelerini kesişmeyecek şekilde yeniden düzenleyin.`;
  }

  const parcalar: string[] = [];
  if (y.risk?.istegeBagli) {
    parcalar.push(`${t} için Nd ≤ Nc olduğundan yıldırımdan korunma isteğe bağlıdır.`);
  }

  const b = birincilSatir(y);
  if (!b) {
    parcalar.push(`${t} için geçerli bir koruyucu paratoner bulunamadı. Bu yapının koruma durumu ayrıca değerlendirilmelidir.`);
  } else {
    const hMetin = `${sayi(b.gercekH)} m${b.enterpoleEdildi ? ' (enterpolasyon)' : ''}`;
    const seviyeNo = b.sutun ? SEVIYE_NUMARASI[b.sutun] : '-';
    const giris = `${b.paratonerIsim} paratoneri ile ${t} arasındaki gerçek yükseklik farkı h = ${hMetin} olarak hesaplanmıştır. Seviye ${seviyeNo} için gerekli koruma yarıçapı Rp = ${sayi(b.rp)} m olup,`;
    const tamamenKorunuyor = y.nihai.kod === 'YETERLI' || y.nihai.kod === 'YETERLI_KOMBINE' || y.nihai.kod === 'ISTEGE_BAGLI_ICINDE';

    if (tamamenKorunuyor && b.durumKod !== 'YETERLI') {
      parcalar.push(
        `${giris} tek başına bu paratoner yapının tamamını korumaya yetmese de, projedeki diğer paratonerlerle birlikte değerlendirildiğinde (birleşik koruma alanı) yapının tamamı koruma altındadır (nihai durum: ${y.nihai.etiket}).`,
      );
    } else if (b.durumKod === 'YETERLI') {
      parcalar.push(
        `${giris} yapının en uzak noktası dahil (${sayi(b.enUzak)} m) koruma alanı içinde kalmaktadır; gerekli koruma sağlanmaktadır (marj: en yakın noktada ${sayi(b.marjEnYakin)} m, en uzak noktada ${sayi(b.marjEnUzak)} m).`,
      );
    } else if (b.durumKod === 'KISMI') {
      let metin = `${giris} yapının en yakın noktası koruma alanı içinde kalırken en uzak noktası Rp'yi ${sayi(Math.abs(b.marjEnUzak as number))} m aşmaktadır.`;
      if (y.kapsama && !y.kapsama.hicKorumaYokMu) {
        metin += ` Tüm paratonerler birlikte değerlendirildiğinde koruma altındaki alan oranı: ${yuzde(y.kapsama.kapsamaOrani)}.`;
      }
      metin += ' Yapının tamamının koruma altına alınabilmesi için ek paratoner veya konum revizyonu değerlendirilmelidir.';
      parcalar.push(metin);
    } else {
      parcalar.push(
        `${giris} aradaki mesafe bu değeri ${sayi(Math.abs(b.marjEnYakin as number))} m aşmaktadır; gerekli koruma sağlanamamaktadır. Ek önlem veya paratoner konumu revizyonu önerilir.`,
      );
    }
  }

  if (y.risk?.ekOnlemGerekli) parcalar.push(UYARI_EK_ONLEM);
  return parcalar.join(' ');
}

/** "Genel Sonuç" bölümünün cümleleri (eksik yapıların listesi ayrıca `eksikYapilar` ile verilir). */
export function genelSonucCumleleri(sonuc: ProjeSonucu): string[] {
  const o = raporOzeti(sonuc);
  const c: string[] = [];
  c.push(`Tesis bünyesinde bulunan toplam ${o.toplam} adet yapı NF C 17-102 esaslı olarak incelenmiştir.`);
  let yeterli = `Değerlendirilen yapıların ${o.yeterli} tanesinde yıldırımdan korunma sistemi yeterli bulunmuştur`;
  if (o.yeterliKombine > 0) yeterli += ` (bunların ${o.yeterliKombine} tanesi birden fazla paratonerin birleşik koruma alanıyla)`;
  c.push(`${yeterli}.`);
  if (o.istegeBagli > 0) c.push(`${o.istegeBagli} yapıda Nd ≤ Nc olduğundan koruma isteğe bağlıdır.`);
  if (o.hesaplanamadi > 0) c.push(`${o.hesaplanamadi} yapı için girdiler eksik olduğundan hesap yapılamamıştır.`);
  if (o.marj.yapiSayisi > 0) {
    c.push(
      `Tek bir paratonerle tamamen korunan yapılarda, en uzak noktadaki koruma marjı en az ${sayi(o.marj.enDar)} m, en fazla ${sayi(o.marj.enGenis)} m olarak hesaplanmıştır.`,
    );
  }
  const ekOnlem = sonuc.yapilar.filter((y) => y.risk?.ekOnlemGerekli).map((y) => y.yapiIsim);
  if (ekOnlem.length) {
    c.push(`${ekOnlem.join(', ')} için gerekli koruma seviyesi "Seviye 1 + ek önlem"dir; standardın öngördüğü ek koruma önlemleri ayrıca değerlendirilmelidir.`);
  }
  return c;
}
