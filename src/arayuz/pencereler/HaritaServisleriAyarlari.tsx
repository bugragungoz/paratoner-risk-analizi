// Ayarlar > Harita servisleri: Google ve Esri anahtarlarının girilmesi, denenmesi, silinmesi ve
// kurulum kılavuzu. Kaydedilen anahtar bir daha gösterilmez; yalnızca "kayıtlı" durumu görünür.

import { useState } from 'react';
import { useProje } from '../durum/ProjeSaglayici';
import { anahtarDene, anahtarKaydet, anahtarSil, type Saglayici } from '../harita/servisler';
import { useEtkilesim } from '../ortak/Etkilesim';
import { disBaglantiAc, tauriMi } from '../platform/tauri';

const KILAVUZ_TARIHI = 'Kasım 2026';

const BILGI: Record<Saglayici, { ad: string; acilim: string; katmanlar: string }> = {
  google: { ad: 'Google Maps Platform', acilim: 'Uydu, hibrit ve yol haritası; yazarken adres/işletme önerisi; uygulama içinde Street View.', katmanlar: 'Map Tiles API · Places API (New) · Maps Embed API' },
  esri: { ad: 'Esri ArcGIS Location Platform', acilim: 'Esri World Imagery uydu görüntüsü.', katmanlar: 'Static basemap tiles yetkisi' },
};

function AnahtarKarti({ saglayici }: { saglayici: Saglayici }) {
  const { haritaAnahtarlari, haritaAnahtarlariYenile } = useProje();
  const { bildir, onayla } = useEtkilesim();
  const [deger, setDeger] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [sonuc, setSonuc] = useState<{ tamam: boolean; metin: string } | null>(null);
  const kayitli = haritaAnahtarlari[saglayici];
  const b = BILGI[saglayici];

  async function calistir(is: () => Promise<void>) {
    setMesgul(true);
    try {
      await is();
    } finally {
      setMesgul(false);
    }
  }

  const dene = () =>
    calistir(async () => {
      try {
        setSonuc({ tamam: true, metin: await anahtarDene(saglayici) });
      } catch (e) {
        setSonuc({ tamam: false, metin: e instanceof Error ? e.message : String(e) });
      }
    });

  const kaydet = () =>
    calistir(async () => {
      try {
        await anahtarKaydet(saglayici, deger);
        setDeger('');
        await haritaAnahtarlariYenile();
        bildir(`${b.ad} anahtarı Windows kimlik deposuna kaydedildi.`, 'basari');
        try {
          setSonuc({ tamam: true, metin: await anahtarDene(saglayici) });
        } catch (e) {
          setSonuc({ tamam: false, metin: e instanceof Error ? e.message : String(e) });
        }
      } catch (e) {
        bildir(e instanceof Error ? e.message : String(e), 'hata');
      }
    });

  const sil = () =>
    calistir(async () => {
      if (!(await onayla({ baslik: 'Anahtarı sil', aciklama: `${b.ad} anahtarı bu bilgisayardan silinsin mi? Google Cloud ya da Esri hesabınızdaki anahtar silinmez.`, onayEtiketi: 'Sil', tehlikeli: true }))) return;
      try {
        await anahtarSil(saglayici);
        await haritaAnahtarlariYenile();
        setSonuc(null);
      } catch (e) {
        bildir(e instanceof Error ? e.message : String(e), 'hata');
      }
    });

  return (
    <div className="servis-karti">
      <div className="servis-karti-baslik">
        <b>{b.ad}</b>
        <span className={kayitli ? 'kayit-etiketi servis-kayitli' : 'kayit-etiketi'}>{kayitli ? 'Anahtar kayıtlı' : 'Anahtar yok'}</span>
      </div>
      <p className="kart-metni">{b.acilim}</p>
      <p className="kart-metni ipucu-kucuk">Gerekenler: {b.katmanlar}</p>
      <div className="servis-anahtar-satir">
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={deger}
          onChange={(e) => setDeger(e.target.value)}
          placeholder={kayitli ? 'Yeni anahtarla değiştir' : 'Anahtarı yapıştırın'}
          aria-label={`${b.ad} anahtarı`}
        />
        <button className="buton-birincil" onClick={kaydet} disabled={mesgul || deger.trim().length < 20}>
          Kaydet
        </button>
        <button onClick={dene} disabled={mesgul || !kayitli}>
          Dene
        </button>
        <button className="ui-buton-tehlike" onClick={sil} disabled={mesgul || !kayitli}>
          Sil
        </button>
      </div>
      {sonuc && <div className={sonuc.tamam ? 'servis-sonuc tamam' : 'servis-sonuc hata'}>{sonuc.metin}</div>}
    </div>
  );
}

function Baglanti({ url, children }: { url: string; children: string }) {
  return (
    <button type="button" className="baglanti-buton" onClick={() => disBaglantiAc(url)}>
      {children}
    </button>
  );
}

