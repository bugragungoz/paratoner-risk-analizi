// Bu uygulama Buğra Güngöz tarafından hazırlanmıştır.
// GitHub: https://github.com/bugragungoz

// Faz 2 — her paratoner-yapı çifti için h/Rp/mesafe/marj hesabını
// merkezi olarak üreten modül. Bkz. 02-faz2-hesaplama.md.

import { gercekHHesapla } from './kotZinciri';
import { rpOku } from './eseTablosu';
import { aeHesapla, paratonerYapiMesafeleri, yapiKapsamaAnalizi } from './geo';
import { yapiRiskAnaliziYap } from './riskAnalizi';
/**
 * Bir yapı için, TÜM görünür paratonerlere göre hesap satırlarını
 * üretir (sadece gerçek h > 0 olan, yani paratonerin yapıdan
 * gerçekten yüksekte olduğu çiftler).
 *
 * @param {object} yapi
 * @param {object[]} paratonerler
 * @param {object} proje
 * @returns {object[]} her biri bir paratoner-yapı çifti satırı
 */
export function yapiHesapSatirlariUret(yapi, paratonerler, proje) {
  const { Ae } = aeHesapla(yapi);
  const analiz = yapiRiskAnaliziYap({ ...yapi, Ae }, proje.Nk);

  const satirlar = [];

  paratonerler.forEach((pr) => {
    const gercekH = gercekHHesapla(pr, yapi, proje);

    if (gercekH === null) {
      satirlar.push({
        paratonerId: pr.id,
        paratonerIsim: pr.isim,
        gecerliMi: false,
        neden: 'Kot verisi eksik (kot seviyesi veya yapı tanımı bulunamadı)',
      });
      return;
    }

    if (gercekH < 2) {
      satirlar.push({
        paratonerId: pr.id,
        paratonerIsim: pr.isim,
        gecerliMi: false,
        neden: gercekH <= 0 ? 'Yapı, paratonerden daha yüksekte veya aynı boyda — korunamaz' : 'NFC 17-102 standardı gereği h mesafesi 2 metreden az olamaz.',
        gercekH,
      });
      return;
    }

    let uyari = null;
    if (gercekH > 60) {
      uyari = 'DİKKAT: h > 60m. NFC 17-102 standart formül sınırları dışına çıkılmıştır. Yanal yıldırım riskleri dahil olmak üzere uzman bir Elektrik-Elektronik Mühendisi tarafından değerlendirilmelidir.';
    }

    if (!analiz.sutun) {
      satirlar.push({
        paratonerId: pr.id,
        paratonerIsim: pr.isim,
        gecerliMi: false,
        neden: 'Yapı için gerekli koruma seviyesi hesaplanamadı (Nd, C değerleri eksik olabilir)',
        gercekH,
      });
      return;
    }

    const okuma = rpOku(gercekH, analiz.sutun, proje.deltaT || 60);
    
    if (!okuma || okuma.hesaplanamaz) {
      satirlar.push({
        paratonerId: pr.id,
        paratonerIsim: pr.isim,
        gecerliMi: false,
        neden: okuma?.mesaj || 'Bu h ve Seviye için Rp değeri tabloda okunamadı.',
        gercekH,
      });
      return;
    }

    const { enYakin, enUzak } = paratonerYapiMesafeleri(pr, yapi.poligon);
    const marjEnYakin = okuma.rp - enYakin;
    const marjEnUzak = okuma.rp - enUzak;

    let durum;
    let durumRenk;
    if (marjEnYakin >= 0 && marjEnUzak >= 0) {
      durum = 'KORUMA YETERLİ';
      durumRenk = '#16a34a';
    } else if (marjEnYakin >= 0 && marjEnUzak < 0) {
      durum = 'KISMİ KORUMA';
      durumRenk = '#eab308';
    } else {
      durum = 'KORUMA YETERSİZ';
      durumRenk = '#dc2626';
    }

    satirlar.push({
      paratonerId: pr.id,
      paratonerIsim: pr.isim,
      gecerliMi: true,
      gercekH,
      rp: okuma.rp,
      enterpoleEdildi: okuma.enterpoleEdildi,
      sutun: analiz.sutun,
      enYakin,
      enUzak,
      marjEnYakin,
      marjEnUzak,
      durum,
      durumRenk,
      uyari,
    });
  });

  // En iyi (en yüksek marj) paratoneri birincil koruyucu olarak öne çıkar
  const gecerliSatirlar = satirlar.filter((s) => s.gecerliMi);
  const birincil = gecerliSatirlar.length
    ? gecerliSatirlar.reduce((en, s) => (s.marjEnYakin > en.marjEnYakin ? s : en))
    : null;

  // Nihai Koruma Durumu Hesaplama
  let nihaiDurum = 'KORUMA YETERSİZ';
  let nihaiDurumRenk = '#dc2626';

  if (gecerliSatirlar.length === 0) {
    nihaiDurum = 'KORUYUCU BULUNAMADI';
    nihaiDurumRenk = '#71717a';
  } else {
    // Her bina KENDİ koruma seviyesi (Sütun I, II, vb.) üzerinden değerlendirilir.
    // Bu sayede standartlara %100 sadık kalınarak hesaplama yapılır.
    const kullanilanSutun = analiz.sutun;

    const daireler = gecerliSatirlar.map(s => {
      const pr = paratonerler.find(p => p.id === s.paratonerId);
      // Binanın kendi sütunuyla Rp'yi yeniden hesapla
      const okuma = rpOku(s.gercekH, kullanilanSutun, proje.deltaT || 60);
      return { merkez: { lat: pr.lat, lng: pr.lng }, yaricapM: okuma ? okuma.rp : s.rp };
    });
    const kombinasyonAnalizi = yapiKapsamaAnalizi(daireler, yapi.poligon);

    if (kombinasyonAnalizi.geometriHatasi) {
      nihaiDurum = 'GEOMETRİ HATASI';
      nihaiDurumRenk = '#dc2626';
    } else if (kombinasyonAnalizi.tamamenKorunuyorMu) {
      if (gecerliSatirlar.some(s => s.durum === 'KORUMA YETERLİ')) {
        nihaiDurum = 'KORUMA YETERLİ';
      } else {
        nihaiDurum = 'KORUMA YETERLİ (Kombine)';
      }
      nihaiDurumRenk = '#16a34a';
    } else if (kombinasyonAnalizi.hicKoruumaYokMu) {
      nihaiDurum = 'KORUMA YETERSİZ';
      nihaiDurumRenk = '#dc2626';
    } else {
      // Açıkta kalan kısım (exposed area) uyarısı override
      // Math.floor kullanarak 99.9'un 100'e yuvarlanıp kafa karıştırmasını engelliyoruz
      const oran = Math.floor(kombinasyonAnalizi.kapsamaOrani * 1000) / 10; 
      nihaiDurum = `DİKKAT: KISMİ KORUMA (%${oran}) - AÇIKTA ALAN VAR`;
      nihaiDurumRenk = '#dc2626'; // Yetersiz ve tehlikeli olduğu için kırmızımsı
    }
  }

  // Eğer yapı için koruma isteğe bağlı ise (Nd < Nc veya E <= 0)
  // kırmızı uyarıları soluk yeşile / griye dönüştürüp özel mesaj gösteriyoruz.
  if (analiz.E <= 0) {
    if (nihaiDurum === 'KORUMA YETERSİZ' || nihaiDurum.includes('KISMİ') || nihaiDurum === 'KORUYUCU BULUNAMADI') {
      nihaiDurum = 'KORUMA İSTEĞE BAĞLI (Menzil Dışı)';
      nihaiDurumRenk = '#84cc16'; // Açık/soluk yeşil
    } else if (nihaiDurum.includes('YETERLİ')) {
      nihaiDurum = 'KORUMA İSTEĞE BAĞLI (Menzil İçinde)';
      nihaiDurumRenk = '#84cc16';
    }
  }

  return {
    yapiId: yapi.id,
    yapiIsim: yapi.isim,
    Ae,
    ...analiz,
    satirlar,
    birincilParatonerId: birincil?.paratonerId || null,
    nihaiDurum,
    nihaiDurumRenk,
  };
}

/**
 * Projedeki TÜM yapılar için hesap tablosunu üretir.
 * @param {object} proje
 */
export function projeHesapTablosuUret(proje) {
  if (!proje || !proje.yapilar || !proje.paratonerler) return [];

  const { yapilar, paratonerler } = proje;

  return yapilar.map((yapi) =>
    yapiHesapSatirlariUret(yapi, paratonerler, proje)
  );
}

