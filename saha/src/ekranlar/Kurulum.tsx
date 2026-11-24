// İlk açılış: uygulamanın ne yaptığı, dil seçimi ve konum izni.

import { ParatonerIsareti } from '../../../src/arayuz/ortak/Logo';
import { useSaha } from '../baglam';
import { Secenekler } from '../bilesenler';
import { KonumIzniSatiri } from './Ayarlar';

export function Kurulum() {
  const { m, ayarlar, ayarGuncelle } = useSaha();
  return (
    <div className="ekran kurulum">
      <main className="sayfa">
        <div className="kurulum-ust">
          <ParatonerIsareti boyut={44} cizgi={1.5} className="wordmark-isaret" />
          <h1 className="kurulum-baslik">{m.uygulama}</h1>
          <p className="kurulum-metni">{m.kurulumMetni}</p>
        </div>

        <section className="ayar-bolumu">
          <h2>{m.ayarDil}</h2>
          <Secenekler
            etiket={m.ayarDil}
            deger={ayarlar.dil}
            degisti={(dil) => ayarGuncelle({ dil })}
            secenekler={[
              ['tr', m.dilTr],
              ['en', m.dilEn],
            ]}
          />
        </section>

        <section className="ayar-bolumu">
          <h2>{m.ayarKonum}</h2>
          <p className="ipucu">{m.kurulumKonumMetni}</p>
          <KonumIzniSatiri />
          <p className="ipucu">{m.internetNotu}</p>
        </section>
      </main>
      <footer className="alt-cubuk">
        <button type="button" className="buton-birincil genis" onClick={() => ayarGuncelle({ kurulumTamam: true })}>
          {m.basla}
        </button>
      </footer>
    </div>
  );
}
