import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useProje } from '../durum/ProjeSaglayici';
import { BilgiKarti } from '../ortak/BilgiKarti';
import { useMetinler } from '../ortak/useMetinler';

/** Doğrulama özeti: eksik girdiler (kırmızı), uyarılar (sarı) ya da her şey tamam (yeşil). */
export function HesapDurumu() {
  const { sonuc } = useProje();
  const t = useMetinler().hesapDurumu;
  const { hatalar, uyarilar } = sonuc.dogrulama;
  const renk = hatalar.length ? 'var(--warn)' : uyarilar.length ? 'var(--caution)' : 'var(--ok)';
  const Ikon = hatalar.length || uyarilar.length ? AlertTriangle : CheckCircle2;
  return (
    <BilgiKarti
      genislik={320}
      hizalama="sol"
      tetikleyici={
        <span className="durum-tetikleyici" aria-label={t.baslik}>
          <Ikon size={17} color={renk} />
          {hatalar.length > 0 && <span className="durum-sayi">{hatalar.length}</span>}
        </span>
      }
    >
      <h4 className="kart-baslik">{t.baslik}</h4>
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
        {!hatalar.length && !uyarilar.length && <div className="durum-ogesi tamam">{t.tamam}</div>}
      </div>
    </BilgiKarti>
  );
}
