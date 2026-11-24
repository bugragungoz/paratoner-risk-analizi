// Ayarlar: dil, tema, konum alma, yeni paratoner varsayılanları, veri ve hakkında.

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, MapPin, Trash2 } from 'lucide-react';
import { useSaha } from '../baglam';
import { Anahtar, SayiAlani, Secenekler, UstCubuk } from '../bilesenler';
import { konumIzniDurumu, konumIzniIste, type IzinDurumu } from '../konum';
import { baglantiAc } from '../platform';

const KAYNAK_KOD = 'https://github.com/bugragungoz/paratoner-risk-analizi';

export function KonumIzniSatiri() {
  const { m, bildir } = useSaha();
  const [durum, setDurum] = useState<IzinDurumu>('bilinmiyor');
  const yenile = useCallback(() => {
    konumIzniDurumu().then(setDurum, () => setDurum('bilinmiyor'));
  }, []);
  useEffect(() => {
    yenile();
    // Telefonun ayarlarından dönünce (uygulama yeniden görünür olunca) durum güncellenir.
    const gorunur = () => document.visibilityState === 'visible' && yenile();
    document.addEventListener('visibilitychange', gorunur);
    return () => document.removeEventListener('visibilitychange', gorunur);
  }, [yenile]);

  const iste = async () => {
    const d = await konumIzniIste();
    setDurum(d);
    if (d === 'yok') bildir(m.konumIzniYok, 'hata');
    else if (d === 'yaklasik') bildir(m.konumYaklasik, 'hata');
    else if (d === 'kapali') bildir(m.konumKapali, 'hata');
  };

  const metin = { verildi: m.izinVerildi, yaklasik: m.izinYaklasik, yok: m.izinYok, kapali: m.izinKapali, bilinmiyor: m.izinBilinmiyor }[durum];
  return (
    <div className="izin-satiri">
      <MapPin size={20} className={durum === 'verildi' ? 'tamam-metni' : 'uyari-metni'} />
      <span className="izin-metni">
        <span className="anahtar-etiket">{m.konumIzni}</span>
        <span className={durum === 'verildi' ? 'tamam-metni anahtar-not' : 'uyari-metni anahtar-not'}>{metin}</span>
      </span>
      {durum !== 'verildi' && (
        <button type="button" className="mini-buton" onClick={iste}>
          {m.izinVer}
        </button>
      )}
    </div>
  );
}

export function Ayarlar() {
  const { m, ayarlar, ayarGuncelle, kesifler, hepsiniSil, onayla, bildir } = useSaha();
  const onEk = ayarlar.onEk.trim() || m.varsayilanOnEk;

  const sil = async () => {
    if (kesifler.length === 0) return;
    if (await onayla({ baslik: m.hepsiniSil, aciklama: m.hepsiniSilAciklama(kesifler.length), onay: m.sil, tehlikeli: true })) hepsiniSil();
  };

  return (
    <div className="ekran">
      <UstCubuk geri baslik={m.ayarlar} />
      <main className="sayfa sayfa-altsiz">
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
          <h2>{m.ayarTema}</h2>
          <Secenekler
            etiket={m.ayarTema}
            deger={ayarlar.tema}
            degisti={(tema) => ayarGuncelle({ tema })}
            secenekler={[
              ['sistem', m.temaSistem],
              ['koyu', m.temaKoyu],
              ['acik', m.temaAcik],
            ]}
          />
          <p className="ipucu">{m.temaNotu}</p>
        </section>

        <section className="ayar-bolumu">
          <h2>{m.ayarKonum}</h2>
          <KonumIzniSatiri />
          <div className="alan-etiket ust-bosluk">{m.konumModu}</div>
          <Secenekler
            etiket={m.konumModu}
            deger={ayarlar.konumModu}
            degisti={(konumModu) => ayarGuncelle({ konumModu })}
            secenekler={[
              ['hizli', m.konumHizli],
              ['hassas', m.konumHassas],
            ]}
          />
          <p className="ipucu">{ayarlar.konumModu === 'hizli' ? m.konumHizliAciklama : m.konumHassasAciklama}</p>
          <Anahtar etiket={m.otomatikKonum} not={m.otomatikKonumNotu} acik={ayarlar.otomatikKonum} degisti={(otomatikKonum) => ayarGuncelle({ otomatikKonum })} />
          <p className="ipucu">{m.internetNotu}</p>
        </section>

        <section className="ayar-bolumu">
          <h2>{m.ayarYeniParatoner}</h2>
          <label className="alan">
            <span className="alan-etiket">{m.onEk}</span>
            <input value={ayarlar.onEk} maxLength={40} placeholder={m.varsayilanOnEk} onChange={(e) => ayarGuncelle({ onEk: e.target.value })} />
            <span className="ipucu">{m.onEkNotu(`${onEk} 1, ${onEk} 2`)}</span>
          </label>
          <SayiAlani etiket={m.varsayilanMast} deger={ayarlar.varsayilanMast} degisti={(d) => ayarGuncelle({ varsayilanMast: d !== null && d > 0 ? d : null })} ipucu={m.istegeBagli} />
        </section>

        <section className="ayar-bolumu">
          <h2>{m.ayarVeri}</h2>
          <p className="ipucu">{m.veriNotu}</p>
          <button type="button" className="ui-buton-tehlike" onClick={sil} disabled={kesifler.length === 0}>
            <Trash2 size={18} /> {m.hepsiniSil}
          </button>
        </section>

        <section className="ayar-bolumu">
          <h2>{m.hakkinda}</h2>
          <p className="ipucu">{m.hakkindaMetni}</p>
          <p className="ipucu">{m.surum(__SAHA_SURUMU__)}</p>
          <button type="button" className="mini-buton" onClick={() => baglantiAc(KAYNAK_KOD).catch((e) => bildir(String(e), 'hata'))}>
            <ExternalLink size={16} /> {m.kaynakKod}
          </button>
        </section>
      </main>
    </div>
  );
}
