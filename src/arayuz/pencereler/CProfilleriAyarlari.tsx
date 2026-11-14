// Ayarlar › C profilleri: sık kullanılan yapı türleri için risk katsayısı takımları.
// Profiller bu bilgisayarda saklanır ve bütün projelerde yapı formundan seçilir.

import { Plus, Trash2 } from 'lucide-react';
import {
  C1_SECENEKLERI,
  C3_SECENEKLERI,
  C4_SECENEKLERI,
  C5_SECENEKLERI,
  CATI_MALZEMESI_ETIKETLERI,
  MALZEMELER,
  YAPI_MALZEMESI_ETIKETLERI,
  c2Degeri,
  sayi,
  type Malzeme,
  type Secenek,
} from '../../core';
import { PROFIL_ADI_SINIRI, PROFIL_SAYISI_SINIRI, bosProfil, ornekProfiller, tanimliKatsayiSayisi, type CProfili, type TekliC } from '../durum/cProfilleri';
import { useProje } from '../durum/ProjeSaglayici';
import { useEtkilesim } from '../ortak/Etkilesim';

const SECENEKLER: Record<TekliC, { baslik: string; liste: readonly Secenek[] }> = {
  C1: { baslik: 'C1 — Çevre', liste: C1_SECENEKLERI },
  C3: { baslik: 'C3 — İçerik', liste: C3_SECENEKLERI },
  C4: { baslik: 'C4 — Kullanım (doluluk)', liste: C4_SECENEKLERI },
  C5: { baslik: 'C5 — Yıldırımın sonuçları', liste: C5_SECENEKLERI },
};

const cMetni = (d: number) => sayi(d, d % 1 === 0 ? 0 : 2);

/** Profilin tek satırlık özeti: "C2 1 · C3 2 · C4 0,5 · C5 5". */
function ozet(p: CProfili): string {
  const parcalar = [
    p.C1 !== null ? `C1 ${cMetni(p.C1)}` : null,
    p.C2_secim ? `C2 ${cMetni(c2Degeri(p.C2_secim))}` : null,
    p.C3 !== null ? `C3 ${cMetni(p.C3)}` : null,
    p.C4 !== null ? `C4 ${cMetni(p.C4)}` : null,
    p.C5 !== null ? `C5 ${cMetni(p.C5)}` : null,
  ].filter(Boolean);
  return parcalar.length ? parcalar.join(' · ') : 'Katsayı tanımlanmadı';
}

