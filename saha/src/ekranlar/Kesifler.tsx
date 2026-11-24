// Ana ekran: keşiflerin listesi ve yeni keşif.

import { ChevronRight, Plus, Settings } from 'lucide-react';
import { ParatonerIsareti } from '../../../src/arayuz/ortak/Logo';
import { useSaha } from '../baglam';
import { yeniKesif } from '../veri';

export function Kesifler() {
  const { m, kesifler, kesifEkle, git } = useSaha();

  const olustur = () => {
    const tarih = new Date().toLocaleDateString(m.yerel, { day: '2-digit', month: '2-digit', year: 'numeric' });
    const k = yeniKesif(m.varsayilanKesifAdi(tarih), m.zemin);
    kesifEkle(k);
    git({ tur: 'kesif', id: k.id });
  };

  return (
    <div className="ekran">
      <header className="ust ust-ana">
        <span className="wordmark">
          <ParatonerIsareti boyut={20} className="wordmark-isaret" />
          <span>{m.uygulama}</span>
        </span>
        <div className="ust-sag">
          <button type="button" className="ikon-buton" onClick={() => git({ tur: 'ayarlar' })} aria-label={m.ayarlar} title={m.ayarlar}>
            <Settings size={22} />
          </button>
        </div>
      </header>

      <main className="sayfa">
        <p className="ipucu">{m.altBaslik}</p>
        <div className="bolum-baslik">
          <h2>{m.kesifler}</h2>
        </div>
        {kesifler.length === 0 ? (
          <p className="bos-durum">{m.kesifYok}</p>
        ) : (
          <ul className="liste">
            {kesifler.map((k) => {
              const konumsuz = k.paratonerler.filter((p) => !p.konum).length;
              return (
                <li key={k.id}>
                  <button type="button" className="satir" onClick={() => git({ tur: 'kesif', id: k.id })}>
                    <span className="satir-metin">
                      <span className="satir-ad">{k.ad || '—'}</span>
                      <span className="satir-alt">
                        {m.kesifOzeti(k.paratonerler.length, k.kotlar.length)}
                        {' · '}
                        {new Date(k.guncelleme).toLocaleDateString(m.yerel, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        {konumsuz > 0 && <span className="uyari-metni"> · {m.konumsuzSayisi(konumsuz)}</span>}
                      </span>
                    </span>
                    <ChevronRight size={20} className="satir-ok" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="surum">{m.surum(__SAHA_SURUMU__)}</p>
      </main>

      <footer className="alt-cubuk">
        <button type="button" className="buton-birincil genis" onClick={olustur}>
          <Plus size={20} /> {m.yeniKesif}
        </button>
      </footer>
    </div>
  );
}
