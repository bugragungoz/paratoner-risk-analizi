// Bir keşif: adı, kot seviyeleri, paratonerler ve masaüstüne aktarma (KML).

import { useEffect, useState } from 'react';
import { ChevronRight, Crosshair, Loader2, Plus, Share2, Trash2 } from 'lucide-react';
import { sahaKmlUret } from '../../../src/core/sahaKml';
import { useSaha } from '../baglam';
import { AltPencere, SayiAlani, UstCubuk } from '../bilesenler';
import { kmlEtiketleri } from '../dil';
import { KML_TURU, paylas, telefonaKaydet } from '../platform';
import { asciiDosyaAdi, kimlik, siraliKotlar, sonrakiNumara, type SahaKesfi, type SahaKotu, type SahaParatoneri } from '../veri';

function KotPenceresi({ kesif, kot, kapat }: { kesif: SahaKesfi; kot: SahaKotu | null; kapat: () => void }) {
  const { m, kesifGuncelle, onayla } = useSaha();
  const [ad, setAd] = useState(kot?.ad ?? m.kotOrnek(kesif.kotlar.filter((k) => k.yukseklik_m > 0).length + 1));
  const [yukseklik, setYukseklik] = useState<number | null>(kot?.yukseklik_m ?? null);
  const gecerli = ad.trim() !== '' && yukseklik !== null;

  const kaydet = () => {
    if (!gecerli) return;
    const yeni: SahaKotu = { id: kot?.id ?? kimlik('kot'), ad: ad.trim(), yukseklik_m: yukseklik };
    kesifGuncelle(kesif.id, (k) => ({ ...k, kotlar: kot ? k.kotlar.map((x) => (x.id === kot.id ? yeni : x)) : [...k.kotlar, yeni] }));
    kapat();
  };

  const sil = async () => {
    if (!kot) return;
    const kullanan = kesif.paratonerler.filter((p) => p.kot_id === kot.id).length;
    if (kullanan > 0) {
      await onayla({ baslik: m.kotSil, aciklama: m.kotKullanimda(kot.ad, kullanan), bilgi: true });
      return;
    }
    if (await onayla({ baslik: m.kotSil, aciklama: m.kotSilAciklama(kot.ad), onay: m.sil, tehlikeli: true })) {
      kesifGuncelle(kesif.id, (k) => ({ ...k, kotlar: k.kotlar.filter((x) => x.id !== kot.id) }));
      kapat();
    }
  };

  return (
    <AltPencere baslik={m.kotBaslik} kapat={kapat}>
      <label className="alan">
        <span className="alan-etiket">{m.kotAdi}</span>
        <input value={ad} onChange={(e) => setAd(e.target.value)} maxLength={80} />
      </label>
      <SayiAlani etiket={m.kotYukseklik} deger={yukseklik} degisti={setYukseklik} ipucu="0" zorunlu otomatikOdak={!kot} />
      <div className="alt-pencere-dugmeler">
        {kot && (
          <button type="button" className="ui-buton-tehlike sola" onClick={sil}>
            {m.sil}
          </button>
        )}
        <button type="button" className="ikincil-buton" onClick={kapat}>
          {m.vazgec}
        </button>
        <button type="button" className="buton-birincil" onClick={kaydet} disabled={!gecerli}>
          {m.kaydet}
        </button>
      </div>
    </AltPencere>
  );
}

