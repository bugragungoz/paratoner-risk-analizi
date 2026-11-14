import { useProje } from '../durum/ProjeSaglayici';
import type { HaritaGorunumu } from '../harita/Harita';

const RENKLER = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6'];

export function Lejant({ gorunum }: { gorunum: HaritaGorunumu }) {
  const { proje, ayarlar } = useProje();
  const esikler = [...gorunum.hEsikleri].sort((a, b) => a - b);
  const yapiVar = proje.yapilar.some((y) => y.gorunur_mu !== false);
  const cemberVar = !gorunum.izolasyon && esikler.length > 0 && gorunum.seviyeler.size > 0;
  if (!cemberVar && !yapiVar) return null;

  return (
    <div className="lejant">
      {cemberVar &&
        esikler.map((h, i) => (
          <div key={h} className="lejant-satir">
            <span className="lejant-renk-nokta" style={{ background: RENKLER[i % RENKLER.length] }} />h = {h} m çemberi
          </div>
        ))}
      {gorunum.izolasyon && (
        <div className="lejant-satir">
          <span className="lejant-renk-nokta" style={{ background: '#f59e0b' }} />
          Odak yapı için gerçek Rp
        </div>
      )}
      {yapiVar && ayarlar.kapsamaGoster && (
        <>
          <div className="lejant-satir">
            <span className="lejant-renk-nokta" style={{ background: '#22c55e' }} />
            Yapı koruma altında
          </div>
          <div className="lejant-satir">
            <span className="lejant-renk-nokta" style={{ background: '#ef4444' }} />
            Yapı açıkta kalıyor
          </div>
        </>
      )}
      <div className="lejant-not">Kapsama, her yapının kendi koruma seviyesine göre hesaplanır.</div>
    </div>
  );
}
