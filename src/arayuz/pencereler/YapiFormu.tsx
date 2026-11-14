import { useMemo, useState } from 'react';
import {
  C1_SECENEKLERI,
  C2_MATRISI,
  C3_SECENEKLERI,
  C4_SECENEKLERI,
  C5_SECENEKLERI,
  CATI_MALZEMESI_ETIKETLERI,
  MALZEMELER,
  YAPI_MALZEMESI_ETIKETLERI,
  aeHesapla,
  c2Degeri,
  nkGecerliMi,
  sayi,
  standartCMi,
  yapiRiskAnalizi,
  yeniYapi,
  type C2Secimi,
  type CAdi,
  type LatLng,
  type Malzeme,
  type Secenek,
  type Yapi,
  kotMetni,
} from '../../core';
import { profiliUygula, tanimliKatsayiSayisi, tiptenProfilAdi } from '../durum/cProfilleri';
import { useProje } from '../durum/ProjeSaglayici';
import { Anahtar } from '../ortak/Anahtar';
import { Pencere } from '../ortak/Pencere';
import { SayiGirdisi } from '../ortak/SayiGirdisi';

interface Props {
  poligon: LatLng[] | null;
  duzenlenen: Yapi | null;
  kapat: () => void;
  kaydet: (y: Yapi) => void;
  poligonDuzenle: (yapiId: string) => void;
}

const BOS_POLIGON: LatLng[] = [];

const C_SECENEKLERI: Record<Exclude<CAdi, 'C2'>, readonly Secenek[]> = { C1: C1_SECENEKLERI, C3: C3_SECENEKLERI, C4: C4_SECENEKLERI, C5: C5_SECENEKLERI };
const C_BASLIKLARI: Record<CAdi, string> = {
  C1: 'C1 — Çevre',
  C2: 'C2 — Yapı ve çatı malzemesi',
  C3: 'C3 — İçerik',
  C4: 'C4 — Kullanım (doluluk)',
  C5: 'C5 — Yıldırımın sonuçları',
};

/** Eski projelerde C2_secim yoksa, değer matriste tek bir hücreye karşılık geliyorsa o hücre seçilir. */
function c2SeciminiCikar(C2: number | null): C2Secimi | null {
  const eslesen: C2Secimi[] = [];
  for (const yapi of MALZEMELER) for (const cati of MALZEMELER) if (C2_MATRISI[yapi][cati] === C2) eslesen.push({ yapi, cati });
  return eslesen.length === 1 ? (eslesen[0] ?? null) : null;
}

function CSecimi({ ad, deger, degisti }: { ad: Exclude<CAdi, 'C2'>; deger: number | null; degisti: (d: number) => void }) {
  const standartDisi = deger !== null && !standartCMi(ad, deger);
  return (
    <label>
      {C_BASLIKLARI[ad]}
      <select value={standartDisi ? 'standart-disi' : (deger ?? '')} onChange={(e) => degisti(Number(e.target.value))} className={deger === null || standartDisi ? 'girdi-eksik' : ''}>
        <option value="" disabled>
          Seçiniz…
        </option>
        {standartDisi && (
          <option value="standart-disi" disabled>
            {deger} — standart dışı, yeniden seçin
          </option>
        )}
        {C_SECENEKLERI[ad].map((s) => (
          <option key={s.deger} value={s.deger}>
            {sayi(s.deger, s.deger % 1 === 0 ? 0 : 2)} — {s.etiket}
          </option>
        ))}
      </select>
    </label>
  );
}

