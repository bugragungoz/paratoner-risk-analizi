// Bu uygulama Buğra Güngöz tarafından hazırlanmıştır.
// GitHub: https://github.com/bugragungoz

// Paratoner Analiz Uygulaması — Veri Modeli

/**
 * @typedef {Object} KotSeviyesi
 * @property {string} id
 * @property {string} isim
 * @property {number} taban_kottan_yukseklik_m
 * @property {string} [aciklama]
 */

/**
 * @typedef {Object} Paratoner
 * @property {string} id
 * @property {string} isim
 * @property {number} lat
 * @property {number} lng
 * @property {string|null} kot_seviyesi_id   // yapi_id doluysa kullanılmaz
 * @property {string|null} yapi_id           // bu paratoner bir yapının üzerindeyse o yapının id'si
 * @property {number} mast_yuksekligi_m      // taban referansından (kot seviyesi ya da yapı çatısı) itibaren
 * @property {boolean} aktif_mi
 * @property {number[]} h_esikleri
 * @property {boolean} gorunur_mu            // katman göster/gizle
 */

/**
 * @typedef {Object} Yapi
 * @property {string} id
 * @property {string} isim
 * @property {string} tip
 * @property {{lat:number, lng:number}[]} poligon
 * @property {string} kot_seviyesi_id
 * @property {number} H_m
 * @property {number} L_m   // poligondan otomatik türetilir, override edilebilir (bilgi amaçlı)
 * @property {number} W_m
 * @property {number} C1
 * @property {number} C2
 * @property {number} C3
 * @property {number} C4
 * @property {number} C5
 * @property {boolean} kritik_mi
 * @property {boolean} gorunur_mu
 */

/**
 * @typedef {Object} Proje
 * @property {string} id
 * @property {string} isim
 * @property {string} olusturma_tarihi
 * @property {number} harita_merkez_lat
 * @property {number} harita_merkez_lng
 * @property {number} harita_zoom
 * @property {number} Nk
 * @property {30|45|60} deltaT ESE tablosu yayılım süresi (paratoner datasheet'inden)
 * @property {number[]} h_esikleri_varsayilan
 * @property {{lat:number,lng:number}[]|null} parsel_siniri
 * @property {KotSeviyesi[]} kot_seviyeleri
 * @property {Paratoner[]} paratonerler
 * @property {Yapi[]} yapilar
 */

export const YAPI_TIPLERI = [
  { deger: 'kumes', etiket: 'Kümes' },
  { deger: 'silo', etiket: 'Silo' },
  { deger: 'idari_bina', etiket: 'İdari Bina' },
  { deger: 'lojman', etiket: 'Lojman' },
  { deger: 'depo', etiket: 'Depo' },
  { deger: 'su_deposu', etiket: 'Su Deposu' },
  { deger: 'tank', etiket: 'Tank' },
  { deger: 'jenerator_odasi', etiket: 'Jeneratör Odası' },
  { deger: 'diger', etiket: 'Diğer' },
];

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function yeniProje(isim = 'Yeni Proje') {
  return {
    id: uid('proj'),
    isim,
    olusturma_tarihi: new Date().toISOString(),
    // Yeni/boş proje: Türkiye geneli hafif zoom ile başlar — kullanıcı
    // arama kutusuyla ya da elle zoom/pan ile istediği yere gider.
    harita_merkez_lat: 39.0,
    harita_merkez_lng: 35.2,
    harita_zoom: 6,
    Nk: null,
    deltaT: 60,
    h_esikleri_varsayilan: [2, 3, 4, 5],
    parsel_siniri: null,
    kot_seviyeleri: [],
    paratonerler: [],
    yapilar: [],
  };
}

export function yeniKotSeviyesi(isim, taban_kottan_yukseklik_m, aciklama = '') {
  return {
    id: uid('kot'),
    isim,
    taban_kottan_yukseklik_m: Number(taban_kottan_yukseklik_m),
    aciklama,
  };
}

export function yeniParatoner({ isim, lat, lng, kot_seviyesi_id, yapi_id, mast_yuksekligi_m, h_esikleri }) {
  return {
    id: uid('pr'),
    isim,
    lat,
    lng,
    kot_seviyesi_id: yapi_id ? null : kot_seviyesi_id,
    yapi_id: yapi_id || null,
    mast_yuksekligi_m: Number(mast_yuksekligi_m),
    aktif_mi: true,
    h_esikleri: h_esikleri && h_esikleri.length ? h_esikleri : [2, 3, 4, 5],
    gorunur_mu: true,
  };
}

// Poligonun kaba L/W tahmini: bounding box köşegenlerinden.
// Sadece BİLGİ amaçlı gösterim içindir (gerçek hesap Ae'den, poligon
// alanı/çevresinden gelir) — kullanıcı isterse elle override eder.
function poligondenLW(poligon) {
  if (!poligon || poligon.length < 3) return { L: 0, W: 0 };
  const lats = poligon.map((n) => n.lat);
  const lngs = poligon.map((n) => n.lng);
  const latOrtalama = (Math.min(...lats) + Math.max(...lats)) / 2;
  const metrePerDegLat = 111320;
  const metrePerDegLng = 111320 * Math.cos((latOrtalama * Math.PI) / 180);
  const L = (Math.max(...lats) - Math.min(...lats)) * metrePerDegLat;
  const W = (Math.max(...lngs) - Math.min(...lngs)) * metrePerDegLng;
  return { L: Math.round(L * 10) / 10, W: Math.round(W * 10) / 10 };
}

