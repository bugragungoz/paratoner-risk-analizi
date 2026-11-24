import { useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ChevronDown, CircleHelp, FileText, FolderOpen, Moon, Redo2, Save, Settings, Sun, Table2, Undo2 } from 'lucide-react';
import { etkinTema } from '../durum/ayarlar';
import { projeAdi } from '../durum/eylemler';
import { useProje } from '../durum/ProjeSaglayici';
import type { DosyaIslemleri } from '../durum/useDosyaIslemleri';
import type { KmlIslemleri } from '../durum/useKmlIslemleri';
import { KATMAN_ADLARI, etkinKatman, katmanKullanilabilir, type KatmanAdi } from '../harita/katmanlar';
import type { AyarSekmesi } from '../pencereler/AyarlarPenceresi';
import { useMetinler } from '../ortak/useMetinler';
import { disBaglantiAc, tauriMi } from '../platform/tauri';
import { AramaKutusu } from './AramaKutusu';
import { HesapDurumu } from './HesapDurumu';

interface Props {
  dosya: DosyaIslemleri;
  kml: Pick<KmlIslemleri, 'iceAktar' | 'disaAktar'>;
  dxfYaz: () => void;
  altlikEkle: () => void;
  git: (lat: number, lng: number) => void;
  /** Haritanın merkezi (aramada yakındaki sonuçlar öne çıksın). */
  merkez: () => { lat: number; lng: number } | null;
  hesapTablosuAc: () => void;
  raporAc: () => void;
  ayarlarAc: (sekme?: AyarSekmesi) => void;
  kisayollarAc: () => void;
  dxfKilavuzuAc: () => void;
  hakkindaAc: () => void;
}

