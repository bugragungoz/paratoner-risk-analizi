import { Building2, Eye, MapPin, Ruler, SquareDashed, Zap } from 'lucide-react';
import type { CizimModu } from '../harita/Harita';

const MODLAR: { mod: CizimModu; etiket: string; ikon: typeof Zap; ipucu: string }[] = [
  { mod: 'paratoner', etiket: 'Paratoner ekle', ikon: Zap, ipucu: 'Haritada paratonerin yerine tıklayın.' },
  { mod: 'yapi', etiket: 'Yapı ekle (poligon)', ikon: Building2, ipucu: 'Köşelere sırayla tıklayın; bitirmek için ilk noktaya tıklayın ya da Enter. Son noktayı geri almak için Ctrl+Z, vazgeçmek için Esc.' },
  { mod: 'parsel', etiket: 'Parsel sınırı çiz', ikon: SquareDashed, ipucu: 'Köşelere sırayla tıklayın; bitirmek için ilk noktaya tıklayın ya da Enter.' },
  { mod: 'olcum', etiket: 'Mesafe ölç', ikon: Ruler, ipucu: 'Noktalara tıklayarak mesafe ölçün. Esc ile temizleyin.' },
  { mod: 'streetview', etiket: 'Street View aç', ikon: Eye, ipucu: 'Street View açmak için haritada bir noktaya tıklayın.' },
];

export function CizimModuPaneli({ mod, modSec }: { mod: CizimModu; modSec: (m: CizimModu) => void }) {
  const aktif = MODLAR.find((m) => m.mod === mod);
  return (
    <div className="panel">
      <h3>Çizim modu</h3>
      <div className="mod-butonlari">
        {MODLAR.map(({ mod: m, etiket, ikon: Ikon }) => (
          <button key={m} className={mod === m ? 'mod-aktif' : ''} onClick={() => modSec(m)} aria-pressed={mod === m}>
            <Ikon size={14} />
            {etiket}
          </button>
        ))}
      </div>
      {aktif && (
        <p className="ipucu">
          <MapPin size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
          {aktif.ipucu}
        </p>
      )}
    </div>
  );
}
