import { useEffect, useState } from 'react';
import { eksikYapilar, hesabaGirenParatonerler, raporOzeti, type LatLng } from '../../core';
import { useProje } from '../durum/ProjeSaglayici';
import { IMLEC_OLAYI } from '../harita/Harita';

const koordinat = (deger: number, arti: string, eksi: string) => `${Math.abs(deger).toFixed(6).replace('.', ',')}° ${deger >= 0 ? arti : eksi}`;

/** Fare haritadayken imlecin koordinatı. Kendi durumunu tutar: fare hareketi başka hiçbir şeyi yeniden çizmez. */
function ImlecKoordinati() {
  const [konum, setKonum] = useState<LatLng | null>(null);
  useEffect(() => {
    const dinle = (e: Event) => setKonum((e as CustomEvent<LatLng | null>).detail);
    window.addEventListener(IMLEC_OLAYI, dinle);
    return () => window.removeEventListener(IMLEC_OLAYI, dinle);
  }, []);
  if (!konum) return null;
  return (
    <span className="durum-cubugu-koordinat" title="İmlecin koordinatı (WGS 84)">
      {koordinat(konum.lat, 'K', 'G')} · {koordinat(konum.lng, 'D', 'B')}
    </span>
  );
}

/**
 * Pencerenin altındaki durum çubuğu: projenin tek satırlık sonucu, sayılar, proje parametreleri
 * ve imleç koordinatı. Sonuç özetine tıklanınca ayrıntılı hesap açılır.
 */
export function DurumCubugu({ hesapTablosuAc, ayarlariAc }: { hesapTablosuAc: () => void; ayarlariAc: () => void }) {
  const { proje, sonuc } = useProje();
  const ozet = raporOzeti(sonuc);
  const etkin = hesabaGirenParatonerler(proje).length;
  const eksik = eksikYapilar(sonuc).length;
  const hata = sonuc.dogrulama.hatalar.length;
  // Nd ≤ Nc olduğu için koruma zorunlu değil, ama yapının tamamı da kapsanmıyor: "koruma altında" denmez.
  const istegeBagliAcikta = sonuc.yapilar.filter((y) => y.nihai.kod === 'ISTEGE_BAGLI_DISINDA').length;

  let durum: { sinif: string; metin: string };
  if (proje.yapilar.length === 0) durum = { sinif: 'notr', metin: 'Yapı eklenmedi' };
  else if (ozet.hesaplanamadi > 0) durum = { sinif: 'hata', metin: `${hata} eksik ya da hatalı girdi: ${ozet.hesaplanamadi} yapı hesaplanamadı` };
  else if (eksik > 0) durum = { sinif: 'hata', metin: `${ozet.toplam} yapıdan ${eksik} tanesi tam korunmuyor` };
  else if (istegeBagliAcikta > 0) durum = { sinif: 'notr', metin: `${istegeBagliAcikta} yapıda koruma isteğe bağlı, tamamı kapsanmıyor` };
  else durum = { sinif: 'tamam', metin: ozet.toplam === 1 ? 'Yapı koruma altında' : `${ozet.toplam} yapının hepsi koruma altında` };

  return (
    <footer className="durum-cubugu">
      <button className={`durum-cubugu-sonuc ${durum.sinif}`} onClick={hesapTablosuAc} title="Ayrıntılı hesabı aç">
        <span className="durum-cubugu-nokta" />
        {durum.metin}
      </button>
      <span className="durum-cubugu-oge">
        {proje.yapilar.length} yapı · {proje.paratonerler.length} paratoner
        {etkin !== proje.paratonerler.length ? ` (${etkin} etkin)` : ''}
      </span>
      <span className="durum-cubugu-bosluk" />
      <ImlecKoordinati />
      <button className="durum-cubugu-oge durum-cubugu-parametre" onClick={ayarlariAc} title="Proje parametreleri">
        Nk {proje.Nk ?? '–'} · ΔT {proje.deltaT_modu === 'paratoner' ? 'paratoner bazlı' : proje.deltaT !== null ? `${proje.deltaT} µs` : '–'}
      </button>
      <span className="durum-cubugu-oge">NF C 17-102</span>
    </footer>
  );
}
