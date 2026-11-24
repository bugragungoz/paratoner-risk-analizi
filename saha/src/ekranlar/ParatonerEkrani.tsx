// Bir paratoner noktası: ad, kot, konum (tek dokunuşla arka planda alınır ya da koordinat yapıştırılır),
// düşünülen mast yüksekliği ve not.

import { useCallback, useEffect, useState } from 'react';
import { ClipboardPaste, Crosshair, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { useSaha } from '../baglam';
import { SayiAlani, UstCubuk } from '../bilesenler';
import { koordinatCoz } from '../koordinatCoz';
import { haritadaAc, panodanOku } from '../platform';
import { siraliKotlar, type SahaParatoneri } from '../veri';

export function ParatonerEkrani({ id, pid }: { id: string; pid: string }) {
  const { m, kesifler, kesifGuncelle, alinanlar, konumAl, git, geri, onayla, bildir } = useSaha();
  const kesif = kesifler.find((k) => k.id === id);
  const p = kesif?.paratonerler.find((x) => x.id === pid);
  const [yapistirilan, setYapistirilan] = useState('');

  useEffect(() => {
    if (!kesif) git({ tur: 'liste' }, true);
    else if (!p) git({ tur: 'kesif', id: kesif.id }, true);
  }, [kesif, p, git]);

  const guncelle = useCallback(
    (d: Partial<SahaParatoneri>) => kesifGuncelle(id, (k) => ({ ...k, paratonerler: k.paratonerler.map((x) => (x.id === pid ? { ...x, ...d } : x)) })),
    [kesifGuncelle, id, pid],
  );

  if (!kesif || !p) return null;

  const koordinatUygula = (metin: string) => {
    const k = koordinatCoz(metin);
    if (!k) return bildir(m.koordinatTanimsiz, 'hata');
    guncelle({ konum: { lat: k.lat, lng: k.lng, dogruluk_m: null, zaman: new Date().toISOString(), kaynak: 'elle' } });
    setYapistirilan('');
    bildir(m.koordinatAlindi, 'basari');
  };

  const panodan = async () => {
    try {
      const metin = await panodanOku();
      setYapistirilan(metin);
      if (metin.trim()) koordinatUygula(metin);
    } catch (e) {
      bildir(m.paylasilamadi(e instanceof Error ? e.message : String(e)), 'hata');
    }
  };

  const sil = async () => {
    if (await onayla({ baslik: m.paratonerSil, aciklama: m.paratonerSilAciklama(p.ad), onay: m.sil, tehlikeli: true })) {
      geri();
      kesifGuncelle(id, (k) => ({ ...k, paratonerler: k.paratonerler.filter((x) => x.id !== pid) }));
    }
  };

  const k = p.konum;
  const aliniyor = pid in alinanlar;
  const anlik = alinanlar[pid];
  const zaman = k ? new Date(k.zaman).toLocaleString(m.yerel, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className="ekran">
      <UstCubuk
        geri
        baslik={p.ad || '—'}
        sag={
          <button type="button" className="ikon-buton ikon-buton-tehlike" onClick={sil} aria-label={m.paratonerSil} title={m.paratonerSil}>
            <Trash2 size={20} />
          </button>
        }
      />
      <main className="sayfa">
        <section className="kart konum-karti">
          <div className="kart-baslik">{m.konum}</div>
          {aliniyor && (
            <div className="konum-bilgi aliniyor">
              <Loader2 size={16} className="donen" /> {anlik != null ? m.konumAliniyorDogruluk(m.dogruluk(m.sayi(anlik, 0))) : m.konumAliniyor}
            </div>
          )}
          {k ? (
            <>
              <div className="konum-koordinat mono">
                {k.lat.toFixed(6)}, {k.lng.toFixed(6)}
              </div>
              <div className="konum-bilgi">
                <span className={k.dogruluk_m !== null && k.dogruluk_m > 15 ? 'uyari-metni' : 'tamam-metni'}>
                  {k.dogruluk_m !== null ? m.dogrulukUzun(m.sayi(k.dogruluk_m, 1)) : m.kaynakElle}
                </span>
                {' · '}
                {zaman}
              </div>
              <button type="button" className="mini-buton" onClick={() => haritadaAc(k.lat, k.lng).catch((e) => bildir(String(e), 'hata'))}>
                <ExternalLink size={16} /> {m.haritadaGoster}
              </button>
            </>
          ) : (
            !aliniyor && <div className="konum-bilgi uyari-metni">{m.konumYok}</div>
          )}
          <details className="yapistir">
            <summary>{m.yapistirBaslik}</summary>
            <p className="ipucu">{m.yapistirIpucu}</p>
            <div className="satir-ici">
              <input value={yapistirilan} onChange={(e) => setYapistirilan(e.target.value)} placeholder={m.yapistirOrnek} inputMode="text" aria-label={m.yapistirBaslik} />
              <button type="button" onClick={() => koordinatUygula(yapistirilan)} disabled={!yapistirilan.trim()}>
                {m.uygula}
              </button>
            </div>
            <button type="button" className="mini-buton ust-bosluk" onClick={panodan}>
              <ClipboardPaste size={16} /> {m.panodan}
            </button>
          </details>
        </section>

        <label className="alan">
          <span className="alan-etiket">{m.ad}</span>
          <input value={p.ad} maxLength={80} onChange={(e) => guncelle({ ad: e.target.value })} />
        </label>
        <label className="alan">
          <span className="alan-etiket">{m.kotSecimi}</span>
          <select value={p.kot_id ?? ''} onChange={(e) => guncelle({ kot_id: e.target.value || null })}>
            <option value="">{m.kotsuz}</option>
            {siraliKotlar(kesif).map((kt) => (
              <option key={kt.id} value={kt.id}>
                {kt.ad} ({m.kot(kt.yukseklik_m)} m)
              </option>
            ))}
          </select>
        </label>
        <SayiAlani key={`mast-${pid}`} etiket={m.mast} deger={p.mast_m} degisti={(d) => guncelle({ mast_m: d })} ipucu={m.istegeBagli} />
        <label className="alan">
          <span className="alan-etiket">{m.not}</span>
          <textarea value={p.not} rows={3} maxLength={1000} placeholder={m.notOrnek} onChange={(e) => guncelle({ not: e.target.value })} />
        </label>
      </main>

      <footer className="alt-cubuk">
        <button type="button" className="buton-birincil genis" onClick={() => konumAl(id, pid)} disabled={aliniyor}>
          {aliniyor ? <Loader2 size={20} className="donen" /> : <Crosshair size={20} />} {aliniyor ? m.konumAliniyor : k ? m.konumuYenile : m.konumuKaydet}
        </button>
      </footer>
    </div>
  );
}
