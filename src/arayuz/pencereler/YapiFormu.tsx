import { useMemo, useState } from 'react';
import {
  C2_MATRISI,
  MALZEMELER,
  aeHesapla,
  c2Degeri,
  cSecenekleri,
  nkGecerliMi,
  standartCMi,
  yapiRiskAnalizi,
  yeniYapi,
  type C2Secimi,
  type CAdi,
  type LatLng,
  type Malzeme,
  type Yapi,
} from '../../core';
import { profiliUygula, tanimliKatsayiSayisi, tiptenProfilAdi } from '../durum/cProfilleri';
import { useProje } from '../durum/ProjeSaglayici';
import { Anahtar } from '../ortak/Anahtar';
import { Pencere } from '../ortak/Pencere';
import { SayiGirdisi } from '../ortak/SayiGirdisi';
import { useMetinler } from '../ortak/useMetinler';

interface Props {
  poligon: LatLng[] | null;
  duzenlenen: Yapi | null;
  kapat: () => void;
  kaydet: (y: Yapi) => void;
  poligonDuzenle: (yapiId: string) => void;
}

const BOS_POLIGON: LatLng[] = [];

/** Eski projelerde C2_secim yoksa, değer matriste tek bir hücreye karşılık geliyorsa o hücre seçilir. */
function c2SeciminiCikar(C2: number | null): C2Secimi | null {
  const eslesen: C2Secimi[] = [];
  for (const yapi of MALZEMELER) for (const cati of MALZEMELER) if (C2_MATRISI[yapi][cati] === C2) eslesen.push({ yapi, cati });
  return eslesen.length === 1 ? (eslesen[0] ?? null) : null;
}

function CSecimi({ ad, deger, degisti }: { ad: Exclude<CAdi, 'C2'>; deger: number | null; degisti: (d: number) => void }) {
  const m = useMetinler();
  const standartDisi = deger !== null && !standartCMi(ad, deger);
  return (
    <label>
      {m.cBasliklari[ad]}
      <select value={standartDisi ? 'standart-disi' : (deger ?? '')} onChange={(e) => degisti(Number(e.target.value))} className={deger === null || standartDisi ? 'girdi-eksik' : ''}>
        <option value="" disabled>
          {m.genel.seciniz}
        </option>
        {standartDisi && (
          <option value="standart-disi" disabled>
            {m.yapiFormu.standartDisi(m.bicim.sayi(deger, deger % 1 === 0 ? 0 : 2))}
          </option>
        )}
        {cSecenekleri(m)[ad].map((s) => (
          <option key={s.deger} value={s.deger}>
            {m.bicim.sayi(s.deger, s.deger % 1 === 0 ? 0 : 2)} — {s.etiket}
          </option>
        ))}
      </select>
    </label>
  );
}