function Kilavuz() {
  return (
    <div className="kilavuz">
      <details className="kilavuz-bolum">
        <summary>Google Maps Platform anahtarı nasıl alınır?</summary>
        <ol>
          <li>
            <Baglanti url="https://console.cloud.google.com/">Google Cloud Console</Baglanti>'da yeni bir proje oluşturun (ör. "paratoner").
          </li>
          <li>
            Projeye bir <b>faturalandırma hesabı</b> bağlayın. Google Maps Platform servisleri faturalandırma açık olmadan çalışmaz. Aylık ücretsiz kullanım bu program için genellikle yeterlidir: Map Tiles
            (2D) 100.000 karo, Places öneri ve konum 10.000 istek; Maps Embed (Street View) sınırsız ücretsiz. Güncel fiyatlar:{' '}
            <Baglanti url="https://developers.google.com/maps/billing-and-pricing/pricing">Google Maps Platform fiyatları</Baglanti>.
          </li>
          <li>
            Şu üç API'yi <b>etkinleştirin</b> (Google Maps Platform &gt; APIs ya da APIs &amp; Services &gt; Library): <b>Map Tiles API</b>, <b>Places API (New)</b>, <b>Maps Embed API</b>. Eski "Places
            API" değil, "(New)" yazanı seçin. Etkinleşmesi birkaç dakika sürebilir.
          </li>
          <li>
            <b>Anahtar oluşturun:</b> Google Maps Platform &gt; Keys &amp; Credentials &gt; Create credentials &gt; API key.
          </li>
          <li>
            <b>API kısıtlaması (zorunlu):</b> anahtarı düzenleyin, API restrictions &gt; Restrict key, yalnızca yukarıdaki üç API'yi seçip kaydedin. Böylece anahtar başka bir Google servisi için
            kullanılamaz.
          </li>
          <li>
            <b>Uygulama kısıtlaması:</b> Google'ın sunduğu türler (Websites, IP addresses, Android apps, iOS apps) masaüstü programa uymuyor; "None" bırakın. Anahtar yalnızca bu bilgisayarın Windows
            kimlik deposunda saklanır, proje dosyalarına ve raporlara yazılmaz. Bunun yerine aşağıdaki kota sınırını mutlaka koyun.
          </li>
          <li>
            <b>Günlük kota (harcama sınırı gibi):</b> Google Maps Platform &gt; Quotas, API'yi ve günlük kotayı seçip Edit ile düşürün (ör. Map Tiles API için günde 3.000 karo). Kota dolunca o gün istekler
            durur; gece yarısı (Pasifik saati) sıfırlanır. Ayrıca Billing &gt; Budgets &amp; alerts ile bütçe uyarısı kurun (uyarı harcamayı durdurmaz, yalnızca haber verir).
          </li>
          <li>Anahtarı aşağıdaki Google kartına yapıştırıp Kaydet'e basın; program anahtarı hemen dener.</li>
        </ol>
        <p className="ipucu-kucuk">
          Google'ın uyarısı: kısıtlanmamış bir anahtarın kötüye kullanılmasından doğan ücretlerden hesap sahibi sorumludur. Anahtarı kimseyle paylaşmayın; sızdığından şüphelenirseniz Console'da yeniden
          oluşturup programa yenisini girin.
        </p>
      </details>

      <details className="kilavuz-bolum">
        <summary>Esri ArcGIS Location Platform anahtarı nasıl alınır?</summary>
        <ol>
          <li>
            <Baglanti url="https://location.arcgis.com/sign-up/">ArcGIS Location Platform</Baglanti> için ücretsiz hesap açın.
          </li>
          <li>Panoda yeni bir API anahtarı oluşturun (Content &gt; New item &gt; Developer credentials &gt; API key credentials; Esri menü adlarını zaman zaman değiştiriyor).</li>
          <li>
            Yetki olarak yalnızca <b>Location services &gt; Basemaps &gt; Static basemap tiles</b> seçin.
          </li>
          <li>Son kullanma tarihini belirleyin. Esri API anahtarları en fazla bir yıl geçerlidir; süre dolunca yeni anahtar oluşturup programa girin.</li>
          <li>
            Ücretsiz kullanım ayda 2 milyon karodur; sonrası 1.000 karo başına 0,15 $. Güncel bilgi: <Baglanti url="https://location.arcgis.com/pricing/">Location Platform fiyatları</Baglanti>.
          </li>
          <li>Anahtarı aşağıdaki Esri kartına yapıştırıp Kaydet'e basın.</li>
        </ol>
      </details>

      <details className="kilavuz-bolum">
        <summary>Kurallar: neden çevrimdışı harita ve indirme yok?</summary>
        <ul>
          <li>Google, Map Tiles API karolarının önceden indirilmesini, saklanmasını ve çevrimdışı kullanılmasını yasaklıyor; haritada "Google Maps" ve görünen alanın telif metni gösterilmeli.</li>
          <li>Esri, dışa aktarılan görüntülerin yalnızca kendi yazılımlarında çevrimdışı kullanılmasına izin veriyor; haritada "Powered by Esri" ve kaynak atfı gösterilir.</li>
          <li>OpenStreetMap karoları anahtarsız kullanılabilir ama toplu indirme yasak; program her karoyu yalnızca görüntülendiğinde ve uygulama kimliğiyle ister.</li>
          <li>Anahtar girilmezse yalnızca OpenStreetMap yol haritası görünür; arama OpenStreetMap ile ve yalnızca Enter'a basınca yapılır.</li>
        </ul>
      </details>
      <p className="ipucu-kucuk">Kılavuz {KILAVUZ_TARIHI}'te Google ve Esri belgelerine göre hazırlandı; konsol menü adları zamanla değişebilir.</p>
    </div>
  );
}

export function HaritaServisleriAyarlari() {
  if (!tauriMi()) {
    return <p className="ipucu">Harita servisi anahtarları yalnızca masaüstü uygulamasında girilebilir (Windows kimlik deposunda saklanır). Tarayıcıda yalnızca OpenStreetMap kullanılır.</p>;
  }
  return (
    <div className="form-dikey">
      <p className="ipucu-kucuk">Program hiçbir harita anahtarı içermez. Kendi anahtarınızı girersiniz; kullanım ve faturalandırma sizin Google ya da Esri hesabınızdadır.</p>
      <AnahtarKarti saglayici="google" />
      <AnahtarKarti saglayici="esri" />
      <Kilavuz />
    </div>
  );
}
