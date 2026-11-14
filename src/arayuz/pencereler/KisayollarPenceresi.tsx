// Klavye kısayolları (F1).

import { Pencere } from '../ortak/Pencere';

const GRUPLAR: { baslik: string; satirlar: [string, string][] }[] = [
  {
    baslik: 'Dosya',
    satirlar: [
      ['Ctrl+N', 'Yeni proje'],
      ['Ctrl+O', 'Proje dosyası aç'],
      ['Ctrl+S', 'Kaydet'],
      ['Ctrl+Shift+S', 'Farklı kaydet'],
    ],
  },
  {
    baslik: 'Düzen',
    satirlar: [
      ['Ctrl+Z', 'Geri al'],
      ['Ctrl+Y ya da Ctrl+Shift+Z', 'Yinele'],
    ],
  },
  {
    baslik: 'Çizim ve ölçüm',
    satirlar: [
      ['Tıklama', 'Köşe ya da nokta ekle'],
      ['İlk noktaya tıklama ya da Enter', 'Poligonu bitir'],
      ['Ctrl+Z', 'Çizimde son noktayı geri al'],
      ['Esc', 'Çizimden ya da ölçümden çık'],
    ],
  },
  {
    baslik: 'Pencere',
    satirlar: [
      ['F1', 'Klavye kısayolları'],
      ['F11', 'Tam ekran'],
      ['Esc', 'Açık pencereyi kapat'],
    ],
  },
];

export function KisayollarPenceresi({ kapat }: { kapat: () => void }) {
  return (
    <Pencere acik kapat={kapat} baslik="Klavye kısayolları">
      <div className="form-dikey">
        {GRUPLAR.map((g) => (
          <div key={g.baslik}>
            <div className="alan-etiketi">{g.baslik}</div>
            <table className="hakkinda-tablo kisayol-tablo">
              <tbody>
                {g.satirlar.map(([tus, is]) => (
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
