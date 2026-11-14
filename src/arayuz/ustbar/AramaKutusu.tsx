// Konum arama. Google anahtarı varsa Places API (New) ile yazarken öneri (adres, işletme, yer);
// yoksa OpenStreetMap Nominatim ile yalnızca Enter'a basınca arama (Nominatim kuralı).
// Koordinat ("39,92 32,85") her durumda doğrudan tanınır.

import { useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useProje } from '../durum/ProjeSaglayici';
import { koordinatCoz } from '../harita/konumArama';
import { nominatimAra, yeniOturum, yerAyrinti, yerOneri, type AramaSonucu, type YerOnerisi } from '../harita/servisler';
import { useEtkilesim } from '../ortak/Etkilesim';
import { disBaglantiAc } from '../platform/tauri';

type Sonuc = { tur: 'google'; oneri: YerOnerisi } | { tur: 'osm'; sonuc: AramaSonucu };

export function AramaKutusu({ git, merkez }: { git: (lat: number, lng: number) => void; merkez?: () => { lat: number; lng: number } | null }) {
  const { haritaAnahtarlari } = useProje();
  const { bildir } = useEtkilesim();
  const google = haritaAnahtarlari.google;
  const [sorgu, setSorgu] = useState('');
  const [sonuclar, setSonuclar] = useState<Sonuc[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [arandi, setArandi] = useState(false);
  const [acik, setAcik] = useState(false);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const oturum = useRef(yeniOturum());
  const istekNo = useRef(0);

  async function ara(deger: string, enter: boolean) {
    const koordinat = koordinatCoz(deger);
    if (koordinat) {
      git(koordinat.lat, koordinat.lng);
      setAcik(false);
      return;
    }
    if (deger.trim().length < 2) {
      setSonuclar([]);
      setArandi(false);
      return;
    }
    if (!google && !enter) return;
    const no = ++istekNo.current;
    setYukleniyor(true);
    setAcik(true);
    try {
      const yeni: Sonuc[] = google
        ? (await yerOneri(deger, oturum.current, merkez?.() ?? undefined)).map((oneri) => ({ tur: 'google', oneri }))
        : (await nominatimAra(deger)).map((sonuc) => ({ tur: 'osm', sonuc }));
      if (no !== istekNo.current) return;
      setSonuclar(yeni);
      setArandi(true);
    } catch (e) {
      if (no === istekNo.current) bildir(`Arama yapılamadı: ${e instanceof Error ? e.message : String(e)}`, 'hata');
    } finally {
      if (no === istekNo.current) setYukleniyor(false);
    }
  }

  function degisti(deger: string) {
    setSorgu(deger);
    setArandi(false);
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    if (google && !koordinatCoz(deger)) zamanlayici.current = setTimeout(() => ara(deger, false), 300);
    if (!google) setSonuclar([]);
  }

  async function sec(s: Sonuc) {
    setAcik(false);
    if (s.tur === 'osm') {
      git(s.sonuc.lat, s.sonuc.lng);
      setSorgu(s.sonuc.isim);
      return;
    }
    setSorgu(s.oneri.ana);
    try {
      const yer = await yerAyrinti(s.oneri.yerId, oturum.current);
      git(yer.lat, yer.lng);
    } catch (e) {
      bildir(`Yerin konumu alınamadı: ${e instanceof Error ? e.message : String(e)}`, 'hata');
    } finally {
      // Seçimle oturum biter; sonraki arama yeni oturumla başlar.
      oturum.current = yeniOturum();
    }
  }

  return (
    <div className="arama-kutusu-ustbar" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setAcik(false)}>
      <form
        className="arama-input-satir"
        onSubmit={(e) => {
          e.preventDefault();
          if (zamanlayici.current) clearTimeout(zamanlayici.current);
          ara(sorgu, true);
        }}
      >
        <Search size={14} className="arama-ikon" />
        <input
          value={sorgu}
          onChange={(e) => degisti(e.target.value)}
          onFocus={() => setAcik(true)}
          placeholder={google ? 'Adres, işletme ya da koordinat…' : 'Konum (Enter) ya da koordinat…'}
        />
        {yukleniyor && <span className="arama-yukleniyor" />}
      </form>
      {acik && (sonuclar.length > 0 || arandi) && (
        <div className="arama-sonuclar">
          {sonuclar.length === 0 ? (
            <div className="arama-durum">
              <p>Sonuç bulunamadı. Enlem ve boylamı "39,92 32,85" biçiminde de yazabilirsiniz.</p>
              <button className="baglanti-buton" onMouseDown={(e) => e.preventDefault()} onClick={() => disBaglantiAc(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sorgu)}`)}>
                "{sorgu}" için Google Haritalar'da ara →
              </button>
            </div>
          ) : (
            sonuclar.map((s, i) => (
              <div
                key={i}
                className="arama-sonuc-satir"
                onMouseDown={(e) => {
                  e.preventDefault();
                  void sec(s);
                }}
              >
                {s.tur === 'google' ? (
                  <>
                    <b>{s.oneri.ana}</b>
                    {s.oneri.ikincil && <span className="arama-ikincil"> {s.oneri.ikincil}</span>}
                  </>
                ) : (
                  s.sonuc.isim
                )}
              </div>
            ))
          )}
          <div className="arama-kaynak">{google ? 'Google' : '© OpenStreetMap katkıda bulunanlar · Nominatim'}</div>
        </div>
      )}
    </div>
  );
}
