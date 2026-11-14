import { useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ChevronDown, CircleHelp, FileText, FolderOpen, Moon, Redo2, Save, Settings, Sun, Table2, Undo2 } from 'lucide-react';
import { etkinTema } from '../durum/ayarlar';
import { projeAdi } from '../durum/eylemler';
import { useProje } from '../durum/ProjeSaglayici';
import type { DosyaIslemleri } from '../durum/useDosyaIslemleri';
import { KATMAN_ADLARI, KATMANLAR, etkinKatman, katmanKullanilabilir, type KatmanAdi } from '../harita/katmanlar';
import type { AyarSekmesi } from '../pencereler/AyarlarPenceresi';
import { disBaglantiAc, tauriMi } from '../platform/tauri';
import { AramaKutusu } from './AramaKutusu';
import { HesapDurumu } from './HesapDurumu';

interface Props {
  dosya: DosyaIslemleri;
  git: (lat: number, lng: number) => void;
  /** Haritanın merkezi (aramada yakındaki sonuçlar öne çıksın). */
  merkez: () => { lat: number; lng: number } | null;
  hesapTablosuAc: () => void;
  raporAc: () => void;
  ayarlarAc: (sekme?: AyarSekmesi) => void;
  kisayollarAc: () => void;
  hakkindaAc: () => void;
}

