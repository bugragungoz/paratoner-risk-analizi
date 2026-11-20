import { BilgiKarti } from '../ortak/BilgiKarti';
import { useMetinler } from '../ortak/useMetinler';

/** Sol menünün altındaki sorumluluk bildirimi. Tam metin: Yardım › Hakkında. */
export function Sorumluluk() {
  const m = useMetinler();
  return (
    <div className="sorumluluk">
      <BilgiKarti genislik={300} tetikleyici={<span className="disclaimer-tetikleyici">{m.sorumluluk.baslik}</span>}>
        <p className="kart-metni">{m.yasal.sorumlulukOzeti}</p>
        <p className="kart-metni">{m.sorumluluk.standart}</p>
        <p className="kart-metni">{m.sorumluluk.tamami}</p>
      </BilgiKarti>
    </div>
  );
}
