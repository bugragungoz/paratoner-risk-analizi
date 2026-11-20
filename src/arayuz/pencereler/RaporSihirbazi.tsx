import { useRef, useState, type RefObject } from 'react';
import { projeyiHesapla, raporIcerigi, raporOzeti, type Revizyon } from '../../core';
import { DILLER, metinler, type Dil } from '../../dil';
import { raporNoAyarla, revizyonlarAyarla, tesisAdresiAyarla } from '../durum/eylemler';
import { UYGULAMA } from '../durum/kalicilik';
import { useProje } from '../durum/ProjeSaglayici';
import type { HaritaApi } from '../harita/Harita';
import { KATMANLAR, etkinKatman } from '../harita/katmanlar';
import { useMetinler } from '../ortak/useMetinler';
import { useEtkilesim } from '../ortak/Etkilesim';
import { MuhendisAlanlari } from '../ortak/MuhendisAlanlari';
import { Pencere } from '../ortak/Pencere';
import { dosyaKaydet, guvenliDosyaAdi } from '../platform/tauri';
import { dataUrlOku, dataUrldenGorsel } from '../rapor/gorsel';

const bugun = (yerel: string) => new Date().toLocaleDateString(yerel, { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Bir sonraki revizyon numarası: "00" → "01", "A" gibi sayı olmayanlarda boş. */
function sonrakiNo(liste: Revizyon[]): string {
  const son = liste[liste.length - 1]?.no.trim();
  if (son === undefined) return '00';
  return /^\d+$/.test(son) ? String(Number(son) + 1).padStart(Math.max(2, son.length), '0') : '';
}

function Revizyonlar({ yerel, ilkYayin }: { yerel: string; ilkYayin: string }) {
  const { proje, guncelle } = useProje();
  const m = useMetinler();
  const t = m.raporSihirbazi;
  const liste = proje.revizyonlar ?? [];
  const yaz = (yeni: Revizyon[]) => guncelle(revizyonlarAyarla(yeni), 'revizyonlar');
  const degistir = (i: number, d: Partial<Revizyon>) => yaz(liste.map((r, j) => (j === i ? { ...r, ...d } : r)));

  return (
    <div className="form-dikey">
      {liste.length === 0 && <p className="ipucu-kucuk">{t.revizyonYok}</p>}
      {liste.map((r, i) => (
        <div key={i} className="revizyon-satir">
          <input aria-label={t.revNo} value={r.no} onChange={(e) => degistir(i, { no: e.target.value })} placeholder={t.rev} />
          <input aria-label={t.revTarih} value={r.tarih} onChange={(e) => degistir(i, { tarih: e.target.value })} placeholder={t.tarihBicimi} />
          <input aria-label={t.revAciklama} value={r.aciklama} onChange={(e) => degistir(i, { aciklama: e.target.value })} placeholder={m.genel.aciklama} />
          <button type="button" className="mini-buton mini-buton-tehlike" onClick={() => yaz(liste.filter((_, j) => j !== i))}>
            {m.genel.sil}
          </button>
        </div>
      ))}
      <div>
        <button type="button" onClick={() => yaz([...liste, { no: sonrakiNo(liste), tarih: bugun(yerel), aciklama: liste.length ? '' : ilkYayin }])}>
          {t.revizyonEkle}
        </button>
      </div>
    </div>
  );
}

export function RaporSihirbazi({ kapat, harita }: { kapat: () => void; harita: RefObject<HaritaApi | null> }) {
  const { proje, sonuc, guncelle, ayarlar, ayarGuncelle, haritaAnahtarlari } = useProje();
  const m = useMetinler();
  const t = m.raporSihirbazi;
  const katmanAdi = etkinKatman(ayarlar.katman, haritaAnahtarlari);
  const katman = KATMANLAR[katmanAdi];
  const { bildir } = useEtkilesim();
  // Raporun dili arayüz dilinden ayrı seçilebilir; sonuç ve metinler rapor dilinde yeniden hesaplanır.
  const [raporDili, setRaporDili] = useState<Dil>(ayarlar.dil);
  const r = metinler(raporDili);
  const [raporTarihi, setRaporTarihi] = useState(() => bugun(r.bicim.yerel));
  const [genelNot, setGenelNot] = useState('');
  const [yapiNotlari, setYapiNotlari] = useState<Record<string, string>>({});
  const [logo, setLogo] = useState<{ dataUrl: string; ad: string } | null>(null);
  const [haritaEkle, setHaritaEkle] = useState(true);
  const [uretiliyor, setUretiliyor] = useState<'docx' | 'pdf' | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const ozet = raporOzeti(sonuc);
  const { hatalar } = sonuc.dogrulama;
  const uretilebilir = proje.yapilar.length > 0 && hatalar.length === 0;

  async function logoSec(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    e.target.value = '';
    if (!dosya) return;
    if (!['image/png', 'image/jpeg'].includes(dosya.type)) {
      bildir(m.genel.pngJpeg(t.logo), 'hata');
      return;
    }
    setLogo({ dataUrl: await dataUrlOku(dosya), ad: dosya.name });
  }

  async function uret(tur: 'docx' | 'pdf') {
    setUretiliyor(tur);
    try {
      let haritaSekli: { url: string; atif: string } | null = null;
      if (haritaEkle && harita.current) {
        await harita.current.projeyeOdakla();
        haritaSekli = await harita.current.goruntuAl();
        if (!haritaSekli) bildir(t.haritaAlinamadi, 'hata');
      }
      const haritaGorseli = haritaSekli ? await dataUrldenGorsel(haritaSekli.url) : null;
      // Arayüzle aynı dilde hazır sonuç kullanılır; başka dilde durum etiketleri ve mesajlar için yeniden hesaplanır.
      const raporSonucu = raporDili === ayarlar.dil ? sonuc : projeyiHesapla(proje, undefined, r);
      const icerik = raporIcerigi(proje, raporSonucu, {
        firmaAdi: ayarlar.firmaAdi,
        tesisAdresi: proje.tesis_adresi ?? '',
        raporTarihi,
        raporNo: proje.rapor_no ?? '',
        revizyonlar: proje.revizyonlar ?? [],
        muhendis: ayarlar.muhendis,
        genelSonucNotu: genelNot,
        yapiNotlari,
        haritaVar: !!haritaGorseli,
        haritaAtfi: haritaSekli?.atif ?? '',
        uygulama: UYGULAMA,
      }, r);
      const gorseller = {
        logo: logo ? await dataUrldenGorsel(logo.dataUrl) : null,
        harita: haritaGorseli,
        imza: ayarlar.muhendis.imza ? await dataUrldenGorsel(ayarlar.muhendis.imza) : null,
      };
      const ad = `${guvenliDosyaAdi(proje.isim, 'rapor')}-${r.raporSihirbazi.dosyaAdi}`;
      let yol: string | null;
      if (tur === 'docx') {
        const { raporBaytlari } = await import('../rapor/docx');
        yol = await dosyaKaydet(`${ad}.docx`, await raporBaytlari(icerik, gorseller), { ad: t.wordBelgesi, uzantilar: ['docx'] });
      } else {
        const { pdfBaytlari } = await import('../rapor/pdf');
        yol = await dosyaKaydet(`${ad}.pdf`, await pdfBaytlari(icerik, gorseller), { ad: t.pdfBelgesi, uzantilar: ['pdf'] });
      }
      if (yol) bildir(t.kaydedildi(yol), 'basari');
    } catch (e) {
      bildir(t.uretilemedi(e instanceof Error ? e.message : String(e)), 'hata');
    } finally {
      setUretiliyor(null);
    }
  }

  return (
    <Pencere acik kapat={kapat} baslik={t.baslik} boyut="genis">
      {proje.yapilar.length === 0 ? (
        <p className="ipucu">{t.yapiYok}</p>
      ) : (
        <div className="form-dikey">
          <div className="hesap-sonuc-kutu">
            <div className="satir">
              <span className="anahtar">{t.toplamYapi}</span>
              <span>{ozet.toplam}</span>
            </div>
            <div className="satir">
              <span className="anahtar">{t.korumaYeterli}</span>
              <span>
                {ozet.yeterli}
                {ozet.yeterliKombine ? t.birlesikIle(ozet.yeterliKombine) : ''}
              </span>
            </div>
            {ozet.istegeBagli > 0 && (
              <div className="satir">
                <span className="anahtar">{t.istegeBagli}</span>
                <span>{ozet.istegeBagli}</span>
              </div>
            )}
            {ozet.kismi > 0 && (
              <div className="satir">
                <span className="anahtar">{t.kismi}</span>
                <span>{ozet.kismi}</span>
              </div>
            )}
            {ozet.yetersiz > 0 && (
              <div className="satir">
                <span className="anahtar">{t.yetersiz}</span>
                <span>{ozet.yetersiz}</span>
              </div>
            )}
            {ozet.koruyucuYok > 0 && (
              <div className="satir">
                <span className="anahtar">{t.koruyucuYok}</span>
                <span>{ozet.koruyucuYok}</span>
              </div>
            )}
            {ozet.hesaplanamadi > 0 && (
              <div className="satir">
                <span className="anahtar">{t.hesaplanamadi}</span>
                <span>{ozet.hesaplanamadi}</span>
              </div>
            )}
          </div>

          {hatalar.length > 0 && (
            <div className="uyari-blok hata">
              <b>{t.duzeltilecekler}</b>
              <ul>
                {hatalar.map((h, i) => (
                  <li key={i}>{h.mesaj}</li>
                ))}
              </ul>
            </div>
          )}

          <label>
            {t.raporDili}
            <select
              value={raporDili}
              onChange={(e) => {
                const yeni = e.target.value as Dil;
                // Elle değiştirilmemiş bugünün tarihi yeni dilin biçimine geçer.
                if (raporTarihi === bugun(r.bicim.yerel)) setRaporTarihi(bugun(metinler(yeni).bicim.yerel));
                setRaporDili(yeni);
              }}
            >
              {DILLER.map((d) => (
                <option key={d} value={d} lang={d}>
                  {m.dil[d]}
                </option>
              ))}
            </select>
            <span className="ipucu-kucuk">{t.raporDiliNotu}</span>
          </label>

          <p className="rapor-bolum-baslik">{t.kapak}</p>
          <div className="form-grid-2">
            <label>
              {t.firma}
              <input value={ayarlar.firmaAdi} onChange={(e) => ayarGuncelle({ firmaAdi: e.target.value })} placeholder="bugra" />
            </label>
            <label>
              {t.raporNo}
              <input value={proje.rapor_no ?? ''} onChange={(e) => guncelle(raporNoAyarla(e.target.value), 'rapor-no')} placeholder={m.genel.istegeBagli} />
            </label>
          </div>
          <div className="form-grid-2">
            <label>
              {t.tesisAdresi}
              <input value={proje.tesis_adresi ?? ''} onChange={(e) => guncelle(tesisAdresiAyarla(e.target.value), 'tesis-adresi')} placeholder="bugra" />
            </label>
            <label>
              {t.raporTarihi}
              <input value={raporTarihi} onChange={(e) => setRaporTarihi(e.target.value)} placeholder={r.raporSihirbazi.tarihBicimi} />
            </label>
          </div>
          <label>
            {t.logoAlani}
            <div className="logo-yukleme-satir">
              <button type="button" onClick={() => logoRef.current?.click()}>
                {t.logoSec}
              </button>
              <input ref={logoRef} type="file" accept="image/png,image/jpeg" hidden onChange={logoSec} />
              {logo && (
                <>
                  <img src={logo.dataUrl} alt={t.logoOnizleme} className="logo-onizleme" />
                  <span className="logo-dosya-adi">{logo.ad}</span>
                  <button type="button" className="mini-buton mini-buton-tehlike" onClick={() => setLogo(null)}>
                    {m.genel.kaldir}
                  </button>
                </>
              )}
            </div>
          </label>
          <label className="checkbox-satir">
            <input type="checkbox" checked={haritaEkle} onChange={(e) => setHaritaEkle(e.target.checked)} />
            {t.haritaEkle}
          </label>
          {haritaEkle && (
            <p className="ipucu-kucuk">
              {t.katmanNotu(m.katman[katmanAdi])}
              {katman.saglayici === 'google' && t.googleNotu}
            </p>
          )}

          <hr className="bolum-ayirici" />
          <p className="rapor-bolum-baslik">{t.revizyonlar}</p>
          <Revizyonlar yerel={r.bicim.yerel} ilkYayin={r.rapor.ilkYayin} />

          <hr className="bolum-ayirici" />
          <p className="rapor-bolum-baslik">{t.hazirlayan}</p>
          <MuhendisAlanlari />

          <hr className="bolum-ayirici" />
          <p className="rapor-bolum-baslik">{t.sahaNotlari}</p>
          {proje.yapilar.map((y) => (
            <label key={y.id}>
              {y.isim}
              <input value={yapiNotlari[y.id] ?? ''} onChange={(e) => setYapiNotlari({ ...yapiNotlari, [y.id]: e.target.value })} placeholder={t.sahaNotuOrnek} />
            </label>
          ))}

          <hr className="bolum-ayirici" />
          <label>
            {t.genelNot}
            <textarea rows={3} value={genelNot} onChange={(e) => setGenelNot(e.target.value)} />
          </label>

          <div className="modal-butonlar">
            <button className="ikincil-buton" onClick={() => uret('pdf')} disabled={!uretilebilir || uretiliyor !== null}>
              {uretiliyor === 'pdf' ? t.olusturuluyor : t.pdfOlustur}
            </button>
            <button className="buton-birincil" onClick={() => uret('docx')} disabled={!uretilebilir || uretiliyor !== null}>
              {uretiliyor === 'docx' ? t.olusturuluyor : t.wordOlustur}
            </button>
          </div>
        </div>
      )}
    </Pencere>
  );
}
