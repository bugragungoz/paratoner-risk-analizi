// Telefonun konumu. Android'de Tauri konum eklentisi (Google Play hizmetlerinin birleşik konum
// sağlayıcısı: internet varsa ağ destekli ve daha hızlı, yoksa yalnızca GPS); tarayıcıda (geliştirme)
// W3C API.
//
// Konum arka planda alınır: okumalar gelirken yakalamaKarari() ne zaman kaydedileceğine karar verir.
//   Hızlı   ilk ±15 m (ya da 4 sn sonra ±30 m) okumada; en geç 12 sn'de eldeki en iyisi.
//   Hassas  en az 6 sn ve 3 okuma, ±10 m; en geç 20 sn'de eldeki en iyisi.
// En iyi doğruluğa yakın okumaların doğrulukla ağırlıklı ortalaması alınır. Bildirilen doğruluk en iyi
// tek okumanınkidir (ortalama rastgele sapmayı azaltır ama sistematik sapmayı gidermez; temkinli taraf).

import { tauriMi } from './platform';

export interface KonumOkumasi {
  lat: number;
  lng: number;
  /** m */
  dogruluk: number;
  zaman: number;
}

export type KonumModu = 'hizli' | 'hassas';

export type KonumHatasiKodu = 'IZIN' | 'YAKLASIK' | 'KAPALI' | 'DIGER';

export class KonumHatasi extends Error {
  constructor(
    public kod: KonumHatasiKodu,
    mesaj: string = kod,
  ) {
    super(mesaj);
  }
}

/** Okumaları birleştirir: en iyi doğruluğun 1,5 katı (en az +2 m) içindekiler, 1/d² ağırlıkla. */
export function okumalariBirlestir(okumalar: readonly KonumOkumasi[]): KonumOkumasi | null {
  const gecerli = okumalar.filter((o) => Number.isFinite(o.lat) && Number.isFinite(o.lng) && Number.isFinite(o.dogruluk) && o.dogruluk > 0);
  if (!gecerli.length) return null;
  const enIyi = Math.min(...gecerli.map((o) => o.dogruluk));
  const esik = Math.max(enIyi * 1.5, enIyi + 2);
  const secilen = gecerli.filter((o) => o.dogruluk <= esik);
  let t = 0;
  let lat = 0;
  let lng = 0;
  for (const o of secilen) {
    const w = 1 / Math.max(o.dogruluk, 1) ** 2;
    t += w;
    lat += w * o.lat;
    lng += w * o.lng;
  }
  return { lat: lat / t, lng: lng / t, dogruluk: enIyi, zaman: Math.max(...secilen.map((o) => o.zaman)) };
}

export type YakalamaKarari = { tur: 'bekle' } | { tur: 'tamam'; okuma: KonumOkumasi } | { tur: 'yok' };

export const YAKALAMA = {
  hizliIyi: 15,
  hizliOrta: 30,
  hizliOrtaSure: 4_000,
  hizliEnCok: 12_000,
  hassasSure: 6_000,
  hassasIyi: 10,
  hassasEnCok: 20_000,
  /** Bu süre içinde hiç okuma gelmezse konum alınamadı sayılır. */
  hicOkumaYok: 25_000,
} as const;

/** Okumalar ve geçen süreye göre: beklemeye devam, kaydet ya da vazgeç. */
export function yakalamaKarari(okumalar: readonly KonumOkumasi[], gecenMs: number, mod: KonumModu): YakalamaKarari {
  const b = okumalariBirlestir(okumalar);
  if (!b) return gecenMs >= YAKALAMA.hicOkumaYok ? { tur: 'yok' } : { tur: 'bekle' };
  const tamam = { tur: 'tamam', okuma: b } as const;
  if (mod === 'hizli') {
    if (b.dogruluk <= YAKALAMA.hizliIyi) return tamam;
    if (gecenMs >= YAKALAMA.hizliOrtaSure && b.dogruluk <= YAKALAMA.hizliOrta) return tamam;
    return gecenMs >= YAKALAMA.hizliEnCok ? tamam : { tur: 'bekle' };
  }
  if (gecenMs >= YAKALAMA.hassasSure && okumalar.length >= 3 && b.dogruluk <= YAKALAMA.hassasIyi) return tamam;
  return gecenMs >= YAKALAMA.hassasEnCok ? tamam : { tur: 'bekle' };
}

