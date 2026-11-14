import { useRef, useState, type RefObject } from 'react';
import { raporIcerigi, raporOzeti, type Revizyon } from '../../core';
import { raporNoAyarla, revizyonlarAyarla, tesisAdresiAyarla } from '../durum/eylemler';
import { UYGULAMA } from '../durum/kalicilik';
import { useProje } from '../durum/ProjeSaglayici';
import type { HaritaApi } from '../harita/Harita';
import { KATMANLAR, etkinKatman } from '../harita/katmanlar';
import { useEtkilesim } from '../ortak/Etkilesim';
import { MuhendisAlanlari } from '../ortak/MuhendisAlanlari';
import { Pencere } from '../ortak/Pencere';
import { dosyaKaydet, guvenliDosyaAdi } from '../platform/tauri';
import { dataUrlOku, dataUrldenGorsel } from '../rapor/gorsel';

const bugun = () => new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Bir sonraki revizyon numarası: "00" → "01", "A" gibi sayı olmayanlarda boş. */
function sonrakiNo(liste: Revizyon[]): string {
  const son = liste[liste.length - 1]?.no.trim();
  if (son === undefined) return '00';
  return /^\d+$/.test(son) ? String(Number(son) + 1).padStart(Math.max(2, son.length), '0') : '';
}

function Revizyonlar() {
  const { proje, guncelle } = useProje();
  const liste = proje.revizyonlar ?? [];
  const yaz = (yeni: Revizyon[]) => guncelle(revizyonlarAyarla(yeni), 'revizyonlar');
  const degistir = (i: number, d: Partial<Revizyon>) => yaz(liste.map((r, j) => (j === i ? { ...r, ...d } : r)));

  return (
    <div className="form-dikey">
      {liste.length === 0 && <p className="ipucu-kucuk">Revizyon girilmezse raporda "00, İlk yayın" yazılır.</p>}
      {liste.map((r, i) => (
        <div key={i} className="revizyon-satir">
          <input aria-label="Revizyon no" value={r.no} onChange={(e) => degistir(i, { no: e.target.value })} placeholder="Rev." />
          <input aria-label="Revizyon tarihi" value={r.tarih} onChange={(e) => degistir(i, { tarih: e.target.value })} placeholder="gg.aa.yyyy" />
          <input aria-label="Revizyon açıklaması" value={r.aciklama} onChange={(e) => degistir(i, { aciklama: e.target.value })} placeholder="Açıklama" />
          <button type="button" className="mini-buton mini-buton-tehlike" onClick={() => yaz(liste.filter((_, j) => j !== i))}>
            Sil
          </button>
        </div>
      ))}
      <div>
        <button type="button" onClick={() => yaz([...liste, { no: sonrakiNo(liste), tarih: bugun(), aciklama: liste.length ? '' : 'İlk yayın' }])}>
          Revizyon ekle
        </button>
      </div>
    </div>
  );
}