const tarih = (ms: number) => new Date(ms).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Yardım: kısayollar, harita servisleri kılavuzu, kaynak kod, hakkında. */
function YardimMenusu({ kisayollarAc, hakkindaAc, ayarlarAc }: { kisayollarAc: () => void; hakkindaAc: () => void; ayarlarAc: (sekme?: AyarSekmesi) => void }) {
  const [acik, setAcik] = useState(false);
  const yap = (fn: () => void) => () => {
    setAcik(false);
    fn();
  };
  return (
    <PopoverPrimitive.Root open={acik} onOpenChange={setAcik}>
      <PopoverPrimitive.Trigger asChild>
        <button className="ikon-kare" title="Yardım" aria-label="Yardım">
          <CircleHelp size={15} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content className="dosya-menusu" align="end" sideOffset={6} role="menu">
          <button role="menuitem" onClick={yap(kisayollarAc)}>
            Klavye kısayolları <kbd>F1</kbd>
          </button>
          <button role="menuitem" onClick={yap(() => ayarlarAc('harita'))}>
            Harita servisleri kurulum kılavuzu
          </button>
          <hr />
          <button role="menuitem" onClick={yap(() => disBaglantiAc('https://github.com/bugragungoz/paratoner-risk-analizi'))}>
            Kaynak kod ve sorun bildirimi
          </button>
          <button role="menuitem" onClick={yap(hakkindaAc)}>
            Hakkında
          </button>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/** Farklı kaydet, son dosyalar ve otomatik kayıtlar menüsü. */
function DosyaMenusu({ dosya, ayarlarAc }: { dosya: DosyaIslemleri; ayarlarAc: (sekme?: AyarSekmesi) => void }) {
  const { sonDosyalar } = useProje();
  const [acik, setAcik] = useState(false);
  const masaustu = tauriMi();
  const yap = (fn: () => void) => () => {
    setAcik(false);
    fn();
  };
  return (
    <PopoverPrimitive.Root open={acik} onOpenChange={setAcik}>
      <PopoverPrimitive.Trigger asChild>
        <button className="ikon-kare" title="Diğer dosya işlemleri" aria-label="Diğer dosya işlemleri">
          <ChevronDown size={14} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content className="dosya-menusu" align="start" sideOffset={6} role="menu">
          <button role="menuitem" onClick={yap(() => dosya.yeni())}>
            Yeni proje <kbd>Ctrl+N</kbd>
          </button>
          <button role="menuitem" onClick={yap(() => dosya.farkliKaydet())}>
            Farklı kaydet… <kbd>Ctrl+Shift+S</kbd>
          </button>
          <button role="menuitem" onClick={yap(() => dosya.ac())}>
            Dosyadan aç… <kbd>Ctrl+O</kbd>
          </button>
          {masaustu && (
            <>
              <hr />
              <div className="dosya-menusu-baslik">Son dosyalar</div>
              {sonDosyalar.length === 0 && <div className="dosya-menusu-bos">Henüz yok</div>}
              {sonDosyalar.map((d) => (
                <button key={d.yol} role="menuitem" className="son-dosya" title={d.yol} onClick={yap(() => dosya.sonDosyaAc(d.yol))}>
                  <span className="son-dosya-ad">{d.ad}</span>
                  <span className="son-dosya-tarih">{tarih(d.zaman)}</span>
                </button>
              ))}
              <hr />
              <button role="menuitem" onClick={yap(() => ayarlarAc('uygulama'))}>
                Otomatik kayıtlar ve yedekler…
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

  return (
    <header className="ustbar">
      <div className="ustbar-sol">
        <button onClick={() => p.dosya.ac()} title="Proje dosyası aç (Ctrl+O)">
          <FolderOpen size={14} /> Aç
        </button>
        <button onClick={() => p.dosya.kaydet()} title={dosyaYolu ? `Kaydet: ${dosyaYolu} (Ctrl+S)` : 'Projeyi kaydet (Ctrl+S)'}>
          <Save size={14} /> Kaydet
        </button>
        <DosyaMenusu dosya={p.dosya} ayarlarAc={p.ayarlarAc} />
        <span className="ayirac" />
        <HesapDurumu />
        <button onClick={geriAl} disabled={!geriAlinabilir} title="Geri al (Ctrl+Z)" className="ikon-kare">
          <Undo2 size={14} />
        </button>
        <button onClick={yinele} disabled={!yinelenebilir} title="Yinele (Ctrl+Y)" className="ikon-kare">
          <Redo2 size={14} />
        </button>
      </div>

      <div className="ustbar-orta">
        <input className="proje-adi-input" value={proje.isim} onChange={(e) => guncelle(projeAdi(e.target.value), 'proje-adi')} aria-label="Proje adı" />
        <span
          className={kaydedilmemis ? 'kayit-durumu kaydedilmemis' : 'kayit-durumu'}
          title={dosyaYolu ?? (dosyaAdi ? `${dosyaAdi} (Kaydet yeni bir .ptproj dosyası ister)` : 'Henüz bir dosyaya kaydedilmedi')}
        >
          {kaydedilmemis ? 'Kaydedilmedi' : 'Kaydedildi'}
        </span>
      </div>

      <div className="ustbar-butonlar">
        <AramaKutusu git={p.git} merkez={p.merkez} />
        <select value={etkinKatman(ayarlar.katman, haritaAnahtarlari)} onChange={(e) => ayarGuncelle({ katman: e.target.value as KatmanAdi })} aria-label="Harita katmanı">
          {KATMAN_ADLARI.map((k) => (
            <option key={k} value={k} disabled={!katmanKullanilabilir(k, haritaAnahtarlari)}>
              {KATMANLAR[k].isim}
              {katmanKullanilabilir(k, haritaAnahtarlari) ? '' : ' (anahtar gerekli)'}
            </option>
          ))}
        </select>
        <button onClick={p.hesapTablosuAc} title="Ayrıntılı hesap" aria-label="Ayrıntılı hesap">
          <Table2 size={14} /> <span className="etiket-metni">Ayrıntılı hesap</span>
        </button>
        <button onClick={p.raporAc} title="Rapor" aria-label="Rapor">
          <FileText size={14} /> <span className="etiket-metni">Rapor</span>
        </button>
        <button className="ikon-kare" onClick={() => p.ayarlarAc()} title="Ayarlar">
          <Settings size={15} />
        </button>
        <button className="ikon-kare" onClick={() => ayarGuncelle({ tema: etkinTema(ayarlar.tema) === 'dark' ? 'light' : 'dark' })} title="Tema değiştir">
          {etkinTema(ayarlar.tema) === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
        </button>
<YardimMenusu kisayollarAc={p.kisayollarAc} hakkindaAc={p.hakkindaAc} ayarlarAc={p.ayarlarAc} />
      </div>
    </header>
  );
}
