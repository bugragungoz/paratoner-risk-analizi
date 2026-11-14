import { BilgiKarti } from '../ortak/BilgiKarti';
import { SORUMLULUK_OZETI } from '../ortak/yasal';

/** Sol menünün altındaki sorumluluk bildirimi. Tam metin: Yardım › Hakkında. */
export function Sorumluluk() {
  return (
    <div className="sorumluluk">
      <BilgiKarti genislik={300} tetikleyici={<span className="disclaimer-tetikleyici">Sorumluluk Bildirimi</span>}>
        <p className="kart-metni">{SORUMLULUK_OZETI}</p>
        <p className="kart-metni">
          Analiz NF C 17-102 esaslıdır. Harita katmanları üçüncü taraf sağlayıcılardan (Google, Esri, OpenStreetMap) alınır ve ilgili sağlayıcının kullanım koşullarına tabidir.
        </p>
        <p className="kart-metni">Koşulların tamamı: Yardım › Hakkında.</p>
      </BilgiKarti>
    </div>
  );
}