export function RaporSihirbazi({ kapat, harita }: { kapat: () => void; harita: RefObject<HaritaApi | null> }) {
  const { proje, sonuc, guncelle, ayarlar, ayarGuncelle, haritaAnahtarlari } = useProje();
  const katman = KATMANLAR[etkinKatman(ayarlar.katman, haritaAnahtarlari)];
  const { bildir } = useEtkilesim();
  const [raporTarihi, setRaporTarihi] = useState(bugun);
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
      bildir('Logo için PNG veya JPEG dosyası seçin.', 'hata');
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
        if (!haritaSekli) bildir('Harita görüntüsü alınamadı; rapor görselsiz üretiliyor.', 'hata');
      }
      const haritaGorseli = haritaSekli ? await dataUrldenGorsel(haritaSekli.url) : null;
      const icerik = raporIcerigi(proje, sonuc, {
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
      });
      const gorseller = {
        logo: logo ? await dataUrldenGorsel(logo.dataUrl) : null,
        harita: haritaGorseli,
        imza: ayarlar.muhendis.imza ? await dataUrldenGorsel(ayarlar.muhendis.imza) : null,
      };
      const ad = `${guvenliDosyaAdi(proje.isim, 'rapor')}-paratoner-raporu`;
      let yol: string | null;
      if (tur === 'docx') {
        const { raporBaytlari } = await import('../rapor/docx');
        yol = await dosyaKaydet(`${ad}.docx`, await raporBaytlari(icerik, gorseller), { ad: 'Word belgesi', uzantilar: ['docx'] });
      } else {
        const { pdfBaytlari } = await import('../rapor/pdf');
        yol = await dosyaKaydet(`${ad}.pdf`, await pdfBaytlari(icerik, gorseller), { ad: 'PDF belgesi', uzantilar: ['pdf'] });
      }
      if (yol) bildir(`Rapor kaydedildi: ${yol}`, 'basari');
    } catch (e) {
      bildir(`Rapor üretilemedi: ${e instanceof Error ? e.message : String(e)}`, 'hata');
    } finally {
      setUretiliyor(null);
    }
  }

  return (
    <Pencere acik kapat={kapat} baslik="Rapor oluştur" boyut="genis">
      {proje.yapilar.length === 0 ? (
        <p className="ipucu">Rapor üretmek için önce en az bir yapı ve bir paratoner eklemeniz gerekiyor.</p>
      ) : (
        <div className="form-dikey">
          <div className="hesap-sonuc-kutu">
            <div className="satir">
              <span className="anahtar">Toplam yapı</span>
              <span>{ozet.toplam}</span>
            </div>
            <div className="satir">
              <span className="anahtar">Koruma yeterli</span>
              <span>
                {ozet.yeterli}
                {ozet.yeterliKombine ? ` (${ozet.yeterliKombine} birleşik koruma ile)` : ''}
              </span>
            </div>
            {ozet.istegeBagli > 0 && (
              <div className="satir">
                <span className="anahtar">Koruma isteğe bağlı</span>
                <span>{ozet.istegeBagli}</span>
              </div>
            )}
            {ozet.kismi > 0 && (
              <div className="satir">
                <span className="anahtar">Kısmi koruma</span>
                <span>{ozet.kismi}</span>
              </div>
            )}
            {ozet.yetersiz > 0 && (
              <div className="satir">
                <span className="anahtar">Koruma yetersiz</span>
                <span>{ozet.yetersiz}</span>
              </div>
            )}
            {ozet.koruyucuYok > 0 && (
              <div className="satir">
                <span className="anahtar">Koruyucu bulunamadı</span>
                <span>{ozet.koruyucuYok}</span>
              </div>
            )}
            {ozet.hesaplanamadi > 0 && (
              <div className="satir">
                <span className="anahtar">Hesaplanamadı</span>
                <span>{ozet.hesaplanamadi}</span>
              </div>
            )}
          </div>

          {hatalar.length > 0 && (
            <div className="uyari-blok hata">
              <b>Rapor üretmeden önce düzeltilmesi gerekenler</b>
              <ul>
                {hatalar.map((h, i) => (
                  <li key={i}>{h.mesaj}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="rapor-bolum-baslik">Kapak</p>
          <div className="form-grid-2">
            <label>
              Firma / kurum adı
              <input value={ayarlar.firmaAdi} onChange={(e) => ayarGuncelle({ firmaAdi: e.target.value })} placeholder="bugra" />
            </label>
            <label>
              Rapor no
              <input value={proje.rapor_no ?? ''} onChange={(e) => guncelle(raporNoAyarla(e.target.value), 'rapor-no')} placeholder="İsteğe bağlı" />
            </label>
          </div>
          <div className="form-grid-2">
            <label>
              Tesis adresi
              <input value={proje.tesis_adresi ?? ''} onChange={(e) => guncelle(tesisAdresiAyarla(e.target.value), 'tesis-adresi')} placeholder="bugra" />
            </label>
            <label>
              Rapor tarihi
              <input value={raporTarihi} onChange={(e) => setRaporTarihi(e.target.value)} placeholder="gg.aa.yyyy" />
            </label>
          </div>
          <label>
            Firma logosu (isteğe bağlı, PNG/JPEG)
            <div className="logo-yukleme-satir">
              <button type="button" onClick={() => logoRef.current?.click()}>
                Logo seç
              </button>
              <input ref={logoRef} type="file" accept="image/png,image/jpeg" hidden onChange={logoSec} />
              {logo && (
                <>
                  <img src={logo.dataUrl} alt="Logo önizleme" className="logo-onizleme" />
                  <span className="logo-dosya-adi">{logo.ad}</span>
                  <button type="button" className="mini-buton mini-buton-tehlike" onClick={() => setLogo(null)}>
                    Kaldır
                  </button>
                </>
              )}
            </div>
          </label>
          <label className="checkbox-satir">
            <input type="checkbox" checked={haritaEkle} onChange={(e) => setHaritaEkle(e.target.checked)} />
            Harita şeklini rapora ekle (harita sahaya odaklanır; ölçek, kuzey oku, lejant ve atıf eklenir)
          </label>
          {haritaEkle && (
            <p className="ipucu-kucuk">
              Şekil o an seçili katmandan alınır: {katman.isim}.
              {katman.saglayici === 'google' &&
                " Google görüntüsünün ticari belgelerde kullanımı Google'ın izin kurallarına bağlıdır; şekle Google ve veri sağlayıcılarının telif metni yazılır. Emin değilseniz raporu oluşturmadan önce Esri ya da OpenStreetMap katmanına geçin."}
            </p>
          )}

          <hr className="bolum-ayirici" />
          <p className="rapor-bolum-baslik">Revizyonlar (projeyle kaydedilir)</p>
          <Revizyonlar />

          <hr className="bolum-ayirici" />
          <p className="rapor-bolum-baslik">Hazırlayan (bütün projeler için saklanır)</p>
          <MuhendisAlanlari />

          <hr className="bolum-ayirici" />
          <p className="rapor-bolum-baslik">Yapı bazlı saha notları (isteğe bağlı)</p>
          {proje.yapilar.map((y) => (
            <label key={y.id}>
              {y.isim}
              <input value={yapiNotlari[y.id] ?? ''} onChange={(e) => setYapiNotlari({ ...yapiNotlari, [y.id]: e.target.value })} placeholder="Saha gözlemi, revizyon notu vb." />
            </label>
          ))}

          <hr className="bolum-ayirici" />
          <label>
            Genel sonuç: ek yorum (isteğe bağlı)
            <textarea rows={3} value={genelNot} onChange={(e) => setGenelNot(e.target.value)} />
          </label>

          <div className="modal-butonlar">
            <button className="ikincil-buton" onClick={() => uret('pdf')} disabled={!uretilebilir || uretiliyor !== null}>
              {uretiliyor === 'pdf' ? 'Oluşturuluyor…' : 'PDF oluştur'}
            </button>
            <button className="buton-birincil" onClick={() => uret('docx')} disabled={!uretilebilir || uretiliyor !== null}>
              {uretiliyor === 'docx' ? 'Oluşturuluyor…' : 'Word raporu oluştur'}
            </button>
          </div>
        </div>
      )}
    </Pencere>
  );
}
