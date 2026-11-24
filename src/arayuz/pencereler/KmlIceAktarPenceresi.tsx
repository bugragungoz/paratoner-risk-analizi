// KML / KMZ içe aktarma önizlemesi: her öğenin türü, adı, yüksekliği ve tabanı burada onaylanır;
// "Ekle" bütün seçili öğeleri tek adımda (tek geri alma adımı) projeye ekler.

import { useMemo, useState } from 'react';
import {
  aktarimOnerisi,
  kotMetni,
  projeyeAktar,
  satirHatasi,
  uygunTurler,
  type AktarimOnerisi,
  type AktarimSatiri,
  type AktarimTuru,
  type KmlBelgesi,
  type NotKodu,
  type SatirHatasi,
  type TabanSecenegi,
} from '../../core';
import { useProje } from '../durum/ProjeSaglayici';
import { useEtkilesim } from '../ortak/Etkilesim';
import { Pencere } from '../ortak/Pencere';
import { SayiGirdisi } from '../ortak/SayiGirdisi';
import { useMetinler } from '../ortak/useMetinler';

interface Props {
  belge: KmlBelgesi;
  dosyaAdi: string;
  kapat: () => void;
  /** Öğeler eklendikten sonra (harita yeni öğelere odaklanır). */
  eklendi: () => void;
}

