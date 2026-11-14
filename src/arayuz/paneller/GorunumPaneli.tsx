import { SEVIYELER, type Seviye } from '../../core';
import { useProje } from '../durum/ProjeSaglayici';
import type { HaritaGorunumu } from '../harita/Harita';
import { Anahtar } from '../ortak/Anahtar';

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
  const tumEsikler = [...new Set(proje.paratonerler.flatMap((p) => p.h_esikleri))].sort((a, b) => a - b);

  return (
    <div className="panel">
      <h3>Harita görünümü</h3>
      <Anahtar id="kapsama-goster" checked={ayarlar.kapsamaGoster} onCheckedChange={(v) => ayarGuncelle({ kapsamaGoster: v })} etiket="Yapı kapsamasını göster (yeşil/kırmızı)" />

      {tumEsikler.length > 0 && !gorunum.izolasyon && (
        <>
          <h4>Referans çemberleri — h</h4>
          {tumEsikler.map((h) => (
            <Anahtar key={h} id={`h-${h}`} checked={gorunum.hEsikleri.has(h)} onCheckedChange={() => degistir({ ...gorunum, hEsikleri: gecis(gorunum.hEsikleri, h) })} etiket={`h = ${h} m`} />
          ))}
          <h4>Referans çemberleri — seviye</h4>
          {SEVIYELER.map((sv: Seviye) => (
            <Anahtar key={sv} id={`sv-${sv}`} checked={gorunum.seviyeler.has(sv)} onCheckedChange={() => degistir({ ...gorunum, seviyeler: gecis(gorunum.seviyeler, sv) })} etiket={`Seviye ${sv}`} />
          ))}
        </>
      )}

      <h4>Seçili yapı izolasyonu</h4>
      <Anahtar
        id="izolasyon"
        checked={gorunum.izolasyon}
        onCheckedChange={(v) => degistir({ ...gorunum, izolasyon: v, odakYapiId: v ? gorunum.odakYapiId : null })}
        etiket="Yalnızca seçili yapıyı incele"
      />
      {gorunum.izolasyon && (
        <select className="girinti" value={gorunum.odakYapiId ?? ''} onChange={(e) => degistir({ ...gorunum, odakYapiId: e.target.value || null })}>
          <option value="">— Haritadan yapı seçin —</option>
          {proje.yapilar.map((y) => (
            <option key={y.id} value={y.id}>
              {y.isim}
            </option>
          ))}
        </select>
      )}
      <p className="ipucu-kucuk ust-bosluk">Çemberler ve görünürlük yalnızca görseldir; hesap sonuçlarını değiştirmez.</p>
    </div>
  );
}
