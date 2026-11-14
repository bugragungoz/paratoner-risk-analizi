import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cihazAyarla, deltaTAyarla, deltaTModuAyarla, hEsikleriAyarla, nkAyarla, tesisAdresiAyarla } from '../durum/eylemler';
import { useProje } from '../durum/ProjeSaglayici';
import { DeltaTSecici, MGM_BAGLANTISI } from '../paneller/ProjeParametreleriPaneli';
import { Anahtar } from '../ortak/Anahtar';
import { DegerListesi } from '../ortak/DegerListesi';
import { MuhendisAlanlari } from '../ortak/MuhendisAlanlari';
import { CProfilleriAyarlari } from './CProfilleriAyarlari';
import { HaritaServisleriAyarlari } from './HaritaServisleriAyarlari';
import { Pencere } from '../ortak/Pencere';
import { SayiGirdisi } from '../ortak/SayiGirdisi';
import { disBaglantiAc, otomatikKayitlariListele, tauriMi, type OtomatikKayitBilgisi } from '../platform/tauri';

export type AyarSekmesi = 'proje' | 'profiller' | 'rapor' | 'harita' | 'uygulama';

const tarih = (ms: number) => new Date(ms).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const boyut = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

/** Otomatik kayıt klasörü ve içindeki kayıtlar/yedekler (masaüstü). */
function OtomatikKayitlar({ kurtarmaAc }: { kurtarmaAc: (yol: string) => void }) {
  const { ayarlar, sonOtomatikKayit } = useProje();
  const [liste, setListe] = useState<{ klasor: string; kayitlar: OtomatikKayitBilgisi[] } | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(() => {
    otomatikKayitlariListele(ayarlar.otomatikKayitKonumu)
      .then((l) => {
        setListe(l);
        setHata(null);
      })
      .catch((e) => setHata(e instanceof Error ? e.message : String(e)));
  }, [ayarlar.otomatikKayitKonumu]);

  useEffect(() => {
    yenile();
  }, [yenile, sonOtomatikKayit]);

  return (
    <div className="form-dikey">
      <div className="alan-etiketi satir-icinde">
        <span>Kayıtlar ve yedekler</span>
        <button className="ikon-buton" onClick={yenile} title="Listeyi yenile">
          <RefreshCw size={13} />
        </button>
      </div>
      {liste && <div className="yol-metni">{liste.klasor}</div>}
      {hata && <p className="ipucu-kucuk">Liste okunamadı: {hata}</p>}
      {liste && liste.kayitlar.length === 0 && <p className="ipucu-kucuk">Henüz otomatik kayıt yok. Kaydedilmemiş bir değişiklik yaptığınızda proje buraya yazılır.</p>}
      {liste && liste.kayitlar.length > 0 && (
        <div className="kayit-listesi">
          {liste.kayitlar.map((k) => (
            <div key={k.yol} className="kayit-satiri">
              {k.yedek && <span className="kayit-etiketi">Yedek</span>}
              <span className="kayit-satiri-ad" title={k.yol}>
                {k.dosyaAdi}
              </span>
              <span className="kayit-satiri-bilgi">
                {tarih(k.degistirilmeMs)} · {boyut(k.boyut)}
              </span>
              <button className="mini-buton" onClick={() => kurtarmaAc(k.yol)}>
                Aç
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="ipucu-kucuk">
        Açılan kayıt "kaydedilmemiş" sayılır; Kaydet ile kendi klasörünüze yeni bir .ptproj dosyası olarak kaydedin. Her proje için 10 dakikada bir yedek alınır, en yeni 5 yedek
        saklanır.
      </p>
    </div>
  );
}

export function AyarlarPenceresi({ kapat, ilkSekme = 'proje', kurtarmaAc }: { kapat: () => void; ilkSekme?: AyarSekmesi; kurtarmaAc: (yol: string) => void }) {
  const { proje, guncelle, ayarlar, ayarGuncelle } = useProje();
  const [sekme, setSekme] = useState<AyarSekmesi>(ilkSekme);
  const masaustu = tauriMi();
  const paratonerBazli = proje.deltaT_modu === 'paratoner';
  const ozelDeltaTli = proje.paratonerler.filter((p) => p.deltaT != null).length;

  return (
    <Pencere acik kapat={kapat} baslik="Ayarlar" boyut="genis">
      <div className="sekmeler" role="tablist">
        {(
          [
            ['proje', 'Proje'],
            ['profiller', 'C profilleri'],
            ['rapor', 'Rapor'],
            ['harita', 'Harita servisleri'],
            ['uygulama', 'Uygulama'],
          ] as const
        ).map(([s, etiket]) => (
          <button key={s} role="tab" aria-selected={sekme === s} className={sekme === s ? 'sekme aktif' : 'sekme'} onClick={() => setSekme(s)}>
            {etiket}
          </button>
        ))}
      </div>

      {sekme === 'proje' && (
        <div className="form-dikey">
          <label>
            Nk — Yıldırımlı gün sayısı (Td)
            <SayiGirdisi deger={proje.Nk} degisti={(n) => guncelle(nkAyarla(n), 'nk')} asgari={0} asgariHaric placeholder="Zorunlu" className={proje.Nk == null ? 'girdi-eksik' : ''} />
          </label>
          <button className="baglanti-buton" onClick={() => disBaglantiAc(MGM_BAGLANTISI)}>
            MGM il/ilçe istatistiklerinden oraj gün sayısına bakın →
          </button>

          <hr className="bolum-ayirici" />
          <div className="alan-etiketi">ΔT (paratoner yayılım süresi)</div>
          <div className="secim-kartlari">
            <button type="button" className={!paratonerBazli ? 'secim-karti secili' : 'secim-karti'} onClick={() => guncelle(deltaTModuAyarla('proje'))}>
              <b>Proje bazlı</b>
              <span>Bütün paratonerler aynı ΔT'yi kullanır.</span>
            </button>
            <button type="button" className={paratonerBazli ? 'secim-karti secili' : 'secim-karti'} onClick={() => guncelle(deltaTModuAyarla('paratoner'))}>
              <b>Paratoner bazlı</b>
              <span>Her paratoner kendi ΔT'sini kullanır; girilmemişse aşağıdaki varsayılan geçerlidir.</span>
            </button>
          </div>
          <label>
            {paratonerBazli ? 'Varsayılan ΔT' : 'Projenin ΔT değeri'}
            <DeltaTSecici deger={proje.deltaT_onay_gerekli ? null : proje.deltaT} degisti={(d) => guncelle(deltaTAyarla(d))} />
          </label>
          {!paratonerBazli && ozelDeltaTli > 0 && (
            <p className="ipucu-kucuk">{ozelDeltaTli} paratonerde kendi ΔT değeri kayıtlı; proje bazlı modda bu değerler kullanılmaz.</p>
          )}
          <label>
            Paratoner cihazı (marka / model, rapor için)
            <input value={proje.cihaz ?? ''} onChange={(e) => guncelle(cihazAyarla(e.target.value), 'cihaz')} placeholder="İsteğe bağlı; paratoner formunda ayrıca girilebilir" />
          </label>

          <hr className="bolum-ayirici" />
          <div className="alan-etiketi">Yeni paratonerler için varsayılan referans çemberleri (h)</div>
          <DegerListesi degerler={proje.h_esikleri_varsayilan} degisti={(d) => guncelle(hEsikleriAyarla(d))} />

          <label>
            Tesis adresi (rapor kapağı)
            <input value={proje.tesis_adresi ?? ''} onChange={(e) => guncelle(tesisAdresiAyarla(e.target.value), 'tesis-adresi')} placeholder="Boş bırakılırsa kapakta 'bugra' yazar" />
          </label>
        </div>
      )}

      {sekme === 'rapor' && (
        <div className="form-dikey">
          <label>
            Firma / kurum adı (bütün projeler için)
            <input value={ayarlar.firmaAdi} onChange={(e) => ayarGuncelle({ firmaAdi: e.target.value })} placeholder="Boş bırakılırsa kapakta 'bugra' yazar" />
          </label>
          <MuhendisAlanlari />
          <p className="ipucu-kucuk">Rapor oluştururken bu bilgiler önceden doldurulur; her raporda ayrıca değiştirilebilir.</p>
        </div>
      )}

      {sekme === 'profiller' && <CProfilleriAyarlari />}

      {sekme === 'harita' && <HaritaServisleriAyarlari />}

      {sekme === 'uygulama' && (
        <div className="form-dikey">
          <div>
            <div className="alan-etiketi">Tema</div>
            <div className="form-grid-3">
              {(
                [
                  ['dark', 'Koyu'],
                  ['light', 'Açık'],
                  ['sistem', 'Sistem'],
                ] as const
              ).map(([t, etiket]) => (
                <button key={t} type="button" className={ayarlar.tema === t ? 'mod-aktif' : ''} aria-pressed={ayarlar.tema === t} onClick={() => ayarGuncelle({ tema: t })}>
                  {etiket}
                </button>
              ))}
            </div>
          </div>
          <hr className="bolum-ayirici" />
          <Anahtar
            id="otomatik-kayit"
            checked={ayarlar.otomatikKayit}
            onCheckedChange={(v) => ayarGuncelle({ otomatikKayit: v })}
            etiket="Otomatik kayıt (kaydedilmemiş değişiklikler)"
            disabled={!masaustu}
          />
          {masaustu ? (
            <>
              <div>
                <div className="alan-etiketi">Otomatik kayıt klasörü: "Paratoner Otomatik Kayıt"</div>
                <div className="form-grid-2">
                  <button type="button" className={ayarlar.otomatikKayitKonumu === 'masaustu' ? 'mod-aktif' : ''} onClick={() => ayarGuncelle({ otomatikKayitKonumu: 'masaustu' })}>
                    Masaüstünde
                  </button>
                  <button type="button" className={ayarlar.otomatikKayitKonumu === 'belgeler' ? 'mod-aktif' : ''} onClick={() => ayarGuncelle({ otomatikKayitKonumu: 'belgeler' })}>
                    Belgeler'de
                  </button>
                </div>
              </div>
              <OtomatikKayitlar kurtarmaAc={kurtarmaAc} />
            </>
          ) : (
            <p className="ipucu-kucuk">Otomatik kayıt yalnızca masaüstü uygulamada çalışır. Tarayıcıda proje bu tarayıcının belleğinde tutulur; dosya olarak saklamak için Kaydet'i kullanın.</p>
          )}
        </div>
      )}
    </Pencere>
  );
}
