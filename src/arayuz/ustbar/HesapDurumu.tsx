import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useProje } from '../durum/ProjeSaglayici';
import { BilgiKarti } from '../ortak/BilgiKarti';

/** Doğrulama özeti: eksik girdiler (kırmızı), uyarılar (sarı) ya da her şey tamam (yeşil). */
export function HesapDurumu() {
  const { sonuc } = useProje();
  const { hatalar, uyarilar } = sonuc.dogrulama;
  const renk = hatalar.length ? 'var(--warn)' : uyarilar.length ? 'var(--caution)' : 'var(--ok)';
  const Ikon = hatalar.length || uyarilar.length ? AlertTriangle : CheckCircle2;
  return (
    <BilgiKarti
      genislik={320}
      hizalama="sol"
      tetikleyici={
        <span className="durum-tetikleyici" aria-label="Hesap durumu">
          <Ikon size={17} color={renk} />
          {hatalar.length > 0 && <span className="durum-sayi">{hatalar.length}</span>}
        </span>
      }
    >
      <h4 className="kart-baslik">Hesap durumu</h4>
      <div className="durum-listesi">
        {hatalar.map((h, i) => (
          <div key={`h${i}`} className="durum-ogesi hata">
            {h.mesaj}
          </div>
        ))}
        {uyarilar.map((u, i) => (
          <div key={`u${i}`} className="durum-ogesi uyari">
            {u.mesaj}
          </div>
        ))}
        {!hatalar.length && !uyarilar.length && <div className="durum-ogesi tamam">Bütün zorunlu girdiler mevcut; hesap yapılabilir.</div>}
      </div>
    </BilgiKarti>
  );
}
