// DXF dışa aktarma: koordinat sistemi seçimi (TUREF / TM dilimi ya da yerel) ve kaydetme.

import { useMemo, useState } from 'react';
import { dxfBaytlari, dxfCizimi, projeOrtasi, TUREF_DILIMLERI, turefDilimi, turefEpsg, type DxfSistemi, type LatLng, type TurefDilimi } from '../../core';
import { yerelOrijinAyarla } from '../durum/eylemler';
import { UYGULAMA } from '../durum/kalicilik';
import { useProje } from '../durum/ProjeSaglayici';
import { useEtkilesim } from '../ortak/Etkilesim';
import { Pencere } from '../ortak/Pencere';
import { useMetinler } from '../ortak/useMetinler';
import { dosyaKaydet, guvenliDosyaAdi } from '../platform/tauri';

const derece = (x: number) => x.toFixed(6).replace('.', ',');

export function DxfDisaAktarPenceresi({ kapat }: { kapat: () => void }) {
  const { proje, sonuc, guncelle } = useProje();
  const { bildir } = useEtkilesim();
  const m = useMetinler();
  const orta = useMemo(() => projeOrtasi(proje), [proje]);
  const onerilenDilim = orta ? turefDilimi(orta.lng) : 33;
  const [tur, setTur] = useState<'turef' | 'yerel'>('turef');
  const [dilim, setDilim] = useState<TurefDilimi>(onerilenDilim);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const orijin = proje.yerel_orijin ?? null;

  async function kaydet() {
    if (!orta) {
      bildir(m.dxf.bos, 'hata');
      return;
    }
    setKaydediliyor(true);
    try {
      let sistem: DxfSistemi;
      if (tur === 'yerel') {
        let o: LatLng | null = orijin;
        if (!o) {
          // İlk yerel çıktı: başlangıç noktası projede saklanır, sonraki çıktılar üst üste gelir.
          o = orta;
          guncelle(yerelOrijinAyarla(o), 'yerel-orijin');
        }
        sistem = { tur: 'yerel', orijin: o };
      } else sistem = { tur: 'turef', dilim };
      const uretim = m.dxf.uretim(UYGULAMA, new Date().toLocaleDateString('tr-TR'));
      const bayt = dxfBaytlari(dxfCizimi(proje, sonuc, sistem, m, uretim));
      const ek = tur === 'turef' ? `TM${dilim}` : 'yerel';
      const yol = await dosyaKaydet(`${guvenliDosyaAdi(proje.isim, 'proje')} (${ek}).dxf`, bayt, { ad: m.dxf.filtre, uzantilar: ['dxf'] });
      if (yol) {
        bildir(m.dxf.kaydedildi(yol), 'basari');
        kapat();
      }
    } catch (e) {
      bildir(m.dxf.kaydedilemedi(e instanceof Error ? e.message : String(e)), 'hata');
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <Pencere acik kapat={kapat} baslik={m.dxf.baslik}>
      <div className="form-dikey dxf-pencere">
        <div className="alan-etiketi">{m.dxf.sistem}</div>
        <label className="dxf-secenek">
          <input type="radio" name="dxf-sistem" checked={tur === 'turef'} onChange={() => setTur('turef')} />
          <span>
            <b>{m.dxf.turef}</b>
            <span className="ipucu-kucuk">{m.dxf.turefAciklama}</span>
          </span>
        </label>
        {tur === 'turef' && (
          <div className="dxf-alt">
            <label>
              {m.dxf.dilim}{' '}
              <select value={dilim} onChange={(e) => setDilim(Number(e.target.value) as TurefDilimi)}>
                {TUREF_DILIMLERI.map((d) => (
                  <option key={d} value={d}>
                    {m.dxf.dilimSecenegi(d, turefEpsg(d))}
                  </option>
                ))}
              </select>
            </label>
            {dilim !== onerilenDilim && <p className="ipucu-kucuk dxf-uyari">{m.dxf.dilimUyari(onerilenDilim)}</p>}
          </div>
        )}
        <label className="dxf-secenek">
          <input type="radio" name="dxf-sistem" checked={tur === 'yerel'} onChange={() => setTur('yerel')} />
          <span>
            <b>{m.dxf.yerel}</b>
            <span className="ipucu-kucuk">{m.dxf.yerelAciklama}</span>
          </span>
        </label>
        {tur === 'yerel' && (
          <div className="dxf-alt">
            {orijin ? (
              <>
                <span className="ipucu-kucuk">{m.dxf.orijin(derece(orijin.lat), derece(orijin.lng))}</span>
                {orta && (orta.lat !== orijin.lat || orta.lng !== orijin.lng) && (
                  <button type="button" className="ikincil-buton" onClick={() => guncelle(yerelOrijinAyarla(orta), 'yerel-orijin')}>
                    {m.dxf.orijinSifirla}
                  </button>
                )}
              </>
            ) : (
              <span className="ipucu-kucuk">{m.dxf.orijinYok}</span>
            )}
          </div>
        )}
        <p className="ipucu-kucuk">{m.dxf.katmanlar}</p>
        <div className="pencere-alt-butonlar">
          <button type="button" className="ikincil-buton" onClick={kapat}>
            {m.ortak.iptal}
          </button>
          <button type="button" className="buton-birincil" onClick={kaydet} disabled={kaydediliyor || !orta}>
            {m.dxf.kaydet}
          </button>
        </div>
      </div>
    </Pencere>
  );
}
