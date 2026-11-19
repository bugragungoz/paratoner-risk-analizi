// DXF altlık paneli: görünüm, birim, yerleşim (TUREF / elle), iki nokta hizalaması, ince ayar ve
// katmanlar. Altlık yalnızca görseldir; hesaba ve rapordaki harita şekline girmez.

import { useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Maximize2, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import {
  benzerligeCevir,
  birimDegistir,
  dondur,
  kaydir,
  TUREF_DILIMLERI,
  turefEpsg,
  turefOlabilir,
  type AltlikHizalamasi,
  type TurefDilimi,
} from '../../core';
import type { AltlikIslemleri } from '../durum/useAltlik';
import { aciRengi } from '../harita/aci';
import { Anahtar } from '../ortak/Anahtar';
import { useMetinler } from '../ortak/useMetinler';
import { tauriMi } from '../platform/tauri';

interface Props {
  altlik: AltlikIslemleri;
  hizalamaBaslat: (olcekSerbest: boolean) => void;
  hizalamada: boolean;
  altligaGit: () => void;
}

const sayiTr = (x: number, b = 1) => x.toFixed(b).replace('.', ',');

export function AltlikPaneli({ altlik, hizalamaBaslat, hizalamada, altligaGit }: Props) {
  const m = useMetinler();
  const { ayar, cozum, hata, okunuyor, degistir, yenidenSec, kaldir } = altlik;
  const [olcekSerbest, setOlcekSerbest] = useState(false);
  const [adim, setAdim] = useState(1);
  const [aciAdimi, setAciAdimi] = useState(1);
  if (!ayar) return null;

  const birimler: [number, string][] = [
    [1, m.altlik.birimler.m],
    [0.01, m.altlik.birimler.cm],
    [0.001, m.altlik.birimler.mm],
    [0.0254, m.altlik.birimler.inc],
    [0.3048, m.altlik.birimler.ft],
  ];
  if (!birimler.some(([b]) => b === ayar.birim)) birimler.push([ayar.birim, `${ayar.birim} m`]);

  const s = cozum?.sinirlar ?? null;
  const elleHizalama = (): AltlikHizalamasi => (s ? benzerligeCevir(ayar.hizalama, s, ayar.birim) : ayar.hizalama);
  const inceAyar = (h: AltlikHizalamasi) => degistir({ hizalama: h }, 'altlik-ince');
  const gizli = new Set(ayar.gizliKatmanlar);
  const atlanan = cozum ? Object.values(cozum.atlanan).reduce((t, n) => t + n, 0) : 0;

  return (
    <div className="panel altlik-paneli">
      <div className="altlik-baslik">
        <h3 title={ayar.yol ?? ayar.ad}>
          {m.altlik.baslik}: {ayar.ad}
        </h3>
        <button type="button" className="ikon-buton" title={m.altlik.kaldir} aria-label={m.altlik.kaldir} onClick={kaldir}>
          <Trash2 size={14} />
        </button>
      </div>

      {!cozum && (
        <div className="altlik-durum">
          <p className="ipucu-kucuk">{okunuyor ? m.altlik.okunuyor : (hata ?? (!tauriMi() || !ayar.yol ? m.altlik.tarayiciNotu : m.altlik.okunuyor))}</p>
          {!okunuyor && (
            <button type="button" className="ikincil-buton" onClick={yenidenSec}>
              {m.altlik.yenidenSec}
            </button>
          )}
        </div>
      )}

      {cozum && s && (
        <>
          <p className="ipucu-kucuk">
            {m.altlik.ozet(cozum.surum, cozum.katmanlar.length, cozum.parcalar.length)}
            {atlanan > 0 && <> · {m.altlik.atlanan(atlanan)}</>}
          </p>
          {cozum.kesildi && <p className="ipucu-kucuk altlik-uyari">{m.altlik.kesildi}</p>}

          <Anahtar id="altlik-gorunur" checked={ayar.gorunur} onCheckedChange={(v) => degistir({ gorunur: v })} etiket={m.altlik.gorunur} />
          <label className="altlik-satir">
            <span>{m.altlik.opaklik}</span>
            <input type="range" min={0.1} max={1} step={0.05} value={ayar.opaklik} onChange={(e) => degistir({ opaklik: Number(e.target.value) }, 'altlik-opaklik')} />
          </label>
          <label className="altlik-satir">
            <span>{m.altlik.renk}</span>
            <select value={ayar.renk} onChange={(e) => degistir({ renk: e.target.value === 'tek' ? 'tek' : 'katman' })}>
              <option value="katman">{m.altlik.renkKatman}</option>
              <option value="tek">{m.altlik.renkTek}</option>
            </select>
          </label>
          <label className="altlik-satir">
            <span>{m.altlik.birim}</span>
            <select
              value={ayar.birim}
              onChange={(e) => {
                const yeni = Number(e.target.value);
                degistir({ birim: yeni, hizalama: birimDegistir(ayar.hizalama, ayar.birim, yeni, s) });
              }}
            >
              {birimler.map(([b, ad]) => (
                <option key={b} value={b}>
                  {ad}
                </option>
              ))}
            </select>
          </label>
          {cozum.birim === 0 && <p className="ipucu-kucuk">{m.altlik.birimYok}</p>}

          <label className="altlik-satir">
            <span>{m.altlik.yerlesim}</span>
            <select
              value={ayar.hizalama.tur === 'turef' ? `turef:${ayar.hizalama.dilim}` : 'elle'}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'elle') degistir({ hizalama: elleHizalama() });
                else degistir({ hizalama: { tur: 'turef', dilim: Number(v.split(':')[1]) as TurefDilimi } });
              }}
            >
              <option value="elle">{m.altlik.yerlesimElle}</option>
              {TUREF_DILIMLERI.map((d) => (
                <option key={d} value={`turef:${d}`}>
                  {m.altlik.yerlesimTuref(d, turefEpsg(d))}
                </option>
              ))}
            </select>
          </label>
          {ayar.hizalama.tur === 'turef' && !turefOlabilir(s, ayar.birim) && <p className="ipucu-kucuk altlik-uyari">{m.altlik.turefAralikDisi}</p>}
          <p className="ipucu-kucuk">{m.altlik.ed50Notu}</p>

          <div className="altlik-dugmeler">
            <button type="button" className={hizalamada ? 'buton-birincil' : 'ikincil-buton'} onClick={() => hizalamaBaslat(olcekSerbest)}>
              <Crosshair size={14} /> {m.altlik.ikiNokta}
            </button>
            <button type="button" className="ikon-buton" title={m.altlik.git} aria-label={m.altlik.git} onClick={altligaGit}>
              <Maximize2 size={14} />
            </button>
          </div>
          <Anahtar id="altlik-olcek" checked={olcekSerbest} onCheckedChange={setOlcekSerbest} etiket={m.altlik.olcekSerbest} ipucu={m.altlik.olcekSerbestNotu} />

          <h4>{m.altlik.inceAyar}</h4>
          <div className="altlik-ince">
            <div className="altlik-oklar">
              <span />
              <button type="button" className="ikon-buton" title={m.altlik.kuzey} aria-label={m.altlik.kuzey} onClick={() => inceAyar(kaydir(elleHizalama(), 0, adim))}>
                <ArrowUp size={14} />
              </button>
              <span />
              <button type="button" className="ikon-buton" title={m.altlik.bati} aria-label={m.altlik.bati} onClick={() => inceAyar(kaydir(elleHizalama(), -adim, 0))}>
                <ArrowLeft size={14} />
              </button>
              <select value={adim} aria-label={m.altlik.adim} onChange={(e) => setAdim(Number(e.target.value))}>
                {[0.1, 1, 10].map((a) => (
                  <option key={a} value={a}>
                    {sayiTr(a, a < 1 ? 1 : 0)} m
                  </option>
                ))}
              </select>
              <button type="button" className="ikon-buton" title={m.altlik.dogu} aria-label={m.altlik.dogu} onClick={() => inceAyar(kaydir(elleHizalama(), adim, 0))}>
                <ArrowRight size={14} />
              </button>
              <span />
              <button type="button" className="ikon-buton" title={m.altlik.guney} aria-label={m.altlik.guney} onClick={() => inceAyar(kaydir(elleHizalama(), 0, -adim))}>
                <ArrowDown size={14} />
              </button>
              <span />
            </div>
            <div className="altlik-donus">
              <button type="button" className="ikon-buton" title={m.altlik.solaDondur} aria-label={m.altlik.solaDondur} onClick={() => inceAyar(dondur(elleHizalama(), aciAdimi, s))}>
                <RotateCcw size={14} />
              </button>
              <select value={aciAdimi} aria-label={m.altlik.adim} onChange={(e) => setAciAdimi(Number(e.target.value))}>
                {[0.1, 1, 5].map((a) => (
                  <option key={a} value={a}>
                    {sayiTr(a, a < 1 ? 1 : 0)}°
                  </option>
                ))}
              </select>
              <button type="button" className="ikon-buton" title={m.altlik.sagaDondur} aria-label={m.altlik.sagaDondur} onClick={() => inceAyar(dondur(elleHizalama(), -aciAdimi, s))}>
                <RotateCw size={14} />
              </button>
            </div>
          </div>

          <div className="altlik-baslik">
            <h4>{m.altlik.katmanlar}</h4>
            <span className="altlik-tumu">
              <button type="button" className="mini-buton" onClick={() => degistir({ gizliKatmanlar: [] })}>
                {m.altlik.tumu}
              </button>
              <button type="button" className="mini-buton" onClick={() => degistir({ gizliKatmanlar: cozum.katmanlar.map((k) => k.ad) })}>
                {m.altlik.hicbiri}
              </button>
            </span>
          </div>
          <ul className="altlik-katmanlar">
            {cozum.katmanlar.map((k) => (
              <li key={k.ad}>
                <label>
                  <input
                    type="checkbox"
                    checked={!gizli.has(k.ad)}
                    onChange={(e) => degistir({ gizliKatmanlar: e.target.checked ? ayar.gizliKatmanlar.filter((g) => g !== k.ad) : [...ayar.gizliKatmanlar, k.ad] })}
                  />
                  <span className="altlik-renk" style={{ background: aciRengi(k.renk, true) }} />
                  <span className="altlik-katman-ad" title={k.ad}>
                    {k.ad}
                  </span>
                  <span className="altlik-sayi">{k.parca}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="ipucu-kucuk">{m.altlik.raporNotu}</p>
        </>
      )}
    </div>
  );
}