const tarih = (ms: number, yerel: string) => new Date(ms).toLocaleString(yerel, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Yardım: kısayollar, harita servisleri ve AutoCAD (DXF) kılavuzları, kaynak kod, hakkında. */
function YardimMenusu({
  kisayollarAc,
  dxfKilavuzuAc,
  hakkindaAc,
  ayarlarAc,
}: {
  kisayollarAc: () => void;
  dxfKilavuzuAc: () => void;
  hakkindaAc: () => void;
  ayarlarAc: (sekme?: AyarSekmesi) => void;
}) {
  const [acik, setAcik] = useState(false);
  const t = useMetinler().ust;
  const yap = (fn: () => void) => () => {
    setAcik(false);
    fn();
  };
  return (
    <PopoverPrimitive.Root open={acik} onOpenChange={setAcik}>
      <PopoverPrimitive.Trigger asChild>
        <button className="ikon-kare" title={t.yardim} aria-label={t.yardim}>
          <CircleHelp size={15} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content className="dosya-menusu" align="end" sideOffset={6} role="menu">
          <button role="menuitem" onClick={yap(kisayollarAc)}>
            {t.kisayollar} <kbd>F1</kbd>
          </button>
          <button role="menuitem" onClick={yap(() => ayarlarAc('harita'))}>
            {t.kilavuz}
          </button>
          <button role="menuitem" onClick={yap(dxfKilavuzuAc)}>
            {t.dxfKilavuzu}
          </button>
          <hr />
          <button role="menuitem" onClick={yap(() => disBaglantiAc('https://github.com/bugragungoz/paratoner-risk-analizi'))}>
            {t.kaynak}
          </button>
          <button role="menuitem" onClick={yap(hakkindaAc)}>
            {t.hakkinda}
          </button>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/** Farklı kaydet, son dosyalar ve otomatik kayıtlar menüsü. */
function DosyaMenusu({
  dosya,
  kml,
  dxfYaz,
  altlikEkle,
  ayarlarAc,
}: {
  dosya: DosyaIslemleri;
  kml: Pick<KmlIslemleri, 'iceAktar' | 'disaAktar'>;
  dxfYaz: () => void;
  altlikEkle: () => void;
  ayarlarAc: (sekme?: AyarSekmesi) => void;
}) {
  const { sonDosyalar } = useProje();
  const m = useMetinler();
  const t = m.ust;
  const [acik, setAcik] = useState(false);
  const masaustu = tauriMi();
  const yap = (fn: () => void) => () => {
    setAcik(false);
    fn();
  };
  return (
    <PopoverPrimitive.Root open={acik} onOpenChange={setAcik}>
      <PopoverPrimitive.Trigger asChild>
        <button className="ikon-kare" title={t.digerDosya} aria-label={t.digerDosya}>
          <ChevronDown size={14} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content className="dosya-menusu" align="start" sideOffset={6} role="menu">
          <button role="menuitem" onClick={yap(() => dosya.yeni())}>
            {t.yeniProje} <kbd>Ctrl+N</kbd>
          </button>
          <button role="menuitem" onClick={yap(() => dosya.farkliKaydet())}>
            {t.farkliKaydet} <kbd>Ctrl+Shift+S</kbd>
          </button>
          <button role="menuitem" onClick={yap(() => dosya.ac())}>
            {t.dosyadanAc} <kbd>Ctrl+O</kbd>
          </button>
          <hr />
          <button role="menuitem" onClick={yap(() => kml.iceAktar())}>
            {m.kml.iceAktar}
          </button>
          <button role="menuitem" onClick={yap(() => kml.disaAktar())}>
            {m.kml.disaAktar}
          </button>
          <button role="menuitem" onClick={yap(dxfYaz)}>
            {m.dxf.menu}
          </button>
          <button role="menuitem" onClick={yap(altlikEkle)}>
            {m.altlik.menu}
          </button>
          {masaustu && (
            <>
              <hr />
              <div className="dosya-menusu-baslik">{t.sonDosyalar}</div>
              {sonDosyalar.length === 0 && <div className="dosya-menusu-bos">{t.henuzYok}</div>}
              {sonDosyalar.map((d) => (
                <button key={d.yol} role="menuitem" className="son-dosya" title={d.yol} onClick={yap(() => dosya.sonDosyaAc(d.yol))}>
                  <span className="son-dosya-ad">{d.ad}</span>
                  <span className="son-dosya-tarih">{tarih(d.zaman, m.bicim.yerel)}</span>
                </button>
              ))}
              <hr />
              <button role="menuitem" onClick={yap(() => ayarlarAc('uygulama'))}>
                {t.otomatikKayitlar}
              </button>
            </>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function UstBar(p: Props) {
  const { proje, guncelle, geriAl, yinele, geriAlinabilir, yinelenebilir, ayarlar, ayarGuncelle, kaydedilmemis, dosyaYolu, dosyaAdi, haritaAnahtarlari } = useProje();
  const m = useMetinler();
  const t = m.ust;

  return (
    <header className="ustbar">
      <div className="ustbar-sol">
        <button onClick={() => p.dosya.ac()} title={t.acIpucu}>
          <FolderOpen size={14} /> {t.ac}
        </button>
        <button onClick={() => p.dosya.kaydet()} title={dosyaYolu ? t.kaydetYol(dosyaYolu) : t.kaydetIpucu}>
          <Save size={14} /> {t.kaydet}
        </button>
        <DosyaMenusu dosya={p.dosya} kml={p.kml} dxfYaz={p.dxfYaz} altlikEkle={p.altlikEkle} ayarlarAc={p.ayarlarAc} />
        <span className="ayirac" />
        <HesapDurumu />
        <button onClick={geriAl} disabled={!geriAlinabilir} title={t.geriAl} className="ikon-kare">
          <Undo2 size={14} />
        </button>
        <button onClick={yinele} disabled={!yinelenebilir} title={t.yinele} className="ikon-kare">
          <Redo2 size={14} />
        </button>
      </div>

      <div className="ustbar-orta">
        <input className="proje-adi-input" value={proje.isim} onChange={(e) => guncelle(projeAdi(e.target.value), 'proje-adi')} aria-label={t.projeAdi} />
        <span
          className={kaydedilmemis ? 'kayit-durumu kaydedilmemis' : 'kayit-durumu'}
          title={dosyaYolu ?? (dosyaAdi ? t.yeniDosyaIster(dosyaAdi) : t.dosyayaKaydedilmedi)}
        >
          {kaydedilmemis ? t.kaydedilmedi : t.kaydedildi}
        </span>
      </div>

      <div className="ustbar-butonlar">
        <AramaKutusu git={p.git} merkez={p.merkez} />
        <select value={etkinKatman(ayarlar.katman, haritaAnahtarlari)} onChange={(e) => ayarGuncelle({ katman: e.target.value as KatmanAdi })} aria-label={t.katman}>
          {KATMAN_ADLARI.map((k) => (
            <option key={k} value={k} disabled={!katmanKullanilabilir(k, haritaAnahtarlari)}>
              {m.katman[k]}
              {katmanKullanilabilir(k, haritaAnahtarlari) ? '' : t.anahtarGerekli}
            </option>
          ))}
        </select>
        <button onClick={p.hesapTablosuAc} title={t.ayrintiliHesap} aria-label={t.ayrintiliHesap}>
          <Table2 size={14} /> <span className="etiket-metni">{t.ayrintiliHesap}</span>
        </button>
        <button onClick={p.raporAc} title={t.rapor} aria-label={t.rapor}>
          <FileText size={14} /> <span className="etiket-metni">{t.rapor}</span>
        </button>
        <button className="ikon-kare" onClick={() => p.ayarlarAc()} title={t.ayarlar}>
          <Settings size={15} />
        </button>
        <button className="ikon-kare" onClick={() => ayarGuncelle({ tema: etkinTema(ayarlar.tema) === 'dark' ? 'light' : 'dark' })} title={t.tema}>
          {etkinTema(ayarlar.tema) === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        <YardimMenusu kisayollarAc={p.kisayollarAc} dxfKilavuzuAc={p.dxfKilavuzuAc} hakkindaAc={p.hakkindaAc} ayarlarAc={p.ayarlarAc} />
      </div>
    </header>
  );
}
