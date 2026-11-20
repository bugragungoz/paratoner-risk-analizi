import { Building2, Eye, MapPin, Ruler, SquareDashed, Zap } from 'lucide-react';
import type { CizimModu } from '../harita/Harita';
import { useMetinler } from '../ortak/useMetinler';

type Mod = 'paratoner' | 'yapi' | 'parsel' | 'olcum' | 'streetview';
const MODLAR: { mod: Mod; ikon: typeof Zap }[] = [
  { mod: 'paratoner', ikon: Zap },
  { mod: 'yapi', ikon: Building2 },
  { mod: 'parsel', ikon: SquareDashed },
  { mod: 'olcum', ikon: Ruler },
  { mod: 'streetview', ikon: Eye },
];

export function CizimModuPaneli({ mod, modSec }: { mod: CizimModu; modSec: (m: CizimModu) => void }) {
  const t = useMetinler().cizim;
  const aktif = MODLAR.find((m) => m.mod === mod);
  return (
    <div className="panel">
      <h3>{t.baslik}</h3>
      <div className="mod-butonlari">
        {MODLAR.map(({ mod: m, ikon: Ikon }) => (
          <button key={m} className={mod === m ? 'mod-aktif' : ''} onClick={() => modSec(m)} aria-pressed={mod === m}>
            <Ikon size={14} />
            {t[m]}
          </button>
        ))}
      </div>
      {aktif && (
        <p className="ipucu">
          <MapPin size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
          {t[`${aktif.mod}Ipucu`]}
        </p>
      )}
    </div>
  );
}
