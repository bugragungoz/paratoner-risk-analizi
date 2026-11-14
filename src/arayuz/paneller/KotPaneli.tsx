import { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { kotMetni, yeniKotSeviyesi, type KotSeviyesi } from '../../core';
import { kotDuzenle, kotEkle, kotSil, kotSilinebilirMi } from '../durum/eylemler';
import { useProje } from '../durum/ProjeSaglayici';
import { useEtkilesim } from '../ortak/Etkilesim';
import { SayiGirdisi } from '../ortak/SayiGirdisi';

export function KotPaneli() {
  const { proje, guncelle } = useProje();
  const { onayla } = useEtkilesim();
  const [yeni, setYeni] = useState({ isim: '', yukseklik: null as number | null, aciklama: '' });
  const [duzenlenen, setDuzenlenen] = useState<(Omit<KotSeviyesi, 'taban_kottan_yukseklik_m'> & { taban_kottan_yukseklik_m: number | null }) | null>(null);

  const sirali = [...proje.kot_seviyeleri].sort((a, b) => a.taban_kottan_yukseklik_m - b.taban_kottan_yukseklik_m);

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    if (!yeni.isim.trim() || yeni.yukseklik === null) return;
    guncelle(kotEkle(yeniKotSeviyesi(yeni.isim.trim(), yeni.yukseklik, yeni.aciklama.trim())));
    setYeni({ isim: '', yukseklik: null, aciklama: '' });
  }

  async function sil(k: KotSeviyesi) {
    const { silinebilir, bagimlilar } = kotSilinebilirMi(proje, k.id);
    if (!silinebilir) {
      await onayla({
        baslik: 'Kot seviyesi kullanımda',
        aciklama: `"${k.isim}" şu öğeler tarafından kullanılıyor: ${bagimlilar.join(', ')}. Silmeden önce bu öğeleri başka bir kota taşıyın ya da silin.`,
        yalnizBilgi: true,
      });
      return;
    }
    if (await onayla({ baslik: 'Kot seviyesini sil', aciklama: `"${k.isim}" (${kotMetni(k.taban_kottan_yukseklik_m)} m) silinecek.`, onayEtiketi: 'Sil', tehlikeli: true })) {
      guncelle(kotSil(k.id));
    }
  }

  return (
    <div className="panel">
      <h3>Kot seviyeleri</h3>
      {sirali.length === 0 && <p className="ipucu">Önce arazinin en düşük noktasını "Zemin (0 m)" olarak tanımlayın.</p>}
      <ul className="kot-listesi">
        {sirali.map((k) =>
          duzenlenen?.id === k.id ? (
            <li key={k.id} className="duzenleme-satiri">
              <input value={duzenlenen.isim} onChange={(e) => setDuzenlenen({ ...duzenlenen, isim: e.target.value })} placeholder="İsim" />
              <SayiGirdisi deger={duzenlenen.taban_kottan_yukseklik_m} degisti={(n) => setDuzenlenen({ ...duzenlenen, taban_kottan_yukseklik_m: n })} placeholder="m" aria-label="Taban kottan yükseklik (m)" />
              <input value={duzenlenen.aciklama ?? ''} onChange={(e) => setDuzenlenen({ ...duzenlenen, aciklama: e.target.value })} placeholder="Açıklama" />
              <button
                className="ikon-buton"
                title={duzenlenen.taban_kottan_yukseklik_m === null ? 'Yükseklik girin' : 'Kaydet'}
                disabled={!duzenlenen.isim.trim() || duzenlenen.taban_kottan_yukseklik_m === null}
                onClick={() => {
                  const h = duzenlenen.taban_kottan_yukseklik_m;
                  if (!duzenlenen.isim.trim() || h === null) return;
                  guncelle(kotDuzenle(k.id, { isim: duzenlenen.isim.trim(), taban_kottan_yukseklik_m: h, aciklama: duzenlenen.aciklama ?? '' }));
                  setDuzenlenen(null);
                }}
              >
                <Check size={14} />
              </button>
              <button className="ikon-buton" title="Vazgeç" onClick={() => setDuzenlenen(null)}>
                <X size={14} />
              </button>
            </li>
          ) : (
            <li key={k.id}>
              <span className="kot-yukseklik">{kotMetni(k.taban_kottan_yukseklik_m)} m</span>
              <span className="kot-isim">{k.isim}</span>
              {k.aciklama && <span className="kot-aciklama">{k.aciklama}</span>}
              <button className="ikon-buton" onClick={() => setDuzenlenen({ ...k })} title="Düzenle">
                <Pencil size={13} />
              </button>
              <button className="ikon-buton ikon-buton-tehlike" onClick={() => sil(k)} title="Sil">
                <Trash2 size={13} />
              </button>
            </li>
          ),
        )}
      </ul>
      <form onSubmit={ekle} className="form-satir">
        <input placeholder="İsim (örn. Zemin)" value={yeni.isim} onChange={(e) => setYeni({ ...yeni, isim: e.target.value })} />
        <SayiGirdisi placeholder="Taban kottan yükseklik (m)" deger={yeni.yukseklik} degisti={(n) => setYeni({ ...yeni, yukseklik: n })} />
        <input placeholder="Açıklama (isteğe bağlı)" value={yeni.aciklama} onChange={(e) => setYeni({ ...yeni, aciklama: e.target.value })} />
        <button type="submit" disabled={!yeni.isim.trim() || yeni.yukseklik === null}>
          Ekle
        </button>
      </form>
    </div>
  );
}
