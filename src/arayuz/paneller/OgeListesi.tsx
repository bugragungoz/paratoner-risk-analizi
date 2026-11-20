import { Eye, EyeOff, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { etkinDeltaT, type Paratoner, type Yapi } from '../../core';
import { paratonerEtkinlikGecis, paratonerGorunurlukGecis, paratonerSil, yapiGorunurlukGecis, yapiSil } from '../durum/eylemler';
import { useProje } from '../durum/ProjeSaglayici';
import { useEtkilesim } from '../ortak/Etkilesim';
import { useMetinler } from '../ortak/useMetinler';

interface Props {
  paratonerDuzenle: (p: Paratoner) => void;
  yapiDuzenle: (y: Yapi) => void;
}

export function OgeListesi({ paratonerDuzenle, yapiDuzenle }: Props) {
  const { proje, sonuc, guncelle } = useProje();
  const { onayla } = useEtkilesim();
  const m = useMetinler();
  const t = m.oge;

  async function paratonerSilOnay(p: Paratoner) {
    if (await onayla({ baslik: t.paratonerSil, aciklama: t.silinecek(p.isim), onayEtiketi: m.genel.sil, tehlikeli: true })) {
      guncelle(paratonerSil(p.id));
    }
  }

  async function yapiSilOnay(y: Yapi) {
    const ustundekiler = proje.paratonerler.filter((p) => p.yapi_id === y.id).map((p) => p.isim);
    const aciklama = ustundekiler.length
      ? t.ustundekilerleSilinecek(y.isim, ustundekiler.join(', '))
      : t.silinecek(y.isim);
    if (await onayla({ baslik: t.yapiSil, aciklama, onayEtiketi: m.genel.sil, tehlikeli: true })) guncelle(yapiSil(y.id));
  }

  return (
    <div className="panel">
      <h3>{t.paratonerler(proje.paratonerler.length)}</h3>
      {proje.paratonerler.length === 0 && <p className="ipucu">{t.paratonerYok}</p>}
      <ul className="oge-listesi">
        {proje.paratonerler.map((p) => {
          const pasif = p.aktif_mi === false;
          const dT = etkinDeltaT(p, proje);
          const detay = `${m.bicim.sayi(p.mast_yuksekligi_m)} m${dT !== null ? ` · ${dT} µs` : ''}`;
          return (
            <li key={p.id} className={pasif ? 'pasif-oge' : ''}>
              <button className="ikon-buton" onClick={() => guncelle(paratonerGorunurlukGecis(p.id))} title={p.gorunur_mu === false ? t.goster : t.gizle}>
                {p.gorunur_mu === false ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button className={`ikon-buton ${pasif ? 'kapali' : ''}`} onClick={() => guncelle(paratonerEtkinlikGecis(p.id))} title={pasif ? t.etkinlestir : t.devreDisiBirak}>
                {pasif ? <PowerOff size={14} /> : <Power size={14} />}
              </button>
              <span className="oge-isim" title={`${p.isim} · ${detay}${pasif ? t.devreDisiIpucu : ''}`}>
                <span className="oge-ad">{p.isim}</span>
              </span>
              <span className="oge-detay">{pasif ? <span className="pasif-etiket">{m.genel.devreDisi}</span> : detay}</span>
              <button className="ikon-buton" onClick={() => paratonerDuzenle(p)} title={m.genel.duzenle}>
                <Pencil size={13} />
              </button>
              <button className="ikon-buton ikon-buton-tehlike" onClick={() => paratonerSilOnay(p)} title={m.genel.sil}>
                <Trash2 size={13} />
              </button>
            </li>
          );
        })}
      </ul>

      <h3>{t.yapilar(proje.yapilar.length)}</h3>
      {proje.yapilar.length === 0 && <p className="ipucu">{t.yapiYok}</p>}
      <ul className="oge-listesi">
        {proje.yapilar.map((y) => {
          const s = sonuc.yapilar.find((r) => r.yapiId === y.id);
          return (
            <li key={y.id}>
              <button className="ikon-buton" onClick={() => guncelle(yapiGorunurlukGecis(y.id))} title={y.gorunur_mu === false ? t.goster : t.gizle}>
                {y.gorunur_mu === false ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <span className="oge-isim" title={`${y.isim}${s ? ` · ${s.nihai.etiket}` : ''}`}>
                <span className="durum-nokta" style={{ background: s?.nihai.renk }} />
                <span className="oge-ad">{y.isim}</span>
                {y.kritik_mi && <span className="kritik-etiket">{m.genel.kritik}</span>}
                {s?.risk && (
                  <span className="seviye-etiket" style={{ background: s.risk.renk }} title={t.gerekliSeviye(s.risk.seviye)}>
                    {m.hesap.seviyeKisa[s.risk.seviyeKod]}
                  </span>
                )}
              </span>
              <button className="ikon-buton" onClick={() => yapiDuzenle(y)} title={m.genel.duzenle}>
                <Pencil size={13} />
              </button>
              <button className="ikon-buton ikon-buton-tehlike" onClick={() => yapiSilOnay(y)} title={m.genel.sil}>
                <Trash2 size={13} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
