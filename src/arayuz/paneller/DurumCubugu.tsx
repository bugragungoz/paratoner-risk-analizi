import { useEffect, useState } from 'react';
import { eksikYapilar, hesabaGirenParatonerler, raporOzeti, type LatLng } from '../../core';
import { useProje } from '../durum/ProjeSaglayici';
import { IMLEC_OLAYI } from '../harita/Harita';
import { useMetinler } from '../ortak/useMetinler';


/** Fare haritadayken imlecin koordinatı. Kendi durumunu tutar: fare hareketi başka hiçbir şeyi yeniden çizmez. */
function ImlecKoordinati() {
  const [konum, setKonum] = useState<LatLng | null>(null);
  const m = useMetinler();
  const koordinat = (deger: number, arti: string, eksi: string) => `${m.bicim.sayi(Math.abs(deger), 6)}° ${deger >= 0 ? arti : eksi}`;
  useEffect(() => {
    const dinle = (e: Event) => setKonum((e as CustomEvent<LatLng | null>).detail);
    window.addEventListener(IMLEC_OLAYI, dinle);
    return () => window.removeEventListener(IMLEC_OLAYI, dinle);
  }, []);
  if (!konum) return null;
  return (
    <span className="durum-cubugu-koordinat" title={m.durum.imlec}>
      {koordinat(konum.lat, m.durum.kuzey, m.durum.guney)} · {koordinat(konum.lng, m.durum.dogu, m.durum.bati)}
    </span>
  );
}

/**
 * Pencerenin altındaki durum çubuğu: projenin tek satırlık sonucu, sayılar, proje parametreleri
 * ve imleç koordinatı. Sonuç özetine tıklanınca ayrıntılı hesap açılır.
 */
export function DurumCubugu({ hesapTablosuAc, ayarlariAc }: { hesapTablosuAc: () => void; ayarlariAc: () => void }) {
  const { proje, sonuc } = useProje();
  const t = useMetinler().durum;
  const ozet = raporOzeti(sonuc);
  const etkin = hesabaGirenParatonerler(proje).length;
  const eksik = eksikYapilar(sonuc).length;
  const hata = sonuc.dogrulama.hatalar.length;
  // Nd ≤ Nc olduğu için koruma zorunlu değil, ama yapının tamamı da kapsanmıyor: "koruma altında" denmez.
  const istegeBagliAcikta = sonuc.yapilar.filter((y) => y.nihai.kod === 'ISTEGE_BAGLI_DISINDA').length;

  let durum: { sinif: string; metin: string };
  if (proje.yapilar.length === 0) durum = { sinif: 'notr', metin: t.yapiYok };
  else if (ozet.hesaplanamadi > 0) durum = { sinif: 'hata', metin: t.hesaplanamadi(hata, ozet.hesaplanamadi) };
  else if (eksik > 0) durum = { sinif: 'hata', metin: t.eksik(ozet.toplam, eksik) };
  else if (istegeBagliAcikta > 0) durum = { sinif: 'notr', metin: t.istegeBagliAcikta(istegeBagliAcikta) };
  else durum = { sinif: 'tamam', metin: ozet.toplam === 1 ? t.tekYapiTamam : t.hepsiTamam(ozet.toplam) };

  return (
    <footer className="durum-cubugu">
      <button className={`durum-cubugu-sonuc ${durum.sinif}`} onClick={hesapTablosuAc} title={t.hesabiAc}>
        <span className="durum-cubugu-nokta" />
        {durum.metin}
      </button>
      <span className="durum-cubugu-oge">
        {t.sayilar(proje.yapilar.length, proje.paratonerler.length)}
        {etkin !== proje.paratonerler.length ? t.etkin(etkin) : ''}
      </span>
      <span className="durum-cubugu-bosluk" />
      <ImlecKoordinati />
      <button className="durum-cubugu-oge durum-cubugu-parametre" onClick={ayarlariAc} title={t.parametreler}>
        Nk {proje.Nk ?? '–'} · ΔT {proje.deltaT_modu === 'paratoner' ? t.paratonerBazli : proje.deltaT !== null ? `${proje.deltaT} µs` : '–'}
      </button>
      <span className="durum-cubugu-oge">NF C 17-102</span>
    </footer>
  );
}
