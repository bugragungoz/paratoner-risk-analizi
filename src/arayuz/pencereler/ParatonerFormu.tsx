import { useState } from 'react';
import { paratonerTepeKotu, yeniParatoner, type LatLng, type Paratoner } from '../../core';
import { useProje } from '../durum/ProjeSaglayici';
import { DeltaTSecici } from '../paneller/ProjeParametreleriPaneli';
import { Anahtar } from '../ortak/Anahtar';
import { DegerListesi } from '../ortak/DegerListesi';
import { Pencere } from '../ortak/Pencere';
import { SayiGirdisi } from '../ortak/SayiGirdisi';
import { useMetinler } from '../ortak/useMetinler';

interface Props {
  /** Yeni paratoner için haritada tıklanan konum. */
  konum: LatLng | null;
  duzenlenen: Paratoner | null;
  kapat: () => void;
  kaydet: (p: Paratoner) => void;
}

export function ParatonerFormu({ konum, duzenlenen, kapat, kaydet }: Props) {
  const { proje } = useProje();
  const m = useMetinler();
  const t = m.paratonerFormu;
  const { sayi, kot: kotMetni } = m.bicim;
  const paratonerBazli = proje.deltaT_modu === 'paratoner';
  const [isim, setIsim] = useState(duzenlenen?.isim ?? `P${proje.paratonerler.length + 1}`);
  const [taban, setTaban] = useState<'kot' | 'yapi'>(duzenlenen?.yapi_id ? 'yapi' : 'kot');
  const [kotId, setKotId] = useState(duzenlenen?.kot_seviyesi_id ?? proje.kot_seviyeleri[0]?.id ?? '');
  const [yapiId, setYapiId] = useState(duzenlenen?.yapi_id ?? proje.yapilar[0]?.id ?? '');
  const [mast, setMast] = useState<number | null>(duzenlenen?.mast_yuksekligi_m ?? null);
  const [esikler, setEsikler] = useState<number[]>(duzenlenen?.h_esikleri ?? proje.h_esikleri_varsayilan);
  const [deltaT, setDeltaT] = useState<number | null>(duzenlenen?.deltaT ?? null);
  const [cihaz, setCihaz] = useState(duzenlenen?.cihaz ?? '');
  const [aktif, setAktif] = useState(duzenlenen?.aktif_mi !== false);
  const [manuelKonum, setManuelKonum] = useState(false);
  const [lat, setLat] = useState<number | null>(konum?.lat ?? duzenlenen?.lat ?? null);
  const [lng, setLng] = useState<number | null>(konum?.lng ?? duzenlenen?.lng ?? null);

  const tabanVar = proje.kot_seviyeleri.length > 0 || proje.yapilar.length > 0;
  const gecerli = !!isim.trim() && mast !== null && mast > 0 && lat !== null && lng !== null && (taban === 'kot' ? !!kotId : !!yapiId);
  const ucKotu = mast !== null ? paratonerTepeKotu({ yapi_id: taban === 'yapi' ? yapiId : null, kot_seviyesi_id: taban === 'kot' ? kotId : null, mast_yuksekligi_m: mast }, proje) : null;

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    if (!gecerli) return;
    const temel = {
      isim: isim.trim(),
      lat: lat as number,
      lng: lng as number,
      kot_seviyesi_id: taban === 'kot' ? kotId : null,
      yapi_id: taban === 'yapi' ? yapiId : null,
      mast_yuksekligi_m: mast as number,
      h_esikleri: esikler.length ? esikler : [2, 3, 4, 5],
      deltaT: paratonerBazli ? deltaT : (duzenlenen?.deltaT ?? null),
      cihaz: cihaz.trim(),
    };
    kaydet(duzenlenen ? { ...duzenlenen, ...temel, aktif_mi: aktif } : { ...yeniParatoner(temel), aktif_mi: aktif });
  }

  return (
    <Pencere acik kapat={kapat} baslik={duzenlenen ? t.baslikDuzenle : t.baslikYeni}>
      {!tabanVar ? (
        <>
          <p className="uyari-metin">{m.genel.onceKot}</p>
          <div className="modal-butonlar">
            <button className="ikincil-buton" onClick={kapat}>
              {m.ortak.kapat}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={gonder} className="form-dikey">
          <label>
            {m.genel.isim}
            <input autoFocus value={isim} onChange={(e) => setIsim(e.target.value)} />
          </label>

          <Anahtar id="manuel-konum" checked={manuelKonum} onCheckedChange={setManuelKonum} etiket={t.elleKoordinat} />
          {manuelKonum && (
            <div className="form-grid-2">
              <label>
                {t.enlem}
                <SayiGirdisi deger={lat} degisti={setLat} />
              </label>
              <label>
                {t.boylam}
                <SayiGirdisi deger={lng} degisti={setLng} />
              </label>
            </div>
          )}

          <div>
            <div className="alan-etiketi">{t.taban}</div>
            <div className="form-grid-2">
              <button type="button" className={taban === 'kot' ? 'mod-aktif' : ''} onClick={() => setTaban('kot')}>
                {t.kotta}
              </button>
              <button type="button" className={taban === 'yapi' ? 'mod-aktif' : ''} onClick={() => setTaban('yapi')} disabled={proje.yapilar.length === 0}>
                {t.yapida}
              </button>
            </div>
          </div>
          {taban === 'kot' ? (
            <label>
              {t.kotSeviyesi}
              <select value={kotId} onChange={(e) => setKotId(e.target.value)}>
                {proje.kot_seviyeleri.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.isim} ({kotMetni(k.taban_kottan_yukseklik_m)} m)
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              {t.yapi}
              <select value={yapiId} onChange={(e) => setYapiId(e.target.value)}>
                {proje.yapilar.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.isim} (H = {sayi(y.H_m)} m)
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            {t.mast(taban === 'yapi')}
            <SayiGirdisi deger={mast} degisti={setMast} asgari={0} asgariHaric placeholder={m.genel.ornek('9')} />
          </label>
          {ucKotu !== null && <p className="ipucu-kucuk">{t.ucKotu(kotMetni(ucKotu, 2))}</p>}

          {paratonerBazli && (
            <label>
              {t.deltaT}
              <DeltaTSecici deger={deltaT} degisti={setDeltaT} />
              <span className="ipucu-kucuk">
                {deltaT === null ? (proje.deltaT ? t.deltaTVarsayilan(proje.deltaT) : t.deltaTYok) : ''}
              </span>
            </label>
          )}

          <label>
            {t.cihaz}
            <input value={cihaz} onChange={(e) => setCihaz(e.target.value)} placeholder={proje.cihaz?.trim() ? t.cihazProje(proje.cihaz.trim()) : m.genel.istegeBagli} />
          </label>

          <div>
            <div className="alan-etiketi">{t.cemberler}</div>
            <DegerListesi degerler={esikler} degisti={setEsikler} />
          </div>

          <Anahtar id="paratoner-etkin" checked={aktif} onCheckedChange={setAktif} etiket={aktif ? t.etkin : t.devreDisi} />
          <p className="ipucu-kucuk">{t.seviyeNotu}</p>

          <div className="modal-butonlar">
            <button type="button" className="ikincil-buton" onClick={kapat}>
              {m.ortak.iptal}
            </button>
            <button type="submit" className="buton-birincil" disabled={!gecerli}>
              {m.genel.kaydet}
            </button>
          </div>
        </form>
      )}
    </Pencere>
  );
}
