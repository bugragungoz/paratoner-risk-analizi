import { AlertTriangle } from 'lucide-react';
import { eksikYapilar, hesapTablosuCsv, ngHesapla, raporOzeti, type Proje, type Yapi, type YapiSonucu } from '../../core';
import type { Metinler } from '../../dil';
import { useProje } from '../durum/ProjeSaglayici';
import { useEtkilesim } from '../ortak/Etkilesim';
import { Pencere } from '../ortak/Pencere';
import { dosyaKaydet, guvenliDosyaAdi } from '../platform/tauri';
import { useMetinler } from '../ortak/useMetinler';

/** Sayıyı anlamlı basamakla yazar: küçük olasılık değerleri (Nd, Nc) sıfıra yuvarlanıp kaybolmasın. */
function hassas(m: Metinler, deger: number | null | undefined, basamak = 4): string {
  if (deger === null || deger === undefined || !Number.isFinite(deger)) return '-';
  if (deger === 0) return '0';
  return deger.toLocaleString(m.bicim.yerel, { maximumSignificantDigits: basamak, useGrouping: false });
}

/** Risk zincirinin adım adım dökümü: her satırda formül, yerine konan değerler ve sonuç. */
function HesapDokumu({ y, yapi, proje }: { y: YapiSonucu; yapi: Yapi | undefined; proje: Proje }) {
  const m = useMetinler();
  const t = m.hesapTablosu;
  const { sayi } = m.bicim;
  const h = (d: number | null | undefined) => hassas(m, d);
  const r = y.risk;
  if (!r || !yapi) return null;
  const H = yapi.H_m ?? 0;
  const manuel = !!yapi.manuelBoyut && !!yapi.L_m && !!yapi.W_m;
  const adimlar: { ad: string; formul: string; yerine: string; sonuc: string }[] = [
    manuel
      ? {
          ad: t.adimAe,
          formul: 'Ae = L·W + 6H(L + W) + 9πH²',
          yerine: `${sayi(yapi.L_m)}·${sayi(yapi.W_m)} + 6·${sayi(H)}·(${sayi(yapi.L_m)} + ${sayi(yapi.W_m)}) + 9π·${sayi(H)}²`,
          sonuc: `${sayi(r.Ae)} m²`,
        }
      : {
          ad: t.adimAe,
          formul: 'Ae = A + 3H·P + 9πH²',
          yerine: `${sayi(y.alan)} + 3·${sayi(H)}·${sayi(y.cevre)} + 9π·${sayi(H)}²`,
          sonuc: `${sayi(r.Ae)} m²`,
        },
    { ad: t.adimNg, formul: t.ngFormul, yerine: t.ngYerine(h(proje.Nk)), sonuc: `${h(r.Ng)} ${t.birimNg}` },
    { ad: t.adimNd, formul: 'Nd = Ae · Ng · C1 · 10⁻⁶', yerine: `${sayi(r.Ae)} · ${h(r.Ng)} · ${h(yapi.C1)} · 10⁻⁶`, sonuc: `${h(r.Nd)} ${t.birimYil}` },
    { ad: t.adimC, formul: 'C = C2 · C3 · C4 · C5', yerine: [yapi.C2, yapi.C3, yapi.C4, yapi.C5].map((c) => h(c)).join(' · '), sonuc: h(r.C) },
    { ad: t.adimNc, formul: t.ncFormul, yerine: t.ncYerine(h(r.C)), sonuc: `${h(r.Nc)} ${t.birimYil}` },
    r.istegeBagli
      ? { ad: t.adimKarsilastirma, formul: 'Nd ≤ Nc', yerine: `${h(r.Nd)} ≤ ${h(r.Nc)}`, sonuc: t.istegeBagli }
      : { ad: t.adimE, formul: 'E = 1 − Nc / Nd', yerine: `1 − ${h(r.Nc)} / ${h(r.Nd)}`, sonuc: `${sayi(r.E, 4)} → ${r.seviye}` },
  ];
  return (
    <details className="hesap-dokum">
      <summary>{t.dokum}</summary>
      <table className="hesap-dokum-tablo">
        <tbody>
          {adimlar.map((a) => (
            <tr key={a.ad}>
              <th scope="row">{a.ad}</th>
              <td>{a.formul}</td>
              <td>= {a.yerine}</td>
              <td className="hesap-dokum-sonuc">= {a.sonuc}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ipucu-kucuk hesap-dokum-not">
        {manuel ? t.manuelNot : t.poligonNot(sayi(y.alan), sayi(y.cevre))} H = {sayi(H)} m. {t.esikler}
      </p>
    </details>
  );
}

export function HesapTablosu({ kapat }: { kapat: () => void }) {
  const { proje, sonuc } = useProje();
  const { bildir } = useEtkilesim();
  const m = useMetinler();
  const t = m.hesapTablosu;
  const { sayi } = m.bicim;
  const yapilar = [...sonuc.yapilar].sort(
    (a, b) => Number(!!proje.yapilar.find((y) => y.id === b.yapiId)?.kritik_mi) - Number(!!proje.yapilar.find((y) => y.id === a.yapiId)?.kritik_mi),
  );
  const enterpolasyonVar = sonuc.yapilar.some((y) => y.satirlar.some((s) => s.enterpoleEdildi));
  const ozet = raporOzeti(sonuc);
  const eksik = eksikYapilar(sonuc).length - ozet.hesaplanamadi;

  async function csvIndir() {
    try {
      // BOM: Excel'in Türkçe karakterleri doğru göstermesi için.
      const yol = await dosyaKaydet(`${guvenliDosyaAdi(proje.isim)}-${t.csvDosyaAdi}.csv`, `﻿${hesapTablosuCsv(sonuc, m)}`, { ad: 'CSV', uzantilar: ['csv'] });
      if (yol) bildir(t.csvKaydedildi(yol), 'basari');
    } catch (e) {
      bildir(t.csvKaydedilemedi(e instanceof Error ? e.message : String(e)), 'hata');
    }
  }

  return (
    <Pencere
      acik
      kapat={kapat}
      baslik={t.baslik}
      boyut="tam"
      ustSag={
        <button className="mini-buton" onClick={csvIndir} disabled={sonuc.yapilar.length === 0}>
          {t.csvKaydet}
        </button>
      }
    >
      {sonuc.dogrulama.hatalar.length > 0 && (
        <div className="uyari-blok hata">
          <b>{t.eksikGirdiler}</b>
          <ul>
            {sonuc.dogrulama.hatalar.map((h, i) => (
              <li key={i}>{h.mesaj}</li>
            ))}
          </ul>
        </div>
      )}
      {sonuc.dogrulama.uyarilar.length > 0 && (
        <div className="uyari-blok">
          <b>{t.gozdenGecir}</b>
          <ul>
            {sonuc.dogrulama.uyarilar.map((u, i) => (
              <li key={i}>{u.mesaj}</li>
            ))}
          </ul>
        </div>
      )}
      {yapilar.length > 0 && (
        <div className="hesap-ozet">
          <div className="hesap-ozet-kutu">
            <span className="hesap-ozet-sayi">{ozet.toplam}</span> {t.ozetYapi}
          </div>
          <div className="hesap-ozet-kutu tamam">
            <span className="hesap-ozet-sayi">{ozet.yeterli}</span> {t.ozetYeterli}
          </div>
          {ozet.istegeBagli > 0 && (
            <div className="hesap-ozet-kutu">
              <span className="hesap-ozet-sayi">{ozet.istegeBagli}</span> {t.ozetIstegeBagli}
            </div>
          )}
          <div className={`hesap-ozet-kutu ${eksik > 0 ? 'hata' : ''}`}>
            <span className="hesap-ozet-sayi">{eksik}</span> {t.ozetTamKorunmuyor}
          </div>
          {ozet.hesaplanamadi > 0 && (
            <div className="hesap-ozet-kutu hata">
              <span className="hesap-ozet-sayi">{ozet.hesaplanamadi}</span> {t.ozetHesaplanamadi}
            </div>
          )}
          <div className="hesap-ozet-kutu sag">
            Nk = {hassas(m, proje.Nk)} · Ng = {proje.Nk ? hassas(m, ngHesapla(proje.Nk)) : '-'} {t.birimNg}
          </div>
        </div>
      )}
      {yapilar.length === 0 ? (
        <p className="ipucu">{t.yapiYok}</p>
      ) : (
        <div className="hesap-tablosu-govde">
          {yapilar.map((y) => {
            const yapi = proje.yapilar.find((x) => x.id === y.yapiId);
            return (
              <div key={y.yapiId} className={`hesap-yapi-blok ${yapi?.kritik_mi ? 'hesap-yapi-kritik' : ''}`}>
                <div className="hesap-yapi-baslik">
                  <span className="hesap-yapi-isim">
                    {y.yapiIsim}
                    {yapi?.kritik_mi && <span className="kritik-etiket">{m.genel.kritik}</span>}
                  </span>
                  {y.risk && (
                    <span className="seviye-rozet" style={{ background: y.risk.renk }}>
                      {y.risk.seviye}
                    </span>
                  )}
                  <span className="durum-rozet" style={{ background: y.nihai.renk }}>
                    {t.nihai(y.nihai.etiket)}
                  </span>
                  {y.risk && (
                    <span className="hesap-yapi-detay sag">
                      Ae = {sayi(y.risk.Ae)} m² · Nd = {sayi(y.risk.Nd, 5)} · Nc = {sayi(y.risk.Nc, 5)} · E = {sayi(y.risk.E, 3)}
                    </span>
                  )}
                </div>

                {(y.hatalar.length > 0 || y.uyarilar.length > 0) && (
                  <div className="hesap-yapi-notlar">
                    {y.hatalar.map((h, i) => (
                      <div key={`h${i}`} className="hata-metni">
                        {h}
                      </div>
                    ))}
                    {y.uyarilar.map((u, i) => (
                      <div key={`u${i}`} className="uyari-satiri">
                        <AlertTriangle size={12} /> {u}
                      </div>
                    ))}
                  </div>
                )}

                <HesapDokumu y={y} yapi={yapi} proje={proje} />

                {y.satirlar.length > 0 ? (
                  <table className="hesap-tablo">
                    <thead>
                      <tr>
                        <th>{t.paratoner}</th>
                        <th>ΔT (µs)</th>
                        <th>h (m)</th>
                        <th>Rp (m)</th>
                        <th>{t.mesafeYakin}</th>
                        <th>{t.mesafeUzak}</th>
                        <th>{t.marjYakin}</th>
                        <th>{t.marjUzak}</th>
                        <th>{t.durum}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {y.satirlar.map((s) => (
                        <tr key={s.paratonerId} className={s.paratonerId === y.birincilParatonerId ? 'hesap-satir-birincil' : ''}>
                          <td>
                            {s.paratonerIsim}
                            {s.paratonerId === y.birincilParatonerId && <span className="birincil-etiket">{t.birincil}</span>}
                          </td>
                          {s.gecerli ? (
                            <>
                              <td>{s.deltaT}</td>
                              <td>
                                {sayi(s.gercekH)}
                                {s.enterpoleEdildi ? '*' : ''}
                              </td>
                              <td>{sayi(s.rp)}</td>
                              <td>{sayi(s.enYakin)}</td>
                              <td>{sayi(s.enUzak)}</td>
                              <td className={(s.marjEnYakin ?? 0) < 0 ? 'hesap-negatif' : ''}>{sayi(s.marjEnYakin)}</td>
                              <td className={(s.marjEnUzak ?? 0) < 0 ? 'hesap-negatif' : ''}>{sayi(s.marjEnUzak)}</td>
                              <td>
                                <span className="durum-rozet" style={{ background: s.durumRenk }}>
                                  {s.durum}
                                </span>
                              </td>
                            </>
                          ) : (
                            <td colSpan={8} className="hesap-gecersiz">
                              {s.gercekH !== undefined ? `h = ${sayi(s.gercekH)} m — ` : ''}
                              {s.neden}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  y.hatalar.length === 0 && <p className="ipucu tablo-ici">{t.paratonerYok}</p>
                )}
              </div>
            );
          })}
          {enterpolasyonVar && <p className="ipucu-kucuk">{t.enterpolasyon}</p>}
        </div>
      )}
    </Pencere>
  );
}
