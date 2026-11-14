// Bu uygulama Buğra Güngöz tarafından hazırlanmıştır.
// GitHub: https://github.com/bugragungoz

// Coğrafi yardımcı fonksiyonlar — Turf.js tabanlı.
import * as turf from '@turf/turf';

const DUNYA_YARICAPI_M = 6371000;

/**
 * İki lat/lng noktası arası mesafe (metre), Haversine formülü.
 */
export function haversineMesafe(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return DUNYA_YARICAPI_M * c;
}

/**
 * poligon: [{lat,lng}, ...] -> turf Polygon feature (kapalı halka)
 */
function poligonToTurf(poligon) {
  const coords = poligon.map((n) => [n.lng, n.lat]);
  // kapalı halka garantisi
  const ilk = coords[0];
  const son = coords[coords.length - 1];
  if (ilk[0] !== son[0] || ilk[1] !== son[1]) coords.push(ilk);
  return turf.polygon([coords]);
}

/**
 * Poligonun alanı (m²) ve çevresi (m). Shoelace + Turf ile.
 * @param {{lat:number,lng:number}[]} poligon
 */
export function poligonAlanCevre(poligon) {
  if (!poligon || poligon.length < 3) return { alan: 0, cevre: 0 };
  const f = poligonToTurf(poligon);
  const alan = turf.area(f); // m²
  const cevre = turf.length(f, { units: 'kilometers' }) * 1000; // turf.length çizgi/poligon sınırını ölçer
  return { alan, cevre };
}

/**
 * Ae (Etkin Eşdeğer Alan) — referans formül: Ae = L*W + 2L*3H + 2W*3H + 9πH² (Dikdörtgen için) veya Poligon buffer.
 * @param {Object} yapi
 */
export function aeHesapla(yapi) {
  if (yapi.manuelBoyut && yapi.L_m && yapi.W_m) {
    const L = yapi.L_m;
    const W = yapi.W_m;
    const H = yapi.H_m;
    const alan = L * W;
    const cevre = 2 * (L + W);
    const Ae = L * W + 6 * H * (L + W) + 9 * Math.PI * H * H;
    return { alan, cevre, Ae };
  } else {
    const { alan, cevre } = poligonAlanCevre(yapi.poligon);
    const Ae = alan + 6 * yapi.H_m * (cevre / 2) + 9 * Math.PI * yapi.H_m * yapi.H_m;
    return { alan, cevre, Ae };
  }
}

/**
 * Paratonerden poligonun EN YAKIN (kenar) ve EN UZAK köşe noktasına mesafe (m).
 * Turf.js pointToLineDistance kullanılarak kenara dik mesafe bulunur.
 * @param {{lat:number,lng:number}} paratoner
 * @param {{lat:number,lng:number}[]} poligon
 */
export function paratonerYapiMesafeleri(paratoner, poligon) {
  if (!poligon || poligon.length === 0) return { enYakin: null, enUzak: null };
  
  // En uzak nokta hala köşelerden biridir
  const koseMesafeleri = poligon.map((n) =>
    haversineMesafe(paratoner.lat, paratoner.lng, n.lat, n.lng)
  );
  const enUzak = Math.max(...koseMesafeleri);

  // En yakın mesafe için poligonun dış hat çizgisini (LineString) oluşturup kenar mesafesi alıyoruz
  const coords = poligon.map((n) => [n.lng, n.lat]);
  const ilk = coords[0];
  const son = coords[coords.length - 1];
  if (ilk[0] !== son[0] || ilk[1] !== son[1]) coords.push(ilk);
  
  const cizgi = turf.lineString(coords);
  const prNokta = turf.point([paratoner.lng, paratoner.lat]);
  
  // pointToLineDistance varsayılan olarak kilometre döner, 1000 ile çarpıp metre yapıyoruz
  const enYakin = turf.pointToLineDistance(prNokta, cizgi, { units: 'kilometers' }) * 1000;

  return { enYakin, enUzak };
}

/**
 * Bir dairesel koruma alanı (merkez + yarıçap) ile poligonun GERÇEK
 * geometrik kesişimini hesaplar. Turf.js circle + intersect kullanır.
 *
 * @param {{lat:number,lng:number}} merkez
 * @param {number} yaricapM metre
 * @param {{lat:number,lng:number}[]} poligon
 * @returns {{
 *   kesisimVarMi: boolean,
 *   tamamenIcinde: boolean,
 *   tamamenDisinda: boolean,
 *   kesisimGeoJSON: object|null,   // sadece kesişen kısım, harita çizimi için
 *   kesisimOrani: number           // 0-1, poligon alanının ne kadarı kapsanıyor
 * }}
 */
