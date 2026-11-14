// Bu uygulama Buğra Güngöz tarafından hazırlanmıştır.
// GitHub: https://github.com/bugragungoz

import { gercekHHesapla } from './kotZinciri.js';

export function projeHesapDurumu(proje) {
  const durum = {
    canCalculate: true,
    errors: [],
    warnings: [],
  };

  if (!proje) return { canCalculate: false, errors: ['Proje yüklenemedi.'], warnings: [] };

  if (proje.Nk === null || proje.Nk === undefined || proje.Nk === '') {
    durum.canCalculate = false;
    durum.errors.push({ tip: 'NK', mesaj: 'Nk (Yıldırımlı Gün Sayısı) değeri girilmemiş.', aksiyon: 'Proje Ayarları > Nk' });
  }

  if (proje.yapilar && proje.yapilar.length > 0) {
    proje.yapilar.forEach(yp => {
      if (yp.H_m === null || yp.H_m === undefined || yp.H_m === '') {
        durum.canCalculate = false;
        durum.errors.push({ tip: 'YAPI_H', mesaj: yp.isim + ' için yükseklik (H) eksik.', yapiId: yp.id });
      }
      if (!yp.C1 || !yp.C2 || !yp.C3 || !yp.C4 || !yp.C5) {
        durum.canCalculate = false;
        durum.errors.push({ tip: 'YAPI_C', mesaj: yp.isim + ' için risk katsayıları (C) eksik.', yapiId: yp.id });
      }
    });
  }

  if (proje.yapilar && proje.paratonerler && proje.yapilar.length > 0 && proje.paratonerler.length > 0) {
    let hasH60 = false;
    proje.yapilar.forEach(yp => {
      proje.paratonerler.forEach(pr => {
        if (pr.gorunur_mu !== false) {
           const gercekH = gercekHHesapla(pr, yp, proje);
           if (gercekH > 60) hasH60 = true;
        }
      });
    });
    if (hasH60) {
      durum.warnings.push({ tip: 'H_60', mesaj: 'Bazı yapılar için paratoner yüksekliği (h) > 60m. Standart Rp üretilemez.' });
    }
  }

  return durum;
}
