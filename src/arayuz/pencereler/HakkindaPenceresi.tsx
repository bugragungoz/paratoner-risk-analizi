// Hakkında: sürüm, yöntem, sorumluluk, lisans ve üçüncü taraf bileşenler.

import { Wordmark } from '../ortak/Logo';
import { Pencere } from '../ortak/Pencere';
import { DEPO_ADRESI as DEPO, TELIF } from '../ortak/yasal';
import { disBaglantiAc } from '../platform/tauri';
import { useMetinler } from '../ortak/useMetinler';

const bilesenler = (t: { simgeler: string; rust: string; yazitipleri: string }): [string, string][] => [
  ['Tauri', 'MIT / Apache-2.0'],
  ['React, Radix UI', 'MIT'],
  ['Leaflet', 'BSD-2-Clause'],
  ['Turf', 'MIT'],
  ['proj4js', 'MIT'],
  ['docx', 'MIT'],
  ['pdfmake', 'MIT'],
  ['html2canvas', 'MIT'],
  ['JSZip', 'MIT'],
  [t.simgeler, 'ISC'],
  [t.rust, 'MIT / Apache-2.0'],
  [t.yazitipleri, 'SIL OFL 1.1'],
];

function Baglanti({ url, children }: { url: string; children: string }) {
  return (
    <button type="button" className="baglanti-buton" onClick={() => disBaglantiAc(url)}>
      {children}
    </button>
  );
}

export function HakkindaPenceresi({ kapat }: { kapat: () => void }) {
  const m = useMetinler();
  const t = m.hakkinda;
  return (
    <Pencere acik kapat={kapat} baslik={t.baslik}>
      <div className="form-dikey hakkinda">
        <Wordmark boyut="buyuk" />
        <p className="hakkinda-surum">{t.surum(__UYGULAMA_SURUMU__)}</p>
        <p className="kart-metni">{t.tanim}</p>
        <div className="uyari-blok">
          {m.yasal.sorumlulukOzeti} {t.girdiler}
        </div>
        <div>
          <div className="alan-etiketi">{t.telif}</div>
          <p className="kart-metni">
            {TELIF}. {m.yasal.lisansAciklamasi}
          </p>
          <ul className="yasal-liste">
            {m.yasal.lisansIzinleri.map((izin) => (
              <li key={izin}>{izin}</li>
            ))}
          </ul>
          <p className="kart-metni">
            <Baglanti url={DEPO}>{t.kaynak}</Baglanti> · <Baglanti url="https://www.gnu.org/licenses/gpl-3.0.html">{t.gpl}</Baglanti>
          </p>
        </div>
        <details className="yasal-ayrinti">
          <summary>{t.kosullar}</summary>
          <dl className="kosul-listesi">
            {m.yasal.kosullar.map((k) => (
              <div key={k.baslik}>
                <dt>{k.baslik}</dt>
                <dd>{k.metin}</dd>
              </div>
            ))}
          </dl>
        </details>
        <div>
          <div className="alan-etiketi">{t.bilesenler}</div>
          <table className="hakkinda-tablo">
            <tbody>
              {bilesenler(t).map(([ad, lisans]) => (
                <tr key={ad}>
                  <td>{ad}</td>
                  <td>{lisans}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ipucu-kucuk">{t.haritaNotu}</p>
        </div>
        <p className="ipucu-kucuk">{t.gelistirme}</p>
      </div>
    </Pencere>
  );
}