export function YapiFormu({ poligon, duzenlenen, kapat, kaydet, poligonDuzenle }: Props) {
  const { proje, ayarlar } = useProje();
  const profiller = ayarlar.cProfilleri;
  const [isim, setIsim] = useState(duzenlenen?.isim ?? '');
  // Yapının tipi = uygulanan profilin adı (eski projelerde yerleşik tip adı). Boş: profil yok.
  const [tip, setTip] = useState(() => tiptenProfilAdi(duzenlenen?.tip));
  const [kotId, setKotId] = useState(duzenlenen?.kot_seviyesi_id ?? proje.kot_seviyeleri[0]?.id ?? '');
  const [H, setH] = useState<number | null>(duzenlenen?.H_m ?? null);
  const [manuel, setManuel] = useState(!!duzenlenen?.manuelBoyut);
  const [L, setL] = useState<number | null>(duzenlenen?.L_m ?? null);
  const [W, setW] = useState<number | null>(duzenlenen?.W_m ?? null);
  const [C, setC] = useState({
    C1: duzenlenen?.C1 ?? null,
    C3: duzenlenen?.C3 ?? null,
    C4: duzenlenen?.C4 ?? null,
    C5: duzenlenen?.C5 ?? null,
  });
  const eskiC2 = duzenlenen?.C2 ?? null;
  const [c2Secim, setC2Secim] = useState<Partial<C2Secimi>>(duzenlenen?.C2_secim ?? c2SeciminiCikar(eskiC2) ?? {});
  const [kritik, setKritik] = useState(!!duzenlenen?.kritik_mi);

  const aktifPoligon = poligon ?? duzenlenen?.poligon ?? BOS_POLIGON;
  const tamC2Secim = c2Secim.yapi && c2Secim.cati ? (c2Secim as C2Secimi) : null;
  // Malzeme seçilmemiş eski projede, standart bir C2 değeri varsa korunur.
  const C2 = tamC2Secim ? c2Degeri(tamC2Secim) : eskiC2 !== null && standartCMi('C2', eskiC2) ? eskiC2 : null;
  const c2StandartDisi = !tamC2Secim && eskiC2 !== null && !standartCMi('C2', eskiC2);

  const tumC = C.C1 !== null && C2 !== null && C.C3 !== null && C.C4 !== null && C.C5 !== null;
  const cStandart = tumC && (['C1', 'C3', 'C4', 'C5'] as const).every((c) => standartCMi(c, C[c] as number));
  const boyutGecerli = !manuel || (L !== null && L > 0 && W !== null && W > 0);
  const gecerli = !!isim.trim() && !!kotId && H !== null && H > 0 && aktifPoligon.length >= 3 && boyutGecerli;

  const onizleme = useMemo(() => {
    if (!tumC || !cStandart || H === null || H <= 0 || !boyutGecerli || aktifPoligon.length < 3 || !nkGecerliMi(proje)) return null;
    const { Ae } = aeHesapla({ poligon: aktifPoligon, H_m: H, manuelBoyut: manuel, L_m: L, W_m: W });
    return yapiRiskAnalizi({ Ae, C1: C.C1 as number, C2: C2 as number, C3: C.C3 as number, C4: C.C4 as number, C5: C.C5 as number }, proje.Nk);
  }, [tumC, cStandart, H, boyutGecerli, aktifPoligon, proje, manuel, L, W, C, C2]);

  /** Profil seçilince tanımlı katsayıları doldurur; profilde boş bırakılanlara dokunmaz. */
  function profilSec(ad: string) {
    setTip(ad);
    const profil = profiller.find((p) => p.ad === ad);
    if (!profil) return;
    const yeni = profiliUygula(profil, { C, c2Secim });
    setC(yeni.C);
    setC2Secim(yeni.c2Secim);
  }

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    if (!gecerli) return;
    const alanlar = {
      isim: isim.trim(),
      tip: tip || 'diger',
      kot_seviyesi_id: kotId,
      H_m: H,
      manuelBoyut: manuel,
      L_m: manuel ? L : (duzenlenen?.L_m ?? null),
      W_m: manuel ? W : (duzenlenen?.W_m ?? null),
      C1: C.C1,
      C2: c2StandartDisi ? eskiC2 : C2,
      C2_secim: tamC2Secim,
      C3: C.C3,
      C4: C.C4,
      C5: C.C5,
      kritik_mi: kritik,
    };
    if (duzenlenen) kaydet({ ...duzenlenen, ...alanlar, poligon: aktifPoligon });
    else kaydet({ ...yeniYapi({ ...alanlar, poligon: aktifPoligon }), kritik_mi: kritik });
  }

  const seciliProfil = profiller.find((p) => p.ad === tip);
  // Kayıtlı tip artık profiller arasında yoksa (silinmiş ya da başka bilgisayardan) yine listede görünür.
  const kayipTip = tip && !seciliProfil ? tip : null;

  return (
    <Pencere acik kapat={kapat} baslik={duzenlenen ? 'Yapıyı düzenle' : 'Yeni yapı'} boyut="genis" saydam>
      {proje.kot_seviyeleri.length === 0 ? (
        <>
          <p className="uyari-metin">Önce en az bir kot seviyesi tanımlamanız gerekiyor.</p>
          <div className="modal-butonlar">
            <button className="ikincil-buton" onClick={kapat}>
              Kapat
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={gonder} className="form-dikey">
          <div className="form-grid-2">
            <label>
              İsim
              <input autoFocus value={isim} onChange={(e) => setIsim(e.target.value)} placeholder="Örn. Tesis 1" />
            </label>
            <label>
              Yapı tipi (C profili)
              <select value={tip} onChange={(e) => profilSec(e.target.value)}>
                <option value="">Profil yok</option>
                {kayipTip && <option value={kayipTip}>{kayipTip} (profili tanımlı değil)</option>}
                {profiller.map((p) => (
                  <option key={p.id} value={p.ad}>
                    {p.ad}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="ipucu-kucuk profil-notu">
            {seciliProfil
              ? `"${seciliProfil.ad}" profili ${tanimliKatsayiSayisi(seciliProfil)} katsayıyı doldurdu; profilde boş bırakılanları ve sahaya özgü olanları aşağıdan seçin.`
              : profiller.length
                ? 'Profil seçince o profilin katsayıları dolar; sonra tek tek değiştirebilirsiniz.'
                : 'Henüz C profili tanımlı değil.'}{' '}
            Profiller Ayarlar › C profilleri sekmesinde tanımlanır.
          </p>

          <div className="form-grid-2">
            <label>
              Kot seviyesi (taban)
              <select value={kotId} onChange={(e) => setKotId(e.target.value)}>
                {proje.kot_seviyeleri.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.isim} ({kotMetni(k.taban_kottan_yukseklik_m)} m)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Yükseklik H (m)
              <SayiGirdisi deger={H} degisti={setH} asgari={0} asgariHaric placeholder="örn. 6" className={H === null ? 'girdi-eksik' : ''} />
            </label>
          </div>

          <Anahtar id="manuel-boyut" checked={manuel} onCheckedChange={setManuel} etiket="Ae için elle boyut gir (L × W)" />
          {manuel && (
            <>
              <div className="bilgi-kutusu">Haritadaki poligon gösterim için korunur; Ae hesabında L × W dikdörtgeni kullanılır.</div>
              <div className="form-grid-2">
                <label>
                  Boy L (m)
                  <SayiGirdisi deger={L} degisti={setL} asgari={0} asgariHaric />
                </label>
                <label>
                  En W (m)
                  <SayiGirdisi deger={W} degisti={setW} asgari={0} asgariHaric />
                </label>
              </div>
            </>
          )}

          {duzenlenen && (
            <button type="button" className="ikincil-buton sola-yasla" onClick={() => poligonDuzenle(duzenlenen.id)}>
              Poligon köşelerini haritada düzenle
            </button>
          )}

          <hr className="bolum-ayirici" />
          <div className="alan-etiketi">Risk katsayıları</div>
          <CSecimi ad="C1" deger={C.C1} degisti={(d) => setC({ ...C, C1: d })} />

          <div>
            <div className="alan-etiketi">{C_BASLIKLARI.C2}</div>
            <div className="form-grid-2">
              <select value={c2Secim.yapi ?? ''} onChange={(e) => setC2Secim({ ...c2Secim, yapi: e.target.value as Malzeme })} className={!c2Secim.yapi && C2 === null ? 'girdi-eksik' : ''}>
                <option value="" disabled>
                  Yapı malzemesi…
                </option>
                {MALZEMELER.map((m) => (
                  <option key={m} value={m}>
                    {YAPI_MALZEMESI_ETIKETLERI[m]}
                  </option>
                ))}
              </select>
              <select value={c2Secim.cati ?? ''} onChange={(e) => setC2Secim({ ...c2Secim, cati: e.target.value as Malzeme })} className={!c2Secim.cati && C2 === null ? 'girdi-eksik' : ''}>
                <option value="" disabled>
                  Çatı malzemesi…
                </option>
                {MALZEMELER.map((m) => (
                  <option key={m} value={m}>
                    {CATI_MALZEMESI_ETIKETLERI[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className={`ipucu-kucuk ${c2StandartDisi ? 'hata-metni' : ''}`}>
              {tamC2Secim
                ? `C2 = ${sayi(C2, 1)}`
                : c2StandartDisi
                  ? `Mevcut C2 = ${eskiC2} standart tabloda yok; yapı ve çatı malzemesini seçin.`
                  : C2 !== null
                    ? `Mevcut C2 = ${sayi(C2, 1)} (malzeme seçimi kaydedilmemiş; değiştirmek için seçin).`
                    : 'Yapı ve çatı malzemesini seçin.'}
            </div>
          </div>

          <CSecimi ad="C3" deger={C.C3} degisti={(d) => setC({ ...C, C3: d })} />
          <CSecimi ad="C4" deger={C.C4} degisti={(d) => setC({ ...C, C4: d })} />
          <CSecimi ad="C5" deger={C.C5} degisti={(d) => setC({ ...C, C5: d })} />

          {onizleme ? (
            <div className="hesap-sonuc-kutu">
              <div className="satir">
                <span className="anahtar">Ae</span>
                <span>{sayi(onizleme.Ae)} m²</span>
              </div>
              <div className="satir">
                <span className="anahtar">Nd · Nc</span>
                <span>
                  {sayi(onizleme.Nd, 5)} · {sayi(onizleme.Nc, 5)}
                </span>
              </div>
              <div className="satir">
                <span className="anahtar">E</span>
                <span>{sayi(onizleme.E, 3)}</span>
              </div>
              <div className="satir">
                <span className="anahtar">Gerekli seviye</span>
                <span className="seviye-rozet" style={{ background: onizleme.renk }}>
                  {onizleme.seviye}
                </span>
              </div>
            </div>
          ) : (
            <p className="ipucu-kucuk">
              {!nkGecerliMi(proje) ? 'Risk önizlemesi için projede Nk girilmeli.' : 'Risk önizlemesi için H ve bütün C katsayılarını standart değerlerden seçin.'}
            </p>
          )}

          <Anahtar id="kritik" checked={kritik} onCheckedChange={setKritik} etiket="Kritik yapı (haritada ve tabloda vurgulanır)" />

          <div className="modal-butonlar">
            <button type="button" className="ikincil-buton" onClick={kapat}>
              İptal
            </button>
            <button type="submit" className="buton-birincil" disabled={!gecerli}>
              Kaydet
            </button>
          </div>
        </form>
      )}
    </Pencere>
  );
}