function Katsayi({ ad, deger, degisti }: { ad: TekliC; deger: number | null; degisti: (d: number | null) => void }) {
  return (
    <label>
      {SECENEKLER[ad].baslik}
      <select value={deger ?? ''} onChange={(e) => degisti(e.target.value === '' ? null : Number(e.target.value))}>
        <option value="">Yapıda seçilir</option>
        {SECENEKLER[ad].liste.map((s) => (
          <option key={s.deger} value={s.deger}>
            {cMetni(s.deger)} — {s.etiket}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CProfilleriAyarlari() {
  const { ayarlar, ayarGuncelle } = useProje();
  const { onayla } = useEtkilesim();
  const profiller = ayarlar.cProfilleri;
  const yaz = (liste: CProfili[]) => ayarGuncelle({ cProfilleri: liste });
  const degistir = (id: string, d: Partial<CProfili>) => yaz(profiller.map((p) => (p.id === id ? { ...p, ...d } : p)));

  const adlar = profiller.map((p) => p.ad.trim().toLocaleLowerCase('tr-TR'));
  const adSorunu = (p: CProfili): string | null => {
    const ad = p.ad.trim().toLocaleLowerCase('tr-TR');
    if (!ad) return 'Profil adı boş; yapı formunda görünmez.';
    if (adlar.filter((a) => a === ad).length > 1) return 'Bu adla başka bir profil var; yapı formunda ilki kullanılır.';
    return null;
  };

  function malzeme(p: CProfili, alan: 'yapi' | 'cati', deger: string) {
    if (deger === '') return degistir(p.id, { C2_secim: null });
    // C2 iki seçimden bulunur: biri seçilince diğeri "normal" ile başlar, kullanıcı değiştirir.
    const mevcut = p.C2_secim ?? { yapi: 'normal' as Malzeme, cati: 'normal' as Malzeme };
    degistir(p.id, { C2_secim: { ...mevcut, [alan]: deger as Malzeme } });
  }

  async function sil(p: CProfili) {
    if (await onayla({ baslik: 'Profili sil', aciklama: `"${p.ad || 'Adsız profil'}" silinecek. Bu profille kaydedilmiş yapıların katsayıları değişmez.`, onayEtiketi: 'Sil', tehlikeli: true })) {
      yaz(profiller.filter((x) => x.id !== p.id));
    }
  }

  async function ornekleriYukle() {
    const onay = await onayla({
      baslik: 'Örnek profilleri geri yükle',
      aciklama: 'Tanımladığınız bütün profiller silinir ve yerine örnek profiller gelir. Kayıtlı yapıların katsayıları değişmez.',
      onayEtiketi: 'Geri yükle',
      tehlikeli: true,
    });
    if (onay) yaz(ornekProfiller());
  }

  return (
    <div className="form-dikey">
      <p className="ipucu">
        Sık çizdiğiniz yapı türleri için risk katsayılarını bir kez tanımlayın; yapı formunda profili seçince katsayılar dolar ve gerekirse o yapı için değiştirilir. Profiller bu bilgisayarda saklanır,
        bütün projelerde kullanılır.
      </p>
      <div className="uyari-blok">
        Örnek profiller yalnızca başlangıç noktasıdır; kendi uygulamanıza ve standarda göre gözden geçirin. <b>C1 (çevre)</b> yapının türüne değil sahadaki konumuna bağlıdır, bu yüzden örneklerde boştur
        ve her yapıda ayrıca seçilir. Boş bırakılan katsayıya profil dokunmaz.
      </div>

      {profiller.length === 0 && <p className="ipucu">Tanımlı profil yok. Yeni bir profil ekleyin ya da örnek profilleri geri yükleyin.</p>}

      <div className="profil-listesi">
        {profiller.map((p) => {
          const sorun = adSorunu(p);
          return (
            <details key={p.id} className="profil-karti">
              <summary>
                <span className="profil-ad">{p.ad.trim() || 'Adsız profil'}</span>
                <span className="profil-ozet">{ozet(p)}</span>
                <span className="kayit-etiketi">{tanimliKatsayiSayisi(p)}/5</span>
              </summary>
              <div className="form-dikey profil-govde">
                <label>
                  Profil adı
                  <input value={p.ad} maxLength={PROFIL_ADI_SINIRI} onChange={(e) => degistir(p.id, { ad: e.target.value })} placeholder="Örn. Kümes" className={sorun ? 'girdi-eksik' : ''} />
                </label>
                {sorun && <p className="ipucu-kucuk hata-metni">{sorun}</p>}
                <Katsayi ad="C1" deger={p.C1} degisti={(d) => degistir(p.id, { C1: d })} />
                <div>
                  <div className="alan-etiketi">C2 — Yapı ve çatı malzemesi</div>
                  <div className="form-grid-2">
                    <select value={p.C2_secim?.yapi ?? ''} onChange={(e) => malzeme(p, 'yapi', e.target.value)} aria-label="Yapı malzemesi">
                      <option value="">Yapıda seçilir</option>
                      {MALZEMELER.map((m) => (
                        <option key={m} value={m}>
                          {YAPI_MALZEMESI_ETIKETLERI[m]}
                        </option>
                      ))}
                    </select>
                    <select value={p.C2_secim?.cati ?? ''} onChange={(e) => malzeme(p, 'cati', e.target.value)} aria-label="Çatı malzemesi">
                      <option value="">Yapıda seçilir</option>
                      {MALZEMELER.map((m) => (
                        <option key={m} value={m}>
                          {CATI_MALZEMESI_ETIKETLERI[m]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ipucu-kucuk">{p.C2_secim ? `C2 = ${cMetni(c2Degeri(p.C2_secim))}` : 'C2 yapıda seçilir.'}</div>
                </div>
                <Katsayi ad="C3" deger={p.C3} degisti={(d) => degistir(p.id, { C3: d })} />
                <Katsayi ad="C4" deger={p.C4} degisti={(d) => degistir(p.id, { C4: d })} />
                <Katsayi ad="C5" deger={p.C5} degisti={(d) => degistir(p.id, { C5: d })} />
                <button type="button" className="ikincil-buton sola-yasla" onClick={() => sil(p)}>
                  <Trash2 size={13} /> Profili sil
                </button>
              </div>
            </details>
          );
        })}
      </div>

      <div className="satir-icinde">
        <button type="button" onClick={() => yaz([...profiller, bosProfil()])} disabled={profiller.length >= PROFIL_SAYISI_SINIRI}>
          <Plus size={14} /> Profil ekle
        </button>
        <button type="button" className="baglanti-buton" onClick={ornekleriYukle}>
          Örnek profilleri geri yükle
        </button>
      </div>
    </div>
  );
}