export type IzinDurumu = 'verildi' | 'yaklasik' | 'yok' | 'kapali' | 'bilinmiyor';

/** Konum izninin durumu (sormadan). */
export async function konumIzniDurumu(): Promise<IzinDurumu> {
  if (tauriMi()) {
    try {
      const { checkPermissions } = await import('@tauri-apps/plugin-geolocation');
      const d = await checkPermissions();
      return d.location === 'granted' ? 'verildi' : d.coarseLocation === 'granted' ? 'yaklasik' : 'yok';
    } catch {
      return 'kapali';
    }
  }
  try {
    const d = await navigator.permissions.query({ name: 'geolocation' });
    return d.state === 'granted' ? 'verildi' : d.state === 'denied' ? 'yok' : 'bilinmiyor';
  } catch {
    return 'bilinmiyor';
  }
}

/** Konum iznini ister (Android izin penceresi); sonuç durumunu döner. */
export async function konumIzniIste(): Promise<IzinDurumu> {
  if (tauriMi()) {
    try {
      const g = await import('@tauri-apps/plugin-geolocation');
      const d = await g.requestPermissions(['location']);
      return d.location === 'granted' ? 'verildi' : d.coarseLocation === 'granted' ? 'yaklasik' : 'yok';
    } catch {
      return 'kapali';
    }
  }
  return new Promise((coz) =>
    navigator.geolocation.getCurrentPosition(
      () => coz('verildi'),
      (e) => coz(e.code === e.PERMISSION_DENIED ? 'yok' : 'bilinmiyor'),
      { enableHighAccuracy: true, timeout: 10_000 },
    ),
  );
}

/** Telefonda konum okumaları arasındaki süre (ms). */
export const IZLEME_ARALIGI_MS = 1000;

/** Konum izlemeyi başlatır; durdurma işlevini döner. İzin yoksa ister. */
export async function konumIzle(okuma: (o: KonumOkumasi) => void, hata: (h: KonumHatasi) => void): Promise<() => void> {
  if (tauriMi()) {
    const g = await import('@tauri-apps/plugin-geolocation');
    let izin;
    try {
      izin = await g.checkPermissions();
      if (izin.location !== 'granted') izin = await g.requestPermissions(['location']);
    } catch (e) {
      // Eklenti, konum servisi kapalıyken izin sorgusunu reddeder.
      throw new KonumHatasi('KAPALI', String(e));
    }
    if (izin.location !== 'granted') throw new KonumHatasi(izin.coarseLocation === 'granted' ? 'YAKLASIK' : 'IZIN');
    let bitti = false;
    // Android eklentisi "timeout"u zaman aşımı olarak değil güncelleme aralığı olarak kullanır
    // (Fused LocationRequest aralığı ve en kısa aralık; kabul edilen en eski konum yaşı da bu kadar).
    // 20 sn verilince okumalar 20 sn'de bir geliyor ve 20 sn'lik eski konum kabul ediliyordu.
    const id = await g.watchPosition({ enableHighAccuracy: true, timeout: IZLEME_ARALIGI_MS, maximumAge: 0 }, (p, e) => {
      if (bitti) return;
      if (e || !p) return hata(new KonumHatasi(/disabled|off|kapal/i.test(String(e)) ? 'KAPALI' : 'DIGER', String(e)));
      okuma({ lat: p.coords.latitude, lng: p.coords.longitude, dogruluk: p.coords.accuracy, zaman: p.timestamp });
    });
    return () => {
      bitti = true;
      void g.clearWatch(id).catch(() => {});
    };
  }
  if (!('geolocation' in navigator)) throw new KonumHatasi('KAPALI');
  const id = navigator.geolocation.watchPosition(
    (p) => okuma({ lat: p.coords.latitude, lng: p.coords.longitude, dogruluk: p.coords.accuracy, zaman: p.timestamp }),
    (e) => hata(new KonumHatasi(e.code === e.PERMISSION_DENIED ? 'IZIN' : 'DIGER', e.message)),
    { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