export function KmlIceAktarPenceresi({ belge, dosyaAdi, kapat, eklendi }: Props) {
  const { proje, guncelle } = useProje();
  const { bildir } = useEtkilesim();
  const m = useMetinler();
  const [oneri, setOneri] = useState<AktarimOnerisi>(() => aktarimOnerisi(belge, proje, m));

  const satirGuncelle = (sira: number, degisiklik: Partial<AktarimSatiri>) =>
    setOneri((o) => ({ ...o, satirlar: o.satirlar.map((s) => (s.oge.sira === sira ? { ...s, ...degisiklik } : s)) }));

  const hatalar = useMemo(() => new Map(oneri.satirlar.map((s) => [s.oge.sira, satirHatasi(s, oneri, proje)])), [oneri, proje]);
  const secili = oneri.satirlar.filter((s) => s.al && s.tur !== 'alma');
  const hataVar = secili.some((s) => hatalar.get(s.oge.sira));
  const nokta = oneri.satirlar.filter((s) => s.oge.geometri.tur === 'nokta').length;

  const turEtiketi: Record<AktarimTuru, string> = { yapi: m.kml.turYapi, paratoner: m.kml.turParatoner, parsel: m.kml.turParsel, alma: '-' };
  const notEtiketi: Record<NotKodu, string> = {
    VAR: m.kml.notVar,
    DELIK: m.kml.notDelik,
    PARSEL_DEGISIR: m.kml.notParsel,
    PARSEL_FAZLA: m.kml.notParselFazla,
  };
  const hataEtiketi: Record<Exclude<SatirHatasi, null>, string> = {
    MAST: m.kml.hataMast,
    GEOMETRI: m.kml.hataGeometri,
    TABAN: m.kml.hataTaban,
    CATI: m.kml.hataCati,
  };
  const tabanEtiketi = (t: TabanSecenegi) =>
    t.tur === 'cati'
      ? m.kml.cati(t.isim)
      : t.tur === 'yeniKot'
        ? m.kml.yeniKot(t.isim, kotMetni(t.yukseklik ?? 0))
        : m.kml.mevcutKot(t.isim, kotMetni(t.yukseklik ?? 0));
  const ilkKot = oneri.tabanlar.find((t) => t.tur !== 'cati')?.anahtar ?? '';

  function turDegisti(s: AktarimSatiri, tur: AktarimTuru) {
    const taban = oneri.tabanlar.find((t) => t.anahtar === s.taban);
    // Yapının tabanı çatı olamaz; paratonerden yapıya dönen satır ilk kota iner.
    satirGuncelle(s.oge.sira, { tur, taban: tur !== 'paratoner' && taban?.tur === 'cati' ? ilkKot : s.taban });
  }

  function ekle() {
    try {
      const sonuc = projeyeAktar(proje, oneri);
      guncelle(() => sonuc.proje);
      bildir(m.kml.eklendi(sonuc.yapi, sonuc.paratoner, sonuc.parsel), 'basari');
      kapat();
      eklendi();
    } catch (e) {
      bildir(m.kml.okunamadi(e instanceof Error ? e.message : String(e)), 'hata');
    }
  }

  return (
    <Pencere acik kapat={kapat} baslik={m.kml.onizlemeBaslik(dosyaAdi)} boyut="tam">
      <div className="kml-aktar">
        <p className="ipucu">
          {m.kml.ozet(nokta, oneri.satirlar.length - nokta)} {oneri.atlanan > 0 && m.kml.atlanan(oneri.atlanan)}
        </p>
        <div className="kml-tablo-kap">
          <table className="hesap-tablo kml-tablo">
            <thead>
              <tr>
                <th>{m.kml.sutunAl}</th>
                <th>{m.kml.sutunAd}</th>
                <th>{m.kml.sutunTur}</th>
                <th>{m.kml.sutunYukseklik}</th>
                <th>{m.kml.sutunTaban}</th>
                <th>{m.kml.sutunNot}</th>
              </tr>
            </thead>
            <tbody>
              {oneri.satirlar.map((s) => {
                const hata = hatalar.get(s.oge.sira);
                const dogruluk = s.oge.veri.pt_dogruluk_m;
                const turler = uygunTurler(s.oge.geometri).filter((t) => t !== 'alma');
                const tabanlar = oneri.tabanlar.filter((t) => s.tur === 'paratoner' || t.tur !== 'cati');
                return (
                  <tr key={s.oge.sira} className={s.al ? '' : 'kml-satir-pasif'}>
                    <td>
                      <input type="checkbox" checked={s.al} aria-label={m.kml.sutunAl} onChange={(e) => satirGuncelle(s.oge.sira, { al: e.target.checked })} />
                    </td>
                    <td>
                      <input value={s.ad} title={s.oge.aciklama || undefined} aria-label={m.kml.sutunAd} onChange={(e) => satirGuncelle(s.oge.sira, { ad: e.target.value })} />
                    </td>
                    <td>
                      <select value={s.tur} aria-label={m.kml.sutunTur} onChange={(e) => turDegisti(s, e.target.value as AktarimTuru)} disabled={turler.length < 2}>
                        {turler.map((t) => (
                          <option key={t} value={t}>
                            {turEtiketi[t]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {s.tur === 'parsel' ? (
                        '-'
                      ) : (
                        <SayiGirdisi
                          className="kml-sayi"
                          deger={s.yukseklik}
                          asgari={0}
                          asgariHaric
                          placeholder={s.tur === 'paratoner' ? 'Mast' : 'H'}
                          aria-label={s.tur === 'paratoner' ? m.kml.yukseklikMast : m.kml.yukseklikYapi}
                          degisti={(d) => satirGuncelle(s.oge.sira, { yukseklik: d })}
                        />
                      )}
                    </td>
                    <td>
                      {s.tur === 'parsel' ? (
                        '-'
                      ) : (
                        <select value={s.taban} aria-label={m.kml.sutunTaban} onChange={(e) => satirGuncelle(s.oge.sira, { taban: e.target.value })}>
                          {tabanlar.map((t) => (
                            <option key={t.anahtar} value={t.anahtar}>
                              {tabanEtiketi(t)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="kml-not">
                      {hata && s.al && <span className="kml-hata">{hataEtiketi[hata]}</span>}
                      {s.notlar.map((n) => (
                        <span key={n}>{notEtiketi[n]}</span>
                      ))}
                      {dogruluk && <span>{m.kml.notDogruluk(dogruluk)}</span>}
                      {s.oge.veri.pt_not && <span className="kml-saha-notu">{m.kml.sahaNotu(s.oge.veri.pt_not)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="ipucu-kucuk">{m.kml.bilgi}</p>
        <div className="pencere-alt-butonlar">
          <button type="button" className="ikincil-buton" onClick={kapat}>
            {m.ortak.iptal}
          </button>
          <button type="button" className="buton-birincil" disabled={secili.length === 0 || hataVar} onClick={ekle}>
            {m.kml.ekle(secili.length)}
          </button>
        </div>
      </div>
    </Pencere>
  );
}
