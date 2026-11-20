// Ayarlar › C profilleri: sık kullanılan yapı türleri için risk katsayısı takımları.
// Profiller bu bilgisayarda saklanır ve bütün projelerde yapı formundan seçilir.

import { Plus, Trash2 } from 'lucide-react';
import { MALZEMELER, c2Degeri, cSecenekleri, type Malzeme } from '../../core';
import type { Metinler } from '../../dil';
import { PROFIL_ADI_SINIRI, PROFIL_SAYISI_SINIRI, bosProfil, ornekProfiller, tanimliKatsayiSayisi, type CProfili, type TekliC } from '../durum/cProfilleri';
import { useProje } from '../durum/ProjeSaglayici';
import { useEtkilesim } from '../ortak/Etkilesim';
import { useMetinler } from '../ortak/useMetinler';

const cMetni = (m: Metinler, d: number) => m.bicim.sayi(d, d % 1 === 0 ? 0 : 2);

/** Profilin tek satırlık özeti: "C2 1 · C3 2 · C4 0,5 · C5 5". */
function ozet(m: Metinler, p: CProfili): string {
  const c = (d: number) => cMetni(m, d);
  const parcalar = [
    p.C1 !== null ? `C1 ${c(p.C1)}` : null,
    p.C2_secim ? `C2 ${c(c2Degeri(p.C2_secim))}` : null,
    p.C3 !== null ? `C3 ${c(p.C3)}` : null,
    p.C4 !== null ? `C4 ${c(p.C4)}` : null,
    p.C5 !== null ? `C5 ${c(p.C5)}` : null,
  ].filter(Boolean);
  return parcalar.length ? parcalar.join(' · ') : m.cProfil.katsayiYok;
}

function Katsayi({ ad, deger, degisti }: { ad: TekliC; deger: number | null; degisti: (d: number | null) => void }) {
  const m = useMetinler();
  return (
    <label>
      {m.cBasliklari[ad]}
      <select value={deger ?? ''} onChange={(e) => degisti(e.target.value === '' ? null : Number(e.target.value))}>
        <option value="">{m.cProfil.yapidaSecilir}</option>
        {cSecenekleri(m)[ad].map((s) => (
          <option key={s.deger} value={s.deger}>
            {cMetni(m, s.deger)} — {s.etiket}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CProfilleriAyarlari() {
  const { ayarlar, ayarGuncelle } = useProje();
  const { onayla } = useEtkilesim();
  const m = useMetinler();
  const t = m.cProfil;
  const profiller = ayarlar.cProfilleri;
  const yaz = (liste: CProfili[]) => ayarGuncelle({ cProfilleri: liste });
  const degistir = (id: string, d: Partial<CProfili>) => yaz(profiller.map((p) => (p.id === id ? { ...p, ...d } : p)));

  const adlar = profiller.map((p) => p.ad.trim().toLocaleLowerCase(m.bicim.yerel));
  const adSorunu = (p: CProfili): string | null => {
    const ad = p.ad.trim().toLocaleLowerCase(m.bicim.yerel);
    if (!ad) return t.adBos;
    if (adlar.filter((a) => a === ad).length > 1) return t.adTekrar;
    return null;
  };

  function malzeme(p: CProfili, alan: 'yapi' | 'cati', deger: string) {
    if (deger === '') return degistir(p.id, { C2_secim: null });
    // C2 iki seçimden bulunur: biri seçilince diğeri "normal" ile başlar, kullanıcı değiştirir.
    const mevcut = p.C2_secim ?? { yapi: 'normal' as Malzeme, cati: 'normal' as Malzeme };
    degistir(p.id, { C2_secim: { ...mevcut, [alan]: deger as Malzeme } });
  }

  async function sil(p: CProfili) {
    if (await onayla({ baslik: t.silBaslik, aciklama: t.silAciklama(p.ad || t.adsiz), onayEtiketi: m.genel.sil, tehlikeli: true })) {
      yaz(profiller.filter((x) => x.id !== p.id));
    }
  }

  async function ornekleriYukle() {
    const onay = await onayla({
      baslik: t.ornekBaslik,
      aciklama: t.ornekAciklama,
      onayEtiketi: t.geriYukle,
      tehlikeli: true,
    });
    if (onay) yaz(ornekProfiller(m));
  }

  return (
    <div className="form-dikey">
      <p className="ipucu">{t.giris}</p>
      <div className="uyari-blok">
        {t.uyari1} <b>{t.uyariC1}</b>
        {t.uyari2}
      </div>

      {profiller.length === 0 && <p className="ipucu">{t.bos}</p>}

      <div className="profil-listesi">
        {profiller.map((p) => {
          const sorun = adSorunu(p);
          return (
            <details key={p.id} className="profil-karti">
              <summary>
                <span className="profil-ad">{p.ad.trim() || t.adsiz}</span>
                <span className="profil-ozet">{ozet(m, p)}</span>
                <span className="kayit-etiketi">{tanimliKatsayiSayisi(p)}/5</span>
              </summary>
              <div className="form-dikey profil-govde">
                <label>
                  {t.profilAdi}
                  <input value={p.ad} maxLength={PROFIL_ADI_SINIRI} onChange={(e) => degistir(p.id, { ad: e.target.value })} placeholder={t.adOrnek} className={sorun ? 'girdi-eksik' : ''} />
                </label>
                {sorun && <p className="ipucu-kucuk hata-metni">{sorun}</p>}
                <Katsayi ad="C1" deger={p.C1} degisti={(d) => degistir(p.id, { C1: d })} />
                <div>
                  <div className="alan-etiketi">{m.cBasliklari.C2}</div>
                  <div className="form-grid-2">
                    <select value={p.C2_secim?.yapi ?? ''} onChange={(e) => malzeme(p, 'yapi', e.target.value)} aria-label={t.yapiMalzemesi}>
                      <option value="">{t.yapidaSecilir}</option>
                      {MALZEMELER.map((mz) => (
                        <option key={mz} value={mz}>
                          {m.sabit.yapiMalzemesi[mz]}
                        </option>
                      ))}
                    </select>
                    <select value={p.C2_secim?.cati ?? ''} onChange={(e) => malzeme(p, 'cati', e.target.value)} aria-label={t.catiMalzemesi}>
                      <option value="">{t.yapidaSecilir}</option>
                      {MALZEMELER.map((mz) => (
                        <option key={mz} value={mz}>
                          {m.sabit.catiMalzemesi[mz]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ipucu-kucuk">{p.C2_secim ? `C2 = ${cMetni(m, c2Degeri(p.C2_secim))}` : t.c2YapidaSecilir}</div>
                </div>
                <Katsayi ad="C3" deger={p.C3} degisti={(d) => degistir(p.id, { C3: d })} />
                <Katsayi ad="C4" deger={p.C4} degisti={(d) => degistir(p.id, { C4: d })} />
                <Katsayi ad="C5" deger={p.C5} degisti={(d) => degistir(p.id, { C5: d })} />
                <button type="button" className="ikincil-buton sola-yasla" onClick={() => sil(p)}>
                  <Trash2 size={13} /> {t.silBaslik}
                </button>
              </div>
            </details>
          );
        })}
      </div>

      <div className="satir-icinde">
        <button type="button" onClick={() => yaz([...profiller, bosProfil(t.yeniProfil)])} disabled={profiller.length >= PROFIL_SAYISI_SINIRI}>
          <Plus size={14} /> {t.profilEkle}
        </button>
        <button type="button" className="baglanti-buton" onClick={ornekleriYukle}>
          {t.ornekBaslik}
        </button>
      </div>
    </div>
  );
}