export function yeniYapi({ isim, poligon, kot_seviyesi_id, H_m, L_m, W_m, manuelBoyut, C1, C2, C3, C4, C5 }) {
  const otomatikLW = poligondenLW(poligon);
  return {
    id: uid('yp'),
    isim,
    poligon,
    kot_seviyesi_id,
    H_m: (H_m !== undefined && H_m !== '') ? Number(H_m) : null,
    L_m: L_m !== undefined && L_m !== '' ? Number(L_m) : otomatikLW.L,
    W_m: W_m !== undefined && W_m !== '' ? Number(W_m) : otomatikLW.W,
    manuelBoyut: manuelBoyut || false, // Varsayılan olarak poligondan hesaplanır
    C1: C1 ?? null,
    C2: C2 ?? null,
    C3: C3 ?? null,
    C4: C4 ?? null,
    C5: C5 ?? null,
    kritik_mi: false,
    gorunur_mu: true,
  };
}

export const YAPI_TIPI_VARSAYILAN = {
  kumes: { C1: 0.25, C2: 1, C3: 2, C4: 0.5, C5: 5, gerekce: 'Çevresi benzer/yüksek yapılarla çevrili; metal çatı/tuğla gövde; personelsiz; ticari değer' },
  silo: { C1: 2, C2: 0.5, C3: 1, C4: 0.5, C5: 5, gerekce: 'Sahanın en yüksek noktalarından; metal yapı; personelsiz' },
  idari_bina: { C1: 0.25, C2: 1, C3: 1, C4: 1, C5: 5, gerekce: 'Normal doluluk, normal değer' },
  lojman: { C1: 0.5, C2: 1, C3: 1, C4: 1, C5: 10, gerekce: 'İnsan barınan yapı; sahada önemli' },
  depo: { C1: 0.25, C2: 1, C3: 2, C4: 0.5, C5: 5, gerekce: 'Metal/tuğla yapı, personelsiz, orta değer' },
  su_deposu: { C1: 2, C2: 1, C3: 1, C4: 0.5, C5: 1, gerekce: 'Yüksek konumlu ama sürekli kullanımı/çevresel değeri düşük' },
  tank: { C1: 0.25, C2: 0.5, C3: 3, C4: 0.5, C5: 10, gerekce: 'Metal yapı, içerik riski daha yüksek (C3=3), personelsiz' },
  jenerator_odasi: { C1: 0.25, C2: 0.5, C3: 3, C4: 0.5, C5: 10, gerekce: 'Metal yapı, içerik riski daha yüksek (C3=3), personelsiz' },
  diger: { C1: 1, C2: 1, C3: 1, C4: 1, C5: 1, gerekce: 'Varsayılan değerler — gözden geçirilmelidir' },
};

// NF C 17-102 esaslı risk analizinde C1-C5 katsayılarının alabileceği
// GEÇERLİ AYRIK DEĞERLER. Serbest sayı girişi yerine dropdown ile
// seçim için kullanılır — kullanıcının "tabloda olmayan değer de
// girilebiliyor" geri bildirimine karşılık.
export const C_KATSAYI_SECENEKLERI = {
  C1: [
    { deger: 0.25, etiket: '0.25 — Diğer yapılarla çevrili / ağaçlarla çevrili' },
    { deger: 0.5, etiket: '0.5 — Benzer yükseklikte yapılarla çevrili' },
    { deger: 1, etiket: '1 — Etrafında yalnız (yakında başka yapı yok)' },
    { deger: 2, etiket: '2 — Tepede, etrafında başka yapı yok' },
  ],
  C2: [
    { deger: 0.5, etiket: '0.5 — Metal çatı' },
    { deger: 1, etiket: '1 — Tuğla/beton/kâgir çatı' },
    { deger: 1.5, etiket: '1.5 — Ahşap çatı, kirişli' },
    { deger: 2, etiket: '2 — Kolay tutuşabilir malzeme' },
    { deger: 3, etiket: '3 — Yanıcı çatı (saman/kamış vb.)' },
  ],
  C3: [
    { deger: 0.5, etiket: '0.5 — Değersiz, yanmaz içerik' },
    { deger: 1, etiket: '1 — Normal içerik, orta yanıcılık' },
    { deger: 2, etiket: '2 — Yüksek yangın riski taşıyan içerik' },
    { deger: 3, etiket: '3 — Özellikle yanıcı/patlayıcı içerik' },
  ],
  C4: [
    { deger: 0.5, etiket: '0.5 — Personelsiz / boş yapı' },
    { deger: 1, etiket: '1 — Normal doluluk' },
    { deger: 2, etiket: '2 — Kalabalık kullanım' },
    { deger: 3, etiket: '3 — Tahliyesi zor / panik riski yüksek' },
  ],
  C5: [
    { deger: 1, etiket: '1 — Önemsiz, sürekli kullanılmayan' },
    { deger: 2, etiket: '2 — Düşük önem' },
    { deger: 5, etiket: '5 — Orta önem, ticari/üretim değeri var' },
    { deger: 10, etiket: '10 — Kritik önem (insan barınan, kesintisiz hizmet vb.)' },
  ],
};

