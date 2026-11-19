// Test projeleri: kanıt senaryosu ve tekrarlanabilir (tohumlu) rastgele projeler.
import { readFileSync } from 'node:fs';
import { STANDART_C } from './kaynaklar.js';

const KANIT_YOLU = new URL('./kanit_senaryosu.json', import.meta.url);

/** tests/veri/kanit_senaryosu.json (Depo-B, Silo-A, P1-P3). Her çağrıda yeni kopya döner. */
export function kanitSenaryosu({ deltaT, gizliParatonerler = [] } = {}) {
  const p = JSON.parse(readFileSync(KANIT_YOLU, 'utf8'));
  if (deltaT !== undefined) p.deltaT = deltaT;
  p.paratonerler.forEach((pr) => { if (gizliParatonerler.includes(pr.isim)) pr.gorunur_mu = false; });
  return p;
}

/**
 * Yerel metre koordinatlarıyla küçük test projesi kurar (Ankara civarı).
 * yapilar: { id, isim?, dikdortgen: [x0, y0, x1, y1] | koseler: [[x, y], ...], H, kot?, C?, ...ek }
 * paratonerler: { id, isim?, x, y, mast, kot?, yapi?, ...ek }
 */
export function yerelProje({ Nk = 30, deltaT = 60, kotlar = [['kot_0', 0]], yapilar = [], paratonerler = [] } = {}) {
  const LAT0 = 39.9, LNG0 = 32.8;
  // Metre → derece: GRS80 elipsoidinin LAT0'daki eğrilik yarıçaplarıyla (çekirdek elipsoit üzerinde ölçer).
  const a = 6378137, e2 = 0.00669438002290, rad = Math.PI / 180, s2 = Math.sin(LAT0 * rad) ** 2;
  const mLat = ((a * (1 - e2)) / (1 - e2 * s2) ** 1.5) * rad;
  const mLng = (a / Math.sqrt(1 - e2 * s2)) * Math.cos(LAT0 * rad) * rad;
  const nokta = (x, y) => ({ lat: LAT0 + y / mLat, lng: LNG0 + x / mLng });
  const C1 = { C1: 1, C2: 1, C3: 1, C4: 1, C5: 1 };
  return {
    id: 'proj_yerel', isim: 'Yerel test', olusturma_tarihi: '2026-10-25T00:00:00.000Z',
    Nk, deltaT, h_esikleri_varsayilan: [2, 3, 4, 5], parsel_siniri: null,
    kot_seviyeleri: kotlar.map(([id, h]) => ({ id, isim: id, taban_kottan_yukseklik_m: h })),
    yapilar: yapilar.map(({ id, isim, dikdortgen, koseler, H, kot = 'kot_0', C = C1, ...ek }) => {
      const [x0, y0, x1, y1] = dikdortgen ?? [];
      const kose = koseler ?? [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      return { id, isim: isim ?? id, poligon: kose.map(([x, y]) => nokta(x, y)), kot_seviyesi_id: kot, H_m: H, manuelBoyut: false, ...C, kritik_mi: false, gorunur_mu: true, ...ek };
    }),
    paratonerler: paratonerler.map(({ id, isim, x, y, mast, kot = 'kot_0', yapi = null, ...ek }) => ({
      id, isim: isim ?? id, ...nokta(x, y), kot_seviyesi_id: yapi ? null : kot, yapi_id: yapi, mast_yuksekligi_m: mast,
      aktif_mi: true, gorunur_mu: true, h_esikleri: [2, 3, 4, 5], ...ek,
    })),
  };
}

/** Tohumlu, tekrarlanabilir rastgele sayı üreteci (mulberry32). */
export function rastgeleUretec(tohum) {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Gerçekçi aralıklarda rastgele bir saha projesi üretir: 1-3 kot seviyesi,
 * 1-5 (döndürülmüş) dikdörtgen yapı, 1-5 paratoner (zeminde veya yapı üzerinde).
 * C değerleri yalnızca standart kümeden seçilir.
 */
export function rastgeleProje(tohum) {
  const r = rastgeleUretec(tohum);
  const aralik = (a, b) => a + (b - a) * r();
  const tam = (a, b) => Math.floor(aralik(a, b + 1));
  const sec = (dizi) => dizi[Math.floor(r() * dizi.length)];

  const lat0 = aralik(36.5, 41.5), lng0 = aralik(27, 44);
  const mLat = 111320, mLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const nokta = (x, y) => ({ lat: lat0 + y / mLat, lng: lng0 + x / mLng });

  const kotlar = [{ id: 'kot_0', isim: 'Zemin', taban_kottan_yukseklik_m: 0, aciklama: '' }];
  const kotSayisi = tam(1, 3);
  for (let i = 1; i < kotSayisi; i++) {
    kotlar.push({ id: `kot_${i}`, isim: `Kot-${i}`, taban_kottan_yukseklik_m: Math.round(aralik(0.5, 12) * 10) / 10, aciklama: '' });
  }

  const yapilar = [];
  const yapiSayisi = tam(1, 5);
  for (let i = 0; i < yapiSayisi; i++) {
    const cx = aralik(-150, 150), cy = aralik(-150, 150);
    const L = aralik(5, 150), W = aralik(5, 60), aci = aralik(0, Math.PI);
    const koseler = [[-L / 2, -W / 2], [L / 2, -W / 2], [L / 2, W / 2], [-L / 2, W / 2]].map(([x, y]) =>
      nokta(cx + x * Math.cos(aci) - y * Math.sin(aci), cy + x * Math.sin(aci) + y * Math.cos(aci)));
    yapilar.push({
      id: `yp_${i}`, isim: `Yapı-${i}`, tip: 'diger', poligon: koseler, kot_seviyesi_id: sec(kotlar).id,
      H_m: Math.round(aralik(3, 30) * 10) / 10, L_m: Math.round(L * 10) / 10, W_m: Math.round(W * 10) / 10,
      manuelBoyut: r() < 0.2,
      C1: sec(STANDART_C.C1), C2: sec(STANDART_C.C2), C3: sec(STANDART_C.C3), C4: sec(STANDART_C.C4), C5: sec(STANDART_C.C5),
      kritik_mi: false, gorunur_mu: true,
    });
  }

  const paratonerler = [];
  const paratonerSayisi = tam(1, 5);
  for (let i = 0; i < paratonerSayisi; i++) {
    const yapiUstunde = r() < 0.3;
    const yapi = sec(yapilar);
    const konum = yapiUstunde ? yapi.poligon[0] : nokta(aralik(-200, 200), aralik(-200, 200));
    paratonerler.push({
      id: `pr_${i}`, isim: `P${i + 1}`, lat: konum.lat, lng: konum.lng,
      kot_seviyesi_id: yapiUstunde ? null : sec(kotlar).id, yapi_id: yapiUstunde ? yapi.id : null,
      mast_yuksekligi_m: Math.round(aralik(2, 20) * 10) / 10,
      aktif_mi: true, h_esikleri: [2, 3, 4, 5], gorunur_mu: r() < 0.9,
    });
  }

  return {
    id: `proj_rastgele_${tohum}`, isim: `Rastgele ${tohum}`, olusturma_tarihi: '2026-10-25T00:00:00.000Z',
    harita_merkez_lat: lat0, harita_merkez_lng: lng0, harita_zoom: 17,
    Nk: tam(5, 80), deltaT: sec([30, 45, 60]), h_esikleri_varsayilan: [2, 3, 4, 5], parsel_siniri: null,
    kot_seviyeleri: kotlar, yapilar, paratonerler,
  };
}