export function YapiFormu({ poligon, duzenlenen, kapat, kaydet, poligonDuzenle }: Props) {
  const { proje, ayarlar } = useProje();
  const m = useMetinler();
  const t = m.yapiFormu;
  const { sayi, kot: kotMetni } = m.bicim;
  const profiller = ayarlar.cProfilleri;
  const [isim, setIsim] = useState(duzenlenen?.isim ?? '');
  // Yapının tipi = uygulanan profilin adı (eski projelerde yerleşik tip adı). Boş: profil yok.
  const [tip, setTip] = useState(() => tiptenProfilAdi(duzenlenen?.tip, m));
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
    return yapiRiskAnalizi({ Ae, C1: C.C1 as number, C2: C2 as number, C3: C.C3 as number, C4: C.C4 as number, C5: C.C5 as number }, proje.Nk, m);
  }, [tumC, cStandart, H, boyutGecerli, aktifPoligon, proje, manuel, L, W, C, C2, m]);

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
    <Pencere acik kapat={kapat} baslik={duzenlenen ? t.baslikDuzenle : t.baslikYeni} boyut="genis" saydam>
      {proje.kot_seviyeleri.length === 0 ? (
        <>
          <p className="uyari-metin">{m.genel.onceKot}</p>
          <div className="modal-butonlar">
            <button className="ikincil-buton" onClick={kapat}>
              {m.ortak.kapat}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={gonder} className="form-dikey">
          <div className="form-grid-2">
            <label>
              {m.genel.isim}
              <input autoFocus value={isim} onChange={(e) => setIsim(e.target.value)} placeholder={t.isimOrnek} />
            </label>
            <label>
              {t.tip}
              <select value={tip} onChange={(e) => profilSec(e.target.value)}>
                <option value="">{t.profilYok}</option>
                {kayipTip && <option value={kayipTip}>{t.profilTanimsiz(kayipTip)}</option>}
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
              ? t.profilDoldurdu(seciliProfil.ad, tanimliKatsayiSayisi(seciliProfil))
              : profiller.length
                ? t.profilSecince
                : t.profilTanimliDegil}{' '}
            {t.profilYeri}
          </p>

          <div className="form-grid-2">
            <label>
              {t.kotTaban}
              <select value={kotId} onChange={(e) => setKotId(e.target.value)}>
                {proje.kot_seviyeleri.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.isim} ({kotMetni(k.taban_kottan_yukseklik_m)} m)
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.yukseklikH}
              <SayiGirdisi deger={H} degisti={setH} asgari={0} asgariHaric placeholder={m.genel.ornek('6')} className={H === null ? 'girdi-eksik' : ''} />
            </label>
          </div>

          <Anahtar id="manuel-boyut" checked={manuel} onCheckedChange={setManuel} etiket={t.manuelBoyut} />
          {manuel && (
            <>
              <div className="bilgi-kutusu">{t.manuelNot}</div>
              <div className="form-grid-2">
                <label>
                  {t.boyL}
                  <SayiGirdisi deger={L} degisti={setL} asgari={0} asgariHaric />
                </label>
                <label>
                  {t.enW}
                  <SayiGirdisi deger={W} degisti={setW} asgari={0} asgariHaric />
                </label>
              </div>
            </>
          )}

          {duzenlenen && (
            <button type="button" className="ikincil-buton sola-yasla" onClick={() => poligonDuzenle(duzenlenen.id)}>
              {t.poligonDuzenle}
            </button>
          )}

          <hr className="bolum-ayirici" />
          <div className="alan-etiketi">{t.riskKatsayilari}</div>
          <CSecimi ad="C1" deger={C.C1} degisti={(d) => setC({ ...C, C1: d })} />

          <div>
            <div className="alan-etiketi">{m.cBasliklari.C2}</div>
            <div className="form-grid-2">
              <select value={c2Secim.yapi ?? ''} onChange={(e) => setC2Secim({ ...c2Secim, yapi: e.target.value as Malzeme })} className={!c2Secim.yapi && C2 === null ? 'girdi-eksik' : ''}>
                <option value="" disabled>
                  {t.yapiMalzemesi}
                </option>
                {MALZEMELER.map((mz) => (
                  <option key={mz} value={mz}>
                    {m.sabit.yapiMalzemesi[mz]}
                  </option>
                ))}
              </select>
              <select value={c2Secim.cati ?? ''} onChange={(e) => setC2Secim({ ...c2Secim, cati: e.target.value as Malzeme })} className={!c2Secim.cati && C2 === null ? 'girdi-eksik' : ''}>
                <option value="" disabled>
                  {t.catiMalzemesi}
                </option>
                {MALZEMELER.map((mz) => (
                  <option key={mz} value={mz}>
                    {m.sabit.catiMalzemesi[mz]}
                  </option>
                ))}
              </select>
            </div>
            <div className={`ipucu-kucuk ${c2StandartDisi ? 'hata-metni' : ''}`}>
              {tamC2Secim
                ? `C2 = ${sayi(C2, 1)}`
                : c2StandartDisi
                  ? t.c2StandartDisi(sayi(eskiC2, 2))
                  : C2 !== null
                    ? t.c2Mevcut(sayi(C2, 1))
                    : t.c2Sec}
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
                <span className="anahtar">{t.gerekliSeviye}</span>
                <span className="seviye-rozet" style={{ background: onizleme.renk }}>
                  {onizleme.seviye}
                </span>
              </div>
            </div>
          ) : (
            <p className="ipucu-kucuk">
              {!nkGecerliMi(proje) ? t.onizlemeNk : t.onizlemeEksik}
            </p>
          )}

          <Anahtar id="kritik" checked={kritik} onCheckedChange={setKritik} etiket={t.kritik} />

          <div className="modal-butonlar">
            <button type="button" className="ikincil-buton" onClick={kapat}>
              {m.ortak.iptal}
            </button>
            <button type="submit" className="buton-birincil" disabled={!gecerli}>
              {m.genel.kaydet}
            </button>
          </div>
        </form>
      )}
    </Pencere>
  );
}
