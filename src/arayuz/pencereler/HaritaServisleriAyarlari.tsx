// Ayarlar > Harita servisleri: Google ve Esri anahtarlarının girilmesi, denenmesi, silinmesi ve
// kurulum kılavuzu. Kaydedilen anahtar bir daha gösterilmez; yalnızca "kayıtlı" durumu görünür.
// Kılavuzun bağlantılı ve vurgulu metni dile göre iki ayrı bileşendir (KilavuzTr / KilavuzEn).

import { useState } from 'react';
import { useProje } from '../durum/ProjeSaglayici';
import { anahtarDene, anahtarKaydet, anahtarSil, type Saglayici } from '../harita/servisler';
import { useEtkilesim } from '../ortak/Etkilesim';
import { useMetinler } from '../ortak/useMetinler';
import { disBaglantiAc, tauriMi } from '../platform/tauri';

const AD: Record<Saglayici, string> = { google: 'Google Maps Platform', esri: 'Esri ArcGIS Location Platform' };
const GOOGLE_KATMANLARI = 'Map Tiles API · Places API (New) · Maps Embed API';

function AnahtarKarti({ saglayici }: { saglayici: Saglayici }) {
  const { haritaAnahtarlari, haritaAnahtarlariYenile } = useProje();
  const { bildir, onayla } = useEtkilesim();
  const m = useMetinler();
  const t = m.servisler;
  const [deger, setDeger] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [sonuc, setSonuc] = useState<{ tamam: boolean; metin: string } | null>(null);
  const kayitli = haritaAnahtarlari[saglayici];
  const ad = AD[saglayici];
  const acilim = saglayici === 'google' ? t.googleAcilim : t.esriAcilim;
  const katmanlar = saglayici === 'google' ? GOOGLE_KATMANLARI : t.esriKatmanlar;

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
        bildir(t.kaydedildi(ad), 'basari');
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
      if (!(await onayla({ baslik: t.silBaslik, aciklama: t.silAciklama(ad), onayEtiketi: m.genel.sil, tehlikeli: true }))) return;
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
        <b>{ad}</b>
        <span className={kayitli ? 'kayit-etiketi servis-kayitli' : 'kayit-etiketi'}>{kayitli ? t.kayitli : t.yok}</span>
      </div>
      <p className="kart-metni">{acilim}</p>
      <p className="kart-metni ipucu-kucuk">{t.gerekenler(katmanlar)}</p>
      <div className="servis-anahtar-satir">
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={deger}
          onChange={(e) => setDeger(e.target.value)}
          placeholder={kayitli ? t.degistir : t.yapistir}
          aria-label={t.anahtar(ad)}
        />
        <button className="buton-birincil" onClick={kaydet} disabled={mesgul || deger.trim().length < 20}>
          {m.genel.kaydet}
        </button>
        <button onClick={dene} disabled={mesgul || !kayitli}>
          {m.genel.dene}
        </button>
        <button className="ui-buton-tehlike" onClick={sil} disabled={mesgul || !kayitli}>
          {m.genel.sil}
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

function KilavuzTr() {
  return (
    <>
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
    </>
  );
}

function KilavuzEn() {
  return (
    <>
      <details className="kilavuz-bolum">
        <summary>How do I get a Google Maps Platform key?</summary>
        <ol>
          <li>
            Create a new project (e.g. "paratoner") in the <Baglanti url="https://console.cloud.google.com/">Google Cloud Console</Baglanti>.
          </li>
          <li>
            Link a <b>billing account</b> to the project. Google Maps Platform services do not work without billing enabled. The monthly free usage is usually enough for this program: Map Tiles (2D)
            100,000 tiles, Places autocomplete and details 10,000 requests; Maps Embed (Street View) is free without limit. Current prices:{' '}
            <Baglanti url="https://developers.google.com/maps/billing-and-pricing/pricing">Google Maps Platform pricing</Baglanti>.
          </li>
          <li>
            <b>Enable</b> these three APIs (Google Maps Platform &gt; APIs, or APIs &amp; Services &gt; Library): <b>Map Tiles API</b>, <b>Places API (New)</b>, <b>Maps Embed API</b>. Choose the one marked
            "(New)", not the legacy "Places API". Activation can take a few minutes.
          </li>
          <li>
            <b>Create a key:</b> Google Maps Platform &gt; Keys &amp; Credentials &gt; Create credentials &gt; API key.
          </li>
          <li>
            <b>API restriction (required):</b> edit the key, choose API restrictions &gt; Restrict key, select only the three APIs above and save. The key then cannot be used for any other Google
            service.
          </li>
          <li>
            <b>Application restriction:</b> the types Google offers (Websites, IP addresses, Android apps, iOS apps) do not fit a desktop program; leave it at "None". The key is stored only in the Windows
            credential store of this computer and is never written to project files or reports. Set the quota limit below instead.
          </li>
          <li>
            <b>Daily quota (works like a spending cap):</b> in Google Maps Platform &gt; Quotas, select the API and its daily quota and lower it with Edit (e.g. 3,000 tiles per day for the Map Tiles API).
            When the quota is used up, requests stop for the day; it resets at midnight Pacific time. Also set up a budget alert under Billing &gt; Budgets &amp; alerts (an alert does not stop spending, it
            only notifies you).
          </li>
          <li>Paste the key into the Google card below and press Save; the program tests the key straight away.</li>
        </ol>
        <p className="ipucu-kucuk">
          Google's warning: the account owner is responsible for charges arising from misuse of an unrestricted key. Do not share the key with anyone; if you suspect it has leaked, regenerate it in the
          Console and enter the new one in the program.
        </p>
      </details>

      <details className="kilavuz-bolum">
        <summary>How do I get an Esri ArcGIS Location Platform key?</summary>
        <ol>
          <li>
            Create a free <Baglanti url="https://location.arcgis.com/sign-up/">ArcGIS Location Platform</Baglanti> account.
          </li>
          <li>Create a new API key in the dashboard (Content &gt; New item &gt; Developer credentials &gt; API key credentials; Esri renames its menus from time to time).</li>
          <li>
            Select only <b>Location services &gt; Basemaps &gt; Static basemap tiles</b> as the privilege.
          </li>
          <li>Set an expiry date. Esri API keys are valid for one year at most; when one expires, create a new key and enter it in the program.</li>
          <li>
            Free usage is 2 million tiles per month; beyond that, USD 0.15 per 1,000 tiles. Current information: <Baglanti url="https://location.arcgis.com/pricing/">Location Platform pricing</Baglanti>.
          </li>
          <li>Paste the key into the Esri card below and press Save.</li>
        </ol>
      </details>

      <details className="kilavuz-bolum">
        <summary>Rules: why is there no offline map or download?</summary>
        <ul>
          <li>Google prohibits prefetching, storing and offline use of Map Tiles API tiles; "Google Maps" and the copyright notice of the visible area must be shown on the map.</li>
          <li>Esri allows offline use of exported imagery only in its own software; "Powered by Esri" and the source attribution are shown on the map.</li>
          <li>OpenStreetMap tiles can be used without a key, but bulk downloading is prohibited; the program requests each tile only when it is displayed, with an application identifier.</li>
          <li>Without a key, only the OpenStreetMap road map is available; search uses OpenStreetMap and runs only when you press Enter.</li>
        </ul>
      </details>
    </>
  );
}

function Kilavuz() {
  const m = useMetinler();
  return (
    <div className="kilavuz">
      {m.arama.dil === 'en' ? <KilavuzEn /> : <KilavuzTr />}
      <p className="ipucu-kucuk">{m.servisler.kilavuzNotu(m.servisler.kilavuzTarihi)}</p>
    </div>
  );
}

export function HaritaServisleriAyarlari() {
  const t = useMetinler().servisler;
  if (!tauriMi()) {
    return <p className="ipucu">{t.yalnizMasaustu}</p>;
  }
  return (
    <div className="form-dikey">
      <p className="ipucu-kucuk">{t.anahtarIcermez}</p>
      <AnahtarKarti saglayici="google" />
      <AnahtarKarti saglayici="esri" />
      <Kilavuz />
    </div>
  );
}
