// Hesap çekirdeğinin Türkçe metinleri: sonuç etiketleri, satır nedenleri, doğrulama mesajları.

export const hesapTr = {
  seviye: {
    EK: 'Seviye 1 + ek önlem',
    I: 'Seviye 1',
    II: 'Seviye 2',
    III: 'Seviye 3',
    IV: 'Seviye 4',
    ISTEGE_BAGLI: 'İsteğe bağlı',
    GECERSIZ: 'GEÇERSİZ VERİ',
  },
  /** Kısa gösterim (yapı listesi rozeti). */
  seviyeKisa: { EK: 'I+', I: 'I', II: 'II', III: 'III', IV: 'IV', ISTEGE_BAGLI: 'İst.', GECERSIZ: '?' },
  satir: { YETERLI: 'Koruma yeterli', KISMI: 'Kısmi koruma', YETERSIZ: 'Koruma yetersiz' },
  nihai: {
    YETERLI: 'Koruma yeterli',
    YETERLI_KOMBINE: 'Koruma yeterli (birleşik)',
    KISMI: (oran: string) => `Kısmi koruma (${oran}): açıkta alan var`,
    YETERSIZ: 'Koruma yetersiz',
    KORUYUCU_YOK: 'Koruyucu bulunamadı',
    GEOMETRI_HATASI: 'Geometri hatası',
    ISTEGE_BAGLI_ICINDE: 'Koruma isteğe bağlı (yapının tamamı korunuyor)',
    ISTEGE_BAGLI_DISINDA: 'Koruma isteğe bağlı (yapının tamamı korunmuyor)',
    HESAPLANAMADI: 'Hesaplanamadı',
  },
  rp: {
    GECERSIZ_H: 'Geçersiz h değeri.',
    DELTA_T_TANIMSIZ: 'ΔT seçilmemiş ya da tabloda yok (geçerli değerler: 15, 30, 45, 60 µs).',
    H_2_ALTI: 'NFC 17-102 standardı gereği h mesafesi 2 metreden az olamaz.',
    H_60_USTU:
      'Bu yükseklik için uygulama tarafından standart tabanlı Rp değeri üretilememektedir. 60 m üzerindeki yükseklikler için özel mühendislik değerlendirmesi gereklidir.',
  },
  uyariEkOnlem:
    "Gerekli koruma seviyesi 'Seviye 1 + ek önlem': Seviye I koruma yarıçapına ek olarak, standardın öngördüğü ek koruma önlemleri ayrıca değerlendirilmelidir.",
  uyariYuksekYapi:
    "Yapı yüksekliği 60 m'yi aşıyor: NF C 17-102'nin yüksek yapılara ilişkin ek hükümleri (yan darbelere karşı koruma) ayrıca değerlendirilmelidir.",
  nedenKotEksik: 'Kot verisi eksik (kot seviyesi veya yapı tanımı bulunamadı)',
  nedenYapiYuksek: 'Yapı, paratonerden daha yüksekte veya aynı boyda — korunamaz',
  nedenPoligon: 'Yapı poligonu geçersiz.',
  deltaTYok: 'ΔT (paratoner yayılım süresi) seçilmemiş.',
  deltaTYokParatoner: (adlar: string) => `ΔT (paratoner yayılım süresi) seçilmemiş: ${adlar}.`,
  nkYok: 'Nk (yıldırımlı gün sayısı) girilmemiş.',
  riskGecersiz: 'Risk analizi geçersiz: Nd hesaplanamadı.',
  dogrulama: {
    onEk: (ad: string, mesaj: string) => `${ad}: ${mesaj}`,
    yapiKotYok: 'bağlı olduğu kot seviyesi bulunamadı.',
    yapiH: 'yükseklik (H) girilmemiş ya da sıfırdan büyük değil.',
    yapiBoyut: 'manuel boyut seçili ama L ve W girilmemiş.',
    yapiPoligon: 'poligonun en az 3 köşesi olmalı.',
    yapiPoligonKesisiyor: 'poligonun kenarları birbirini kesiyor; köşeleri kesişmeyecek şekilde düzenleyin.',
    yapiCEksik: (eksik: string) => `risk katsayıları eksik (${eksik}).`,
    yapiCStandartDisi: (c: string, deger: string) => `${c} = ${deger} standart tabloda yok; yeniden seçin.`,
    yapiC2Tutarsiz: 'C2 değeri seçilen yapı/çatı malzemesiyle uyuşmuyor; yeniden seçin.',
    paratonerYapiYok: 'üzerinde durduğu yapı bulunamadı.',
    paratonerKotYok: 'bağlı olduğu kot seviyesi bulunamadı.',
    paratonerMast: 'mast yüksekliği sıfırdan büyük olmalı.',
    deltaTGecersiz: (dT: number, gecerli: string) => `ΔT = ${dT} µs tabloda yok (geçerli değerler: ${gecerli} µs).`,
    nkYok: 'Nk (yıldırımlı gün sayısı) girilmemiş.',
    deltaTOnay:
      'ΔT onaylanmadı: proje eski sürümden aktarıldı ve ΔT = 60 µs eski sürümün varsayılanıydı. Kullandığınız paratonerin ΔT değerini seçin.',
    deltaTYokParatoner: (adlar: string) =>
      `ΔT (paratoner yayılım süresi) seçilmemiş: ${adlar}. Paratonerin ΔT'sini ya da projenin varsayılan ΔT'sini seçin.`,
    deltaTYok: "ΔT (paratoner yayılım süresi) seçilmemiş. Ayarlar'dan projenin ΔT değerini seçin.",
    projeDeltaTGecersiz: (dT: number) => `Proje ΔT = ${dT} µs tabloda yok.`,
    yuksekYapi: (yapi: string) =>
      `${yapi}: yükseklik 60 m'yi aşıyor. NF C 17-102'nin yüksek yapılara ilişkin ek hükümleri (yan darbelere karşı koruma) ayrıca değerlendirilmelidir.`,
    h60: (pr: string, yapi: string, h: string) => `${pr} → ${yapi}: h = ${h} m > 60 m. Standart Rp üretilemez; özel mühendislik değerlendirmesi gerekir.`,
    catiDisinda: (pr: string, yapi: string) =>
      `${pr}: tabanı "${yapi}" çatısı seçili ama konumu bu yapının dışında. Yükseklik çatıdan, mesafeler bulunduğu yerden hesaplanıyor; konumu ya da tabanı düzeltin.`,
    yapiIcinde: (pr: string, yapi: string) =>
      `${pr}: "${yapi}" yapısının içinde ama yüksekliği kot seviyesinden ölçülüyor. Paratoner çatıdaysa tabanını "Bir yapının üzerinde" olarak seçin.`,
    adTekrarYapi: (adlar: string) => `Aynı adlı yapılar var: ${adlar}. Hesap tablosunda ve raporda ayırt edilebilmeleri için adlarını değiştirin.`,
    adTekrarParatoner: (adlar: string) => `Aynı adlı paratonerler var: ${adlar}. Hesap tablosunda ve raporda ayırt edilebilmeleri için adlarını değiştirin.`,
    ustUste: (a: string, b: string, alan: string) =>
      `${a} ve ${b} üst üste biniyor (ortak alan ${alan} m²). Aynı yapı iki kez çizilmiş olabilir; Ae ve sonuçlar her yapı için ayrı hesaplanır.`,
  },
};
