import { Eye, EyeOff, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { etkinDeltaT, sayi, type Paratoner, type Yapi } from '../../core';
import { paratonerEtkinlikGecis, paratonerGorunurlukGecis, paratonerSil, yapiGorunurlukGecis, yapiSil } from '../durum/eylemler';
import { useProje } from '../durum/ProjeSaglayici';
import { useEtkilesim } from '../ortak/Etkilesim';

interface Props {
  paratonerDuzenle: (p: Paratoner) => void;
  yapiDuzenle: (y: Yapi) => void;
}

/** Dar listede uzun seviye adı yerine kısa gösterim; tam adı ipucunda yazar. */
const SEVIYE_KISA: Record<string, string> = {
  'Seviye 1 + ek önlem': 'I+',
  'Seviye 1': 'I',
  'Seviye 2': 'II',
  'Seviye 3': 'III',
  'Seviye 4': 'IV',
  'İsteğe bağlı': 'İst.',
};

export function OgeListesi({ paratonerDuzenle, yapiDuzenle }: Props) {
  const { proje, sonuc, guncelle } = useProje();
  const { onayla } = useEtkilesim();

  async function paratonerSilOnay(p: Paratoner) {
    if (await onayla({ baslik: 'Paratoneri sil', aciklama: `"${p.isim}" silinecek. Ctrl+Z ile geri alabilirsiniz.`, onayEtiketi: 'Sil', tehlikeli: true })) {
      guncelle(paratonerSil(p.id));
    }
  }

  async function yapiSilOnay(y: Yapi) {
    const ustundekiler = proje.paratonerler.filter((p) => p.yapi_id === y.id).map((p) => p.isim);
    const aciklama = ustundekiler.length
      ? `"${y.isim}" ve üzerinde duran paratonerler (${ustundekiler.join(', ')}) birlikte silinecek. Ctrl+Z ile geri alabilirsiniz.`
      : `"${y.isim}" silinecek. Ctrl+Z ile geri alabilirsiniz.`;
    if (await onayla({ baslik: 'Yapıyı sil', aciklama, onayEtiketi: 'Sil', tehlikeli: true })) guncelle(yapiSil(y.id));
  }

  return (
    <div className="panel">
      <h3>Paratonerler ({proje.paratonerler.length})</h3>
      {proje.paratonerler.length === 0 && <p className="ipucu">Henüz paratoner eklenmedi.</p>}
      <ul className="oge-listesi">
        {proje.paratonerler.map((p) => {
          const pasif = p.aktif_mi === false;
          const dT = etkinDeltaT(p, proje);
          const detay = `${sayi(p.mast_yuksekligi_m)} m${dT !== null ? ` · ${dT} µs` : ''}`;
          return (
            <li key={p.id} className={pasif ? 'pasif-oge' : ''}>
              <button className="ikon-buton" onClick={() => guncelle(paratonerGorunurlukGecis(p.id))} title={p.gorunur_mu === false ? 'Haritada göster' : 'Haritada gizle (hesabı etkilemez)'}>
                {p.gorunur_mu === false ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button className={`ikon-buton ${pasif ? 'kapali' : ''}`} onClick={() => guncelle(paratonerEtkinlikGecis(p.id))} title={pasif ? 'Etkinleştir (hesaba kat)' : 'Devre dışı bırak (hesaptan çıkar)'}>
                {pasif ? <PowerOff size={14} /> : <Power size={14} />}
              </button>
              <span className="oge-isim" title={`${p.isim} · ${detay}${pasif ? ' · devre dışı (hesaba katılmıyor)' : ''}`}>
                <span className="oge-ad">{p.isim}</span>
              </span>
              <span className="oge-detay">{pasif ? <span className="pasif-etiket">Devre dışı</span> : detay}</span>
              <button className="ikon-buton" onClick={() => paratonerDuzenle(p)} title="Düzenle">
                <Pencil size={13} />
              </button>
              <button className="ikon-buton ikon-buton-tehlike" onClick={() => paratonerSilOnay(p)} title="Sil">
                <Trash2 size={13} />
              </button>
            </li>
          );
        })}
      </ul>

      <h3>Yapılar ({proje.yapilar.length})</h3>
      {proje.yapilar.length === 0 && <p className="ipucu">Henüz yapı eklenmedi.</p>}
      <ul className="oge-listesi">
        {proje.yapilar.map((y) => {
          const s = sonuc.yapilar.find((r) => r.yapiId === y.id);
          return (
            <li key={y.id}>
              <button className="ikon-buton" onClick={() => guncelle(yapiGorunurlukGecis(y.id))} title={y.gorunur_mu === false ? 'Haritada göster' : 'Haritada gizle (hesabı etkilemez)'}>
                {y.gorunur_mu === false ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <span className="oge-isim" title={`${y.isim}${s ? ` · ${s.nihai.etiket}` : ''}`}>
                <span className="durum-nokta" style={{ background: s?.nihai.renk }} />
                <span className="oge-ad">{y.isim}</span>
                {y.kritik_mi && <span className="kritik-etiket">Kritik</span>}
                {s?.risk && (
                  <span className="seviye-etiket" style={{ background: s.risk.renk }} title={`Gerekli koruma seviyesi: ${s.risk.seviye}`}>
                    {SEVIYE_KISA[s.risk.seviye] ?? s.risk.seviye}
                  </span>
                )}
              </span>
              <button className="ikon-buton" onClick={() => yapiDuzenle(y)} title="Düzenle">
                <Pencil size={13} />
              </button>
              <button className="ikon-buton ikon-buton-tehlike" onClick={() => yapiSilOnay(y)} title="Sil">
                <Trash2 size={13} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