function PaylasPenceresi({ kesif, kapat }: { kesif: SahaKesfi; kapat: () => void }) {
  const { m, bildir } = useSaha();
  const [mesgul, setMesgul] = useState(false);
  const { kml, konumsuz } = sahaKmlUret(kesif, kmlEtiketleri(m), `Keşif ${__SAHA_SURUMU__}`);
  const yazilan = kesif.paratonerler.length - konumsuz.length;
  // Dosya adı ASCII (her bilgisayarda ve uygulamada sorunsuz); keşfin Türkçe adı dosyanın içinde kalır.
  const dosyaAdi = `${asciiDosyaAdi(kesif.ad)}.kml`;
  const istek = { dosyaAdi, icerik: kml, mime: KML_TURU, baslik: kesif.ad };

  const yap = async (is: () => Promise<void>) => {
    setMesgul(true);
    try {
      await is();
    } catch (e) {
      bildir(m.paylasilamadi(e instanceof Error ? e.message : String(e)), 'hata');
    } finally {
      setMesgul(false);
    }
  };

  return (
    <AltPencere baslik={m.paylasBaslik} kapat={kapat}>
      <p className="alt-pencere-aciklama">{m.paylasAciklama}</p>
      <p className="ipucu mono">{m.dosyaAdi(dosyaAdi)}</p>
      {konumsuz.length > 0 && <p className="not-kutusu">{m.paylasKonumsuz(konumsuz.join(', '))}</p>}
      {yazilan === 0 && <p className="not-kutusu">{m.paylasBos}</p>}
      <div className="dikey-dugmeler">
        <button type="button" className="buton-birincil genis" disabled={mesgul || yazilan === 0} onClick={() => yap(async () => paylas(istek))}>
          <Share2 size={18} /> {m.paylasGonder}
        </button>
        <button
          type="button"
          className="genis"
          disabled={mesgul || yazilan === 0}
          onClick={() =>
            yap(async () => {
              if (await telefonaKaydet(istek)) bildir(m.dosyaKaydedildi, 'basari');
            })
          }
        >
          {m.paylasKaydet}
        </button>
        <button type="button" className="ikincil-buton genis" onClick={kapat}>
          {m.vazgec}
        </button>
      </div>
    </AltPencere>
  );
}

