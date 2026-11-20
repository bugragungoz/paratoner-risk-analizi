// Risk katsayısı seçenekleri, malzemeler ve yapı tiplerinin Türkçe adları. Değerler çekirdekte
// (core/sabitler.ts); anahtar, katsayının değeridir.

export const sabitTr = {
  cAdi: { C1: 'Çevre', C2: 'Yapı ve çatı malzemesi', C3: 'İçerik', C4: 'Kullanım (doluluk)', C5: 'Yıldırımın sonuçları' },
  C1: {
    '0.25': 'Aynı yükseklikte veya daha yüksek yapılar/ağaçlar arasında',
    '0.5': 'Daha alçak yapılarla çevrili',
    '1': 'Yalnız: 3H mesafe içinde başka yapı yok',
    '2': 'Yalnız ve tepe/yükselti üzerinde (bölgenin en yüksek noktası)',
  },
  C3: {
    '0.5': 'Değersiz, yanmaz içerik',
    '1': 'Normal değerde, olağan yanıcılıkta içerik',
    '2': 'Değerli veya kolay tutuşan içerik',
    '3': 'Çok değerli/yeri doldurulamaz, parlayıcı veya patlayıcı içerik',
  },
  C4: { '0.5': 'Personelsiz', '1': 'Normal doluluk', '3': 'Tahliyesi zor veya panik riski var' },
  C5: {
    '1': 'Hizmet sürekliliği gerekmiyor, çevresel sonucu yok',
    '5': 'Hizmet sürekliliği gerekiyor, çevresel sonucu yok',
    '10': 'Çevresel sonuç doğurabilir',
  },
  yapiMalzemesi: { metal: 'Metal yapı', normal: 'Normal yapı (tuğla, beton, kâgir)', yanici: 'Yanıcı yapı (ahşap vb.)' },
  catiMalzemesi: { metal: 'Metal çatı', normal: 'Normal çatı (kiremit, beton vb.)', yanici: 'Yanıcı çatı (ahşap, saman, kamış vb.)' },
  yapiTipi: {
    kumes: 'Kümes',
    silo: 'Silo',
    idari_bina: 'İdari Bina',
    lojman: 'Lojman',
    depo: 'Depo',
    su_deposu: 'Su Deposu',
    tank: 'Tank',
    jenerator_odasi: 'Jeneratör Odası',
    diger: 'Diğer',
  },
  yapiTipiGerekce: {
    kumes: 'Aynı yükseklikte yapılar arasında; tuğla gövde, metal çatı; personelsiz; üretim değeri var',
    silo: 'Sahanın en yüksek noktalarından; metal yapı; personelsiz',
    idari_bina: 'Normal doluluk, normal değer',
    lojman: 'İnsan barınan yapı',
    depo: 'Tuğla gövde, metal çatı; personelsiz; orta değer',
    su_deposu: 'Yüksek konumlu; sürekli kullanım ve çevresel sonuç düşük',
    tank: 'Metal yapı; parlayıcı içerik riski; personelsiz',
    jenerator_odasi: 'Metal yapı; yakıt içeriği; personelsiz',
    diger: 'Varsayılan değerler — gözden geçirilmelidir',
  },
};
