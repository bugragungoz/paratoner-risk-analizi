import { useState } from 'react';
import { kotMetni, paratonerTepeKotu, sayi, yeniParatoner, type LatLng, type Paratoner } from '../../core';
import { useProje } from '../durum/ProjeSaglayici';
import { DeltaTSecici } from '../paneller/ProjeParametreleriPaneli';
import { Anahtar } from '../ortak/Anahtar';
import { DegerListesi } from '../ortak/DegerListesi';
import { Pencere } from '../ortak/Pencere';
import { SayiGirdisi } from '../ortak/SayiGirdisi';

interface Props {
  /** Yeni paratoner için haritada tıklanan konum. */
  konum: LatLng | null;
  duzenlenen: Paratoner | null;
  kapat: () => void;
  kaydet: (p: Paratoner) => void;
}

export function ParatonerFormu({ konum, duzenlenen, kapat, kaydet }: Props) {
  const { proje } = useProje();
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
    <Pencere acik kapat={kapat} baslik={duzenlenen ? 'Paratoneri düzenle' : 'Yeni paratoner'}>
      {!tabanVar ? (
        <>
          <p className="uyari-metin">Önce en az bir kot seviyesi tanımlamanız gerekiyor.</p>
          <div className="modal-butonlar">
            <button className="ikincil-buton" onClick={kapat}>
              Kapat
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={gonder} className="form-dikey">
          <label>
            İsim
            <input autoFocus value={isim} onChange={(e) => setIsim(e.target.value)} />
          </label>

          <Anahtar id="manuel-konum" checked={manuelKonum} onCheckedChange={setManuelKonum} etiket="Koordinatları elle düzenle" />
          {manuelKonum && (
            <div className="form-grid-2">
              <label>
                Enlem
                <SayiGirdisi deger={lat} degisti={setLat} />
              </label>
              <label>
                Boylam
                <SayiGirdisi deger={lng} degisti={setLng} />
              </label>
            </div>
          )}

          <div>
            <div className="alan-etiketi">Paratonerin tabanı</div>
            <div className="form-grid-2">
              <button type="button" className={taban === 'kot' ? 'mod-aktif' : ''} onClick={() => setTaban('kot')}>
                Kot seviyesinde
              </button>
              <button type="button" className={taban === 'yapi' ? 'mod-aktif' : ''} onClick={() => setTaban('yapi')} disabled={proje.yapilar.length === 0}>
                Bir yapının üzerinde
              </button>
            </div>
          </div>
          {taban === 'kot' ? (
            <label>
              Kot seviyesi
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
              Yapı
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
            Mast yüksekliği (m) — {taban === 'yapi' ? 'yapının çatısından itibaren' : 'kot seviyesinden itibaren'}
            <SayiGirdisi deger={mast} degisti={setMast} asgari={0} asgariHaric placeholder="örn. 9" />
          </label>
          {ucKotu !== null && <p className="ipucu-kucuk">Paratoner ucunun kotu: {kotMetni(ucKotu, 2)} m</p>}

          {paratonerBazli && (
            <label>
              ΔT — bu paratonerin yayılım süresi
              <DeltaTSecici deger={deltaT} degisti={setDeltaT} />
              <span className="ipucu-kucuk">
                {deltaT === null ? (proje.deltaT ? `Seçilmezse projenin varsayılanı (${proje.deltaT} µs) kullanılır.` : 'Seçilmezse hesap yapılamaz (projede varsayılan ΔT yok).') : ''}
              </span>
            </label>
          )}

          <label>
            Cihaz (marka / model, rapor için)
            <input value={cihaz} onChange={(e) => setCihaz(e.target.value)} placeholder={proje.cihaz?.trim() ? `Boşsa projenin cihazı: ${proje.cihaz.trim()}` : 'İsteğe bağlı'} />
          </label>

          <div>
            <div className="alan-etiketi">Haritadaki referans çemberleri (h, yalnızca görsel)</div>
            <DegerListesi degerler={esikler} degisti={setEsikler} />
          </div>

          <Anahtar id="paratoner-etkin" checked={aktif} onCheckedChange={setAktif} etiket={aktif ? 'Etkin (hesaba katılır)' : 'Devre dışı (hesaba katılmaz)'} />
          <p className="ipucu-kucuk">Koruma seviyesi her yapının kendi risk analizinden belirlenir; paratonerde ayrıca seçilmez.</p>

          <div className="modal-butonlar">
            <button type="button" className="ikincil-buton" onClick={kapat}>
              İptal
            </button>
            <button type="submit" className="buton-birincil" disabled={!gecerli}>
              Kaydet
            </button>
          </div>
        </form>
      )}
    </Pencere>
  );
}