export function Kesif({ id }: { id: string }) {
  const { m, ayarlar, kesifler, kesifGuncelle, kesifSil, alinanlar, konumAl, git, geri, onayla } = useSaha();
  const kesif = kesifler.find((k) => k.id === id);
  const [kotPenceresi, setKotPenceresi] = useState<{ kot: SahaKotu | null } | null>(null);
  const [paylasAcik, setPaylasAcik] = useState(false);

  // Silinmiş ya da bulunamayan keşif: listeye dön.
  useEffect(() => {
    if (!kesif) git({ tur: 'liste' }, true);
  }, [kesif, git]);
  if (!kesif) return null;

  const kotlar = siraliKotlar(kesif);
  const kotAdi = (kotId: string | null) => kesif.kotlar.find((k) => k.id === kotId)?.ad ?? m.kotsuz;

  const paratonerEkle = () => {
    const son = kesif.paratonerler[kesif.paratonerler.length - 1];
    const kotId = son?.kot_id && kesif.kotlar.some((k) => k.id === son.kot_id) ? son.kot_id : (kotlar[0]?.id ?? null);
    const onEk = ayarlar.onEk.trim() || m.varsayilanOnEk;
    const yeni: SahaParatoneri = {
      id: kimlik('p'),
      ad: `${onEk} ${sonrakiNumara(kesif.paratonerler.map((p) => p.ad))}`,
      kot_id: kotId,
      konum: null,
      mast_m: ayarlar.varsayilanMast,
      not: '',
    };
    kesifGuncelle(kesif.id, (k) => ({ ...k, paratonerler: [...k.paratonerler, yeni] }));
    // Sahada noktanın yanındayken: ekleme konumu da arka planda alır.
    if (ayarlar.otomatikKonum) konumAl(kesif.id, yeni.id);
    git({ tur: 'paratoner', id: kesif.id, pid: yeni.id });
  };

  const sil = async () => {
    if (await onayla({ baslik: m.kesifSil, aciklama: m.kesifSilAciklama(kesif.ad), onay: m.sil, tehlikeli: true })) {
      geri();
      kesifSil(kesif.id);
    }
  };

  return (
    <div className="ekran">
      <UstCubuk
        geri
        baslik={kesif.ad || '—'}
        sag={
          <>
            <button type="button" className="ikon-buton" onClick={() => setPaylasAcik(true)} aria-label={m.paylas} title={m.paylas}>
              <Share2 size={20} />
            </button>
            <button type="button" className="ikon-buton ikon-buton-tehlike" onClick={sil} aria-label={m.kesifSil} title={m.kesifSil}>
              <Trash2 size={20} />
            </button>
          </>
        }
      />
      <main className="sayfa">
        <label className="alan">
          <span className="alan-etiket">{m.kesifAdi}</span>
          <input value={kesif.ad} maxLength={120} onChange={(e) => kesifGuncelle(kesif.id, (k) => ({ ...k, ad: e.target.value }))} />
        </label>

        <div className="bolum-baslik">
          <h2>{m.kotlar}</h2>
          <button type="button" className="mini-buton" onClick={() => setKotPenceresi({ kot: null })}>
            <Plus size={16} /> {m.kotEkle}
          </button>
        </div>
        <p className="ipucu">{m.kotNotu}</p>
        <ul className="liste">
          {kotlar.map((k) => (
            <li key={k.id}>
              <button type="button" className="satir" onClick={() => setKotPenceresi({ kot: k })}>
                <span className="satir-metin">
                  <span className="satir-ad">{k.ad || '—'}</span>
                </span>
                <span className="satir-deger">{m.kot(k.yukseklik_m)} m</span>
                <ChevronRight size={20} className="satir-ok" />
              </button>
            </li>
          ))}
        </ul>

        <div className="bolum-baslik">
          <h2>{m.paratonerler}</h2>
        </div>
        {kesif.paratonerler.length === 0 ? (
          <p className="bos-durum">{m.paratonerYok}</p>
        ) : (
          <ul className="liste">
            {kesif.paratonerler.map((p) => {
              const aliniyor = p.id in alinanlar;
              const anlik = alinanlar[p.id];
              return (
                <li key={p.id} className="satir-kap">
                  <button type="button" className="satir" onClick={() => git({ tur: 'paratoner', id: kesif.id, pid: p.id })}>
                    <span className="satir-metin">
                      <span className="satir-ad">{p.ad || '—'}</span>
                      <span className="satir-alt">
                        {kotAdi(p.kot_id)}
                        {' · '}
                        {aliniyor ? (
                          <span>{anlik != null ? m.konumAliniyorDogruluk(m.dogruluk(m.sayi(anlik, 0))) : m.konumAliniyor}</span>
                        ) : p.konum ? (
                          <span className="tamam-metni">{p.konum.dogruluk_m !== null ? m.dogruluk(m.sayi(p.konum.dogruluk_m, 1)) : m.kaynakElle}</span>
                        ) : (
                          <span className="uyari-metni">{m.konumYok}</span>
                        )}
                      </span>
                    </span>
                    <ChevronRight size={20} className="satir-ok" />
                  </button>
                  <button
                    type="button"
                    className="ikon-buton satir-eylem"
                    onClick={() => konumAl(kesif.id, p.id)}
                    disabled={aliniyor}
                    aria-label={`${p.ad}: ${p.konum ? m.konumuYenile : m.konumuKaydet}`}
                    title={p.konum ? m.konumuYenile : m.konumuKaydet}
                  >
                    {aliniyor ? <Loader2 size={20} className="donen" /> : <Crosshair size={20} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <footer className="alt-cubuk">
        <button type="button" className="buton-birincil genis" onClick={paratonerEkle}>
          <Plus size={20} /> {m.paratonerEkle}
        </button>
      </footer>

      {kotPenceresi && <KotPenceresi kesif={kesif} kot={kotPenceresi.kot} kapat={() => setKotPenceresi(null)} />}
      {paylasAcik && <PaylasPenceresi kesif={kesif} kapat={() => setPaylasAcik(false)} />}
    </div>
  );
}
