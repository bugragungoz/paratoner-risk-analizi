// Hakkında: sürüm, yöntem, sorumluluk, lisans ve üçüncü taraf bileşenler.

import { Wordmark } from '../ortak/Logo';
import { Pencere } from '../ortak/Pencere';
import { DEPO_ADRESI as DEPO, KULLANIM_KOSULLARI, LISANS_ACIKLAMASI, LISANS_IZINLERI, SORUMLULUK_OZETI, TELIF } from '../ortak/yasal';
import { disBaglantiAc } from '../platform/tauri';

const BILESENLER: [string, string][] = [
  ['Tauri', 'MIT / Apache-2.0'],
  ['React, Radix UI', 'MIT'],
  ['Leaflet', 'BSD-2-Clause'],
  ['Turf', 'MIT'],
  ['docx', 'MIT'],
  ['pdfmake', 'MIT'],
  ['html2canvas', 'MIT'],
  ['Lucide (simgeler)', 'ISC'],
  ['Rust bileşenleri (reqwest, keyring, serde ve diğerleri)', 'MIT / Apache-2.0'],
  ['Geist, JetBrains Mono, Carlito (yazı tipleri)', 'SIL OFL 1.1'],
];

function Baglanti({ url, children }: { url: string; children: string }) {
  return (
    <button type="button" className="baglanti-buton" onClick={() => disBaglantiAc(url)}>
      {children}
    </button>
  );
}

export function HakkindaPenceresi({ kapat }: { kapat: () => void }) {
  return (
    <Pencere acik kapat={kapat} baslik="Hakkında">
      <div className="form-dikey hakkinda">
        <Wordmark boyut="buyuk" />
        <p className="hakkinda-surum">Sürüm {__UYGULAMA_SURUMU__}</p>
        <p className="kart-metni">
          NF C 17-102 esaslı aktif (ESE) paratoner risk analizi ve koruma kontrolü: yapı bazlı risk değerlendirmesi, gerekli koruma seviyesi, koruma yarıçapıyla kapsama kontrolü ve Word/PDF rapor.
        </p>
        <div className="uyari-blok">{SORUMLULUK_OZETI} Girdilerin (Nk, ΔT, C katsayıları, kotlar, konumlar) doğruluğunu kontrol edin.</div>
        <div>
          <div className="alan-etiketi">Telif ve lisans</div>
          <p className="kart-metni">
            {TELIF}. {LISANS_ACIKLAMASI}
          </p>
          <ul className="yasal-liste">
            {LISANS_IZINLERI.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <p className="kart-metni">
            <Baglanti url={DEPO}>Kaynak kod ve sorun bildirimi</Baglanti> · <Baglanti url="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0 metni</Baglanti>
          </p>
        </div>
        <details className="yasal-ayrinti">
          <summary>Kullanım koşulları ve sorumluluk reddi</summary>
          <dl className="kosul-listesi">
            {KULLANIM_KOSULLARI.map((m) => (
              <div key={m.baslik}>
                <dt>{m.baslik}</dt>
                <dd>{m.metin}</dd>
              </div>
            ))}
          </dl>
        </details>
        <div>
          <div className="alan-etiketi">Kullanılan açık kaynak bileşenler</div>
          <table className="hakkinda-tablo">
            <tbody>
              {BILESENLER.map(([ad, lisans]) => (
                <tr key={ad}>
                  <td>{ad}</td>
                  <td>{lisans}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ipucu-kucuk">
            Harita verileri ve görüntüleri sağlayıcılarına aittir (Google, Esri ve veri sağlayıcıları, © OpenStreetMap katkıda bulunanlar); haritada ve raporda atıfları gösterilir. Google Maps logosu
            Google'ın markasıdır. Bileşenlerin tam listesi ve lisansları kaynak depodaki NOTICE.md dosyasındadır.
          </p>
        </div>
        <p className="ipucu-kucuk">Opus 5.5 ile kodlandı, Fable 5.2 ile geliştirildi.</p>
      </div>
    </Pencere>
  );
}
