// Paratoner Risk Analizi — hesap çekirdeği veri tipleri.
// Alan adları, eski (v5) proje dosyalarıyla uyumlu kalacak şekilde korunmuştur.

export interface LatLng {
  lat: number;
  lng: number;
}

/** Koruma seviyesi sütunu (NF C 17-102): I en sıkı, IV en gevşek. */
export type Seviye = 'I' | 'II' | 'III' | 'IV';

export type DeltaTModu = 'proje' | 'paratoner';

export interface KotSeviyesi {
  id: string;
  isim: string;
  /** Proje referans kotundan (en düşük nokta = 0) yükseklik, metre. */
  taban_kottan_yukseklik_m: number;
  aciklama?: string;
}

export interface Paratoner {
  id: string;
  isim: string;
  lat: number;
  lng: number;
  /** Paratoner zemindeyse bağlı olduğu kot. `yapi_id` doluysa kullanılmaz. */
  kot_seviyesi_id: string | null;
  /** Paratoner bir yapının çatısındaysa o yapının kimliği. */
  yapi_id: string | null;
  /** Taban referansından (kot ya da yapı çatısı) paratoner ucuna yükseklik, metre. */
  mast_yuksekligi_m: number;
  /** `false` ise paratoner devre dışıdır ve HİÇBİR hesaba girmez. Alan yoksa etkin sayılır. */
  aktif_mi?: boolean;
  /** Yalnızca görsel (haritada gizle/göster). Hesabı ETKİLEMEZ. */
  gorunur_mu?: boolean;
  /** Haritada çizilecek referans çemberlerinin h değerleri (yalnızca görsel). */
  h_esikleri: number[];
  /**
   * Paratonere özel ΔT (µs). Yalnızca projede `deltaT_modu = 'paratoner'` iken kullanılır;
   * `null`/yoksa projenin ΔT değerine düşer.
   */
  deltaT?: number | null;
  /** Cihaz (marka / model). Boşsa projenin cihaz bilgisi kullanılır. Yalnızca raporda gösterilir. */
  cihaz?: string;
}

/** C2 matrisi için yapı ve çatı malzemesi. */
export type Malzeme = 'metal' | 'normal' | 'yanici';

export interface C2Secimi {
  yapi: Malzeme;
  cati: Malzeme;
}

export interface Yapi {
  id: string;
  isim: string;
  tip?: string;
  poligon: LatLng[];
  kot_seviyesi_id: string;
  /** Yapı yüksekliği (kot seviyesinden çatıya), metre. */
  H_m: number | null;
  L_m?: number | null;
  W_m?: number | null;
  /** `true` ise Ae, poligon yerine L × W dikdörtgeninden hesaplanır. */
  manuelBoyut?: boolean;
  C1: number | null;
  C2: number | null;
  C3: number | null;
  C4: number | null;
  C5: number | null;
  /** C2'nin hangi yapı/çatı birleşiminden seçildiği (yeni projelerde). */
  C2_secim?: C2Secimi | null;
  kritik_mi?: boolean;
  gorunur_mu?: boolean;
}

/** Rapor revizyon tablosunun bir satırı. */
export interface Revizyon {
  no: string;
  tarih: string;
  aciklama: string;
}

export interface Proje {
  id: string;
  isim: string;
  olusturma_tarihi: string;
  harita_merkez_lat?: number;
  harita_merkez_lng?: number;
  harita_zoom?: number;
  /** Yıldırımlı gün sayısı (Td/Nk). Girilmeden hesap yapılmaz. */
  Nk: number | null;
  /** Proje ΔT (µs). Girilmeden (paratoner modunda paratonerde de yoksa) hesap yapılmaz. */
  deltaT: number | null;
  /**
   * 'proje' (varsayılan): bütün paratonerler projenin ΔT'sini kullanır.
   * 'paratoner': her paratoner kendi ΔT'sini kullanır (yoksa projenin ΔT'sine düşer).
   */
  deltaT_modu?: DeltaTModu;
  /** Rapor kapağında kullanılan tesis adresi. */
  tesis_adresi?: string;
  /** Paratonerlerin varsayılan cihazı (marka / model); raporda gösterilir. */
  cihaz?: string;
  /** Rapor numarası (kapak ve sayfa üstü). */
  rapor_no?: string;
  /** Rapor revizyonları, eskiden yeniye. */
  revizyonlar?: Revizyon[];
  /**
   * Eski (v5) projeden aktarıldı ve ΔT 60 µs idi: v5 bu değeri kendiliğinden atadığı için kullanıcının
   * seçip seçmediği bilinmiyor. Kullanıcı ΔT'yi onaylayana kadar hesap yapılmaz.
   */
  deltaT_onay_gerekli?: boolean;
  h_esikleri_varsayilan: number[];
  /**
   * DXF yerel koordinatlarının başlangıç noktası (0, 0). İlk yerel DXF çıktısında belirlenir ve
   * saklanır; böylece sonradan öğe eklense de yeni çıktı eskisiyle üst üste gelir. Hesabı etkilemez.
   */
  yerel_orijin?: LatLng | null;
  parsel_siniri: LatLng[] | null;
  kot_seviyeleri: KotSeviyesi[];
  paratonerler: Paratoner[];
  yapilar: Yapi[];
}
