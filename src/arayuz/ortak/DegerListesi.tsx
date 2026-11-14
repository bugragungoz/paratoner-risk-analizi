import { useState } from 'react';
import { X } from 'lucide-react';
import { sayi } from '../../core';
import { SayiGirdisi } from './SayiGirdisi';

interface Props {
  degerler: number[];
  degisti: (d: number[]) => void;
  birim?: string;
}

/** Sayı listesi düzenleyici (ör. h eşikleri). Ondalık virgül desteklenir, değerler sıralı ve tekildir. */
export function DegerListesi({ degerler, degisti, birim = 'm' }: Props) {
  const [yeni, setYeni] = useState<number | null>(null);
  const ekle = () => {
    if (yeni === null || yeni <= 0) return;
    degisti([...new Set([...degerler, yeni])].sort((a, b) => a - b));
    setYeni(null);
  };
  return (
    <div className="deger-listesi">
      <div className="cipler">
        {degerler.map((d) => (
          <span key={d} className="cip">
            {sayi(d, d % 1 === 0 ? 0 : 1)} {birim}
            <button type="button" className="cip-sil" onClick={() => degisti(degerler.filter((x) => x !== d))} title="Kaldır">
              <X size={11} />
            </button>
          </span>
        ))}
        {degerler.length === 0 && <span className="ipucu">Değer yok</span>}
      </div>
      <div className="deger-ekle">
        <SayiGirdisi
          deger={yeni}
          degisti={setYeni}
          asgari={0}
          asgariHaric
          placeholder="Değer ekle"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              ekle();
            }
          }}
        />
        <button type="button" onClick={ekle} disabled={yeni === null || yeni <= 0}>
          Ekle
        </button>
      </div>
    </div>
  );
}
