// v5 haritasının yapı kapsama (yeşil/kırmızı) hesabı.
// src/map/HaritaGorunumu.jsx (v5-referans) içindeki "Yapı kapsama analizi" efektinin
// React ve Leaflet çizimi çıkarılmış birebir kopyası. Mantığa dokunulmamıştır.
// "Seçili Yapı İzolasyonu" modu (binaBazliAnaliz) dışarıda bırakıldı.

import { aeHesapla, yapiKapsamaAnalizi } from '../calc/geo';
import { yapiRiskAnaliziYap } from '../calc/riskAnalizi';
import { gercekHHesapla } from '../calc/kotZinciri';
import { rpOku } from '../calc/eseTablosu';

function yapiGerekliSutun(yapi, Nk) {
  const { Ae } = aeHesapla(yapi);
  const analiz = yapiRiskAnaliziYap({ ...yapi, Ae }, Nk);
  return { sutun: analiz.sutun, analiz };
}

/**
 * @param {object} proje
 * @param {{ paratonerIdleri?: Set<string> }} [gorunurlukFiltresi] Katmanlar panelindeki paratoner anahtarları
 * @returns {{ yapiId: string, analiz: object }[]} çizilen her yapı için yapiKapsamaAnalizi sonucu
 */
export function haritaKapsamaV5(proje, gorunurlukFiltresi) {
  const sonuc = [];
  proje.yapilar.forEach((yp) => {
    if (!yp.gorunur_mu) return;

    const { sutun: yapiSutun } = yapiGerekliSutun(yp, proje.Nk);
    if (!yapiSutun) return;

    const kullanilanSutun = yapiSutun;

    const daireler = [];
    proje.paratonerler.forEach((pr) => {
      if (!pr.gorunur_mu) return;
      if (gorunurlukFiltresi?.paratonerIdleri && !gorunurlukFiltresi.paratonerIdleri.has(pr.id)) return;
      const gercekH = gercekHHesapla(pr, yp, proje);
      if (gercekH === null || gercekH <= 0) return;
      const okuma = rpOku(gercekH, kullanilanSutun, proje.deltaT || 60);
      if (!okuma) return;
      daireler.push({ merkez: { lat: pr.lat, lng: pr.lng }, yaricapM: okuma.rp });
    });

    sonuc.push({ yapiId: yp.id, analiz: yapiKapsamaAnalizi(daireler, yp.poligon) });
  });
  return sonuc;
}
