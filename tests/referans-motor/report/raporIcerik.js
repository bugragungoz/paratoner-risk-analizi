// Bu uygulama Buğra Güngöz tarafından hazırlanmıştır.
// GitHub: https://github.com/bugragungoz

// Faz 4 — proje verisinden rapor içeriğini (metin + tablo verisi)
// derleyen modül. Docx render katmanından ayrı tutulur ki içerik
// mantığı test edilebilir olsun.

import { aeHesapla } from '../calc/geo';
import { yapiRiskAnaliziYap } from '../calc/riskAnalizi';
import { yapiHesapSatirlariUret } from '../calc/hesapTablosu';

const SEVIYE_SIRASI = ['Seviye 1 + Ek Önlem', 'Seviye 1', 'Seviye 2', 'Seviye 3', 'Seviye 4', 'İsteğe Bağlı'];

/**
 * Her yapı için tam risk analizini (Ae, Nd, Nc, E, seviye) hesaplar.
 */
export function tumYapiAnalizleri(proje) {
  return proje.yapilar.map(yapi => {
    const { alan, cevre, Ae } = aeHesapla(yapi);
    const analiz = yapiRiskAnaliziYap({ ...yapi, Ae }, proje.Nk);
    return { yapi, alan, cevre, Ae, ...analiz };
  });
}

/**
 * Kapsam bölümü için: seviyeye göre gruplanmış yapı listesi.
 */
export function seviyeDagilimi(proje) {
  const analizler = tumYapiAnalizleri(proje);
  const gruplar = {};
  analizler.forEach(({ yapi, seviye }) => {
    if (!gruplar[seviye]) gruplar[seviye] = [];
    gruplar[seviye].push(yapi.isim);
  });
  return SEVIYE_SIRASI
    .filter((s) => gruplar[s]?.length)
    .map((seviye) => ({ seviye, yapilar: gruplar[seviye] }));
}

/**
 * Yapı bazlı otomatik açıklama paragrafı üretir (referans rapordaki
 * dile uygun şablon). Marj pozitifse "koruma sağlanıyor", negatifse
 * "ek önlem/revizyon önerilir" ile biter.
 */
export function yapiAciklamaParagrafi(yapiSonuc) {
  const { yapiIsim, seviye, satirlar, birincilParatonerId } = yapiSonuc;
  const birincil = satirlar.find((s) => s.paratonerId === birincilParatonerId);

  if (!birincil) {
    return `${yapiIsim} için görünür/geçerli bir koruyucu paratoner bulunamadı. Bu yapının koruma durumu ayrıca değerlendirilmelidir.`;
  }

  const seviyeNo = seviye.replace(/[^0-9]/g, '') || '-';
  const hMetin = birincil.enterpoleEdildi ? `${birincil.gercekH.toFixed(1)}m (enterpolasyon)` : `${birincil.gercekH.toFixed(1)}m`;

  if (birincil.durum === 'KORUMA YETERLİ') {
    return `${birincil.paratonerIsim} paratoneri ile ${yapiIsim} arasındaki gerçek yükseklik farkı h=${hMetin} olarak hesaplanmıştır. Seviye ${seviyeNo} için gerekli koruma yarıçapı Rp=${birincil.rp}m olup, aradaki mesafe (en uzak nokta dahil ${birincil.enUzak.toFixed(1)}m) bu değerin altında kalmaktadır; gerekli koruma sağlanmaktadır (marj: en yakın noktada ${birincil.marjEnYakin.toFixed(1)}m, en uzak noktada ${birincil.marjEnUzak.toFixed(1)}m).`;
  }
  if (birincil.durum === 'KISMİ KORUMA') {
    return `${birincil.paratonerIsim} paratoneri ile ${yapiIsim} arasındaki gerçek yükseklik farkı h=${hMetin} olarak hesaplanmıştır. Seviye ${seviyeNo} için gerekli koruma yarıçapı Rp=${birincil.rp}m olup, yapının en yakın noktası koruma alanı içinde kalırken en uzak noktası Rp'yi ${Math.abs(birincil.marjEnUzak).toFixed(1)}m aşmaktadır. Yapının tamamının koruma altına alınabilmesi için ek paratoner veya konum revizyonu değerlendirilmelidir.`;
  }
  return `${birincil.paratonerIsim} paratoneri ile ${yapiIsim} arasındaki gerçek yükseklik farkı h=${hMetin} olarak hesaplanmıştır. Seviye ${seviyeNo} için gerekli koruma yarıçapı Rp=${birincil.rp}m olup, aradaki mesafe bu değeri ${Math.abs(birincil.marjEnYakin).toFixed(1)}m aşmaktadır; gerekli koruma sağlanamamaktadır. Ek önlem veya paratoner konumu revizyonu önerilir.`;
}

/**
 * Genel Sonuç bölümü için özet istatistikler.
 */
export function genelSonucOzeti(proje) {
  if (!proje || !proje.yapilar || !proje.paratonerler) return { toplamYapi: 0, yeterli: 0, kismi: 0, yetersiz: 0, gecersiz: 0 };
  const tablo = proje.yapilar.map((yapi) => yapiHesapSatirlariUret(yapi, proje.paratonerler, proje));

  let yeterli = 0, kismi = 0, yetersiz = 0, gecersiz = 0;
  const marjlar = [];

  tablo.forEach((yapiSonuc) => {
    const birincil = yapiSonuc.satirlar.find((s) => s.paratonerId === yapiSonuc.birincilParatonerId);
    if (!birincil) { gecersiz++; return; }
    if (birincil.durum === 'KORUMA YETERLİ') yeterli++;
    else if (birincil.durum === 'KISMİ KORUMA') kismi++;
    else yetersiz++;
    marjlar.push(birincil.marjEnYakin);
  });

  return {
    toplamYapi: proje.yapilar.length,
    yeterli, kismi, yetersiz, gecersiz,
    marjMin: marjlar.length ? Math.min(...marjlar) : null,
    marjMax: marjlar.length ? Math.max(...marjlar) : null,
  };
}

