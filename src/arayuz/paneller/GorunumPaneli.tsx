import { SEVIYELER, type Seviye } from '../../core';
import { useProje } from '../durum/ProjeSaglayici';
import type { HaritaGorunumu } from '../harita/Harita';
import { Anahtar } from '../ortak/Anahtar';
import { useMetinler } from '../ortak/useMetinler';

interface Props {
  gorunum: HaritaGorunumu;
  degistir: (g: HaritaGorunumu) => void;
}

const gecis = <T,>(kume: Set<T>, deger: T): Set<T> => {
  const yeni = new Set(kume);
  if (yeni.has(deger)) yeni.delete(deger);
  else yeni.add(deger);
  return yeni;
};

/** Haritada neyin gösterileceği (yalnızca görsel; hesabı etkilemez). */
export function GorunumPaneli({ gorunum, degistir }: Props) {
  const { proje, ayarlar, ayarGuncelle } = useProje();
  const t = useMetinler().gorunum;
  const tumEsikler = [...new Set(proje.paratonerler.flatMap((p) => p.h_esikleri))].sort((a, b) => a - b);

  return (
    <div className="panel">
      <h3>{t.baslik}</h3>
      <Anahtar id="kapsama-goster" checked={ayarlar.kapsamaGoster} onCheckedChange={(v) => ayarGuncelle({ kapsamaGoster: v })} etiket={t.kapsama} />

      {tumEsikler.length > 0 && !gorunum.izolasyon && (
        <>
          <h4>{t.cemberH}</h4>
          {tumEsikler.map((h) => (
            <Anahtar key={h} id={`h-${h}`} checked={gorunum.hEsikleri.has(h)} onCheckedChange={() => degistir({ ...gorunum, hEsikleri: gecis(gorunum.hEsikleri, h) })} etiket={`h = ${h} m`} />
          ))}
          <h4>{t.cemberSeviye}</h4>
          {SEVIYELER.map((sv: Seviye) => (
            <Anahtar key={sv} id={`sv-${sv}`} checked={gorunum.seviyeler.has(sv)} onCheckedChange={() => degistir({ ...gorunum, seviyeler: gecis(gorunum.seviyeler, sv) })} etiket={t.seviye(sv)} />
          ))}
        </>
      )}

      <h4>{t.izolasyon}</h4>
      <Anahtar
        id="izolasyon"
        checked={gorunum.izolasyon}
        onCheckedChange={(v) => degistir({ ...gorunum, izolasyon: v, odakYapiId: v ? gorunum.odakYapiId : null })}
        etiket={t.izolasyonAnahtar}
      />
      {gorunum.izolasyon && (
        <select className="girinti" value={gorunum.odakYapiId ?? ''} onChange={(e) => degistir({ ...gorunum, odakYapiId: e.target.value || null })}>
          <option value="">{t.yapiSecin}</option>
          {proje.yapilar.map((y) => (
            <option key={y.id} value={y.id}>
              {y.isim}
            </option>
          ))}
        </select>
      )}
      <p className="ipucu-kucuk ust-bosluk">{t.not}</p>
    </div>
  );
}
