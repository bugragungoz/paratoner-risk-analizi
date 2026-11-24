// AutoCAD ile çalışma: DWG'den DXF altlığa ve paratonerlerin DXF ile DWG'ye geri verilmesi (Yardım).

import { Pencere } from '../ortak/Pencere';
import { useMetinler } from '../ortak/useMetinler';

export function DxfKilavuzuPenceresi({ kapat }: { kapat: () => void }) {
  const t = useMetinler().dxfKilavuzu;
  return (
    <Pencere acik kapat={kapat} baslik={t.baslik}>
      <div className="form-dikey dxf-kilavuzu">
        <p className="ipucu-kucuk">{t.giris}</p>
        {t.bolumler.map((b) => (
          <div key={b.baslik}>
            <div className="alan-etiketi">{b.baslik}</div>
            <ol>
              {b.adimlar.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>
          </div>
        ))}
        <p className="dxf-kilavuzu-kural">{t.kural}</p>
      </div>
    </Pencere>
  );
}