export function poligonDaireKesisimi(merkez, yaricapM, poligon) {
  if (!poligon || poligon.length < 3 || !yaricapM || yaricapM <= 0) {
    return { kesisimVarMi: false, tamamenIcinde: false, tamamenDisinda: true, kesisimGeoJSON: null, kesisimOrani: 0 };
  }

  const merkezNoktasi = turf.point([merkez.lng, merkez.lat]);
  const daire = turf.circle(merkezNoktasi, yaricapM, { units: 'meters', steps: 128 });
  const poligonFeature = poligonToTurf(poligon);

  let kesisim;
  try {
    kesisim = turf.intersect(turf.featureCollection([daire, poligonFeature]));
  } catch (e) {
    kesisim = null;
  }

  const poligonAlani = turf.area(poligonFeature);

  if (!kesisim) {
    return { kesisimVarMi: false, tamamenIcinde: false, tamamenDisinda: true, kesisimGeoJSON: null, kesisimOrani: 0 };
  }

  const kesisimAlani = turf.area(kesisim);
  const oran = poligonAlani > 0 ? kesisimAlani / poligonAlani : 0;

  return {
    kesisimVarMi: true,
    tamamenIcinde: oran > 0.999,
    tamamenDisinda: false,
    kesisimGeoJSON: kesisim,
    kesisimOrani: Math.min(oran, 1),
  };
}

/**
 * Bir yapı poligonunu, BİRDEN FAZLA paratonerin koruma dairesiyle
 * karşılaştırır ve şunları döner:
 *  - kapsananGeoJSON: tüm çemberlerin birleşiminin poligonla kesişimi
 *    (yapının koruma altındaki kısmı)
 *  - acikGeoJSON: poligonun, o birleşimin DIŞINDA kalan kısmı
 *    (yapının koruma DIŞINDA kalan, riskli kısmı)
 *  - tamamenKorunuyorMu: poligonun tamamı kapsanıyor mu
 *
 * @param {{merkez:{lat:number,lng:number}, yaricapM:number}[]} daireler
 * @param {{lat:number,lng:number}[]} poligon
 */
export function yapiKapsamaAnalizi(daireler, poligon) {
  if (!poligon || poligon.length < 3) {
    return { kapsananGeoJSON: null, acikGeoJSON: null, tamamenKorunuyorMu: false, hicKoruumaYokMu: true };
  }

  const poligonFeature = poligonToTurf(poligon);
  const gecerliDaireler = (daireler || []).filter((d) => d.yaricapM && d.yaricapM > 0);

  if (gecerliDaireler.length === 0) {
    return { kapsananGeoJSON: null, acikGeoJSON: poligonFeature, tamamenKorunuyorMu: false, hicKoruumaYokMu: true };
  }

  // Tüm çemberlerin birleşimini (union) al
  let birlesikDaire = null;
  try {
    const daireFeatures = gecerliDaireler.map((d) =>
      turf.circle(turf.point([d.merkez.lng, d.merkez.lat]), d.yaricapM, { units: 'meters', steps: 128 })
    );
    birlesikDaire = daireFeatures.length === 1
      ? daireFeatures[0]
      : daireFeatures.reduce((acc, f) => {
          try {
            return turf.union(turf.featureCollection([acc, f])) || acc;
          } catch (e) {
            return acc;
          }
        });
  } catch (e) {
    birlesikDaire = null;
  }

  if (!birlesikDaire) {
    return { kapsananGeoJSON: null, acikGeoJSON: poligonFeature, tamamenKorunuyorMu: false, hicKoruumaYokMu: true };
  }

  let kapsanan = null;
  let acik = null;
  let geometriHatasi = false;

  try {
    kapsanan = turf.intersect(turf.featureCollection([birlesikDaire, poligonFeature]));
  } catch (e) {
    kapsanan = null;
    geometriHatasi = true;
  }
  
  try {
    acik = turf.difference(turf.featureCollection([poligonFeature, birlesikDaire]));
  } catch (e) {
    acik = null;
    geometriHatasi = true;
  }

  if (geometriHatasi) {
    return {
      kapsananGeoJSON: null,
      acikGeoJSON: null,
      tamamenKorunuyorMu: false,
      hicKoruumaYokMu: false,
      kapsamaOrani: 0,
      geometriHatasi: true,
      mesaj: "Geometri motoru işlemi yapamadı (kendiyle kesişen çokgen vb. bir sorun olabilir)."
    };
  }

  const poligonAlani = turf.area(poligonFeature);
  const kapsananAlani = kapsanan ? turf.area(kapsanan) : 0;
  const oran = poligonAlani > 0 ? kapsananAlani / poligonAlani : 0;

  return {
    kapsananGeoJSON: kapsanan,
    acikGeoJSON: acik,
    tamamenKorunuyorMu: oran > 0.995 && !acik,
    hicKoruumaYokMu: oran === 0,
    kapsamaOrani: oran,
    geometriHatasi: false
  };
}
