// Klavye kısayolları (F1).

import { Pencere } from '../ortak/Pencere';
import { useMetinler } from '../ortak/useMetinler';

export function KisayollarPenceresi({ kapat }: { kapat: () => void }) {
  const t = useMetinler().kisayollar;
  return (
    <Pencere acik kapat={kapat} baslik={t.baslik}>
      <div className="form-dikey">
        {t.gruplar.map((g) => (
          <div key={g.baslik}>
            <div className="alan-etiketi">{g.baslik}</div>
            <table className="hakkinda-tablo kisayol-tablo">
              <tbody>
                {g.satirlar.map(([tus = '', is = '']) => (
                  <tr key={tus + is}>
                    <td>
                      <kbd>{tus}</kbd>
                    </td>
                    <td>{is}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Pencere>
  );
}
