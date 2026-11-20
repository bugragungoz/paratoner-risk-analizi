// Açılan projeyle ilgili bilgiler: eski sürümden aktarma, ΔT onayı, standart dışı C değerleri.

import { useState } from 'react';
import { deltaTAyarla } from '../durum/eylemler';
import { useProje, type AcilisNotu } from '../durum/ProjeSaglayici';
import { Pencere } from '../ortak/Pencere';
import { DeltaTSecici } from '../paneller/ProjeParametreleriPaneli';
import { useMetinler } from '../ortak/useMetinler';

export function AcilisPenceresi({ not }: { not: AcilisNotu }) {
  const { proje, guncelle, acilisNotuKapat } = useProje();
  const [secilen, setSecilen] = useState<number | null>(null);
  const m = useMetinler();
  const t = m.acilis;
  const onayBekliyor = not.deltaTOnayi && !!proje.deltaT_onay_gerekli;

  return (
    <Pencere acik kapat={acilisNotuKapat} baslik={onayBekliyor ? t.deltaTBaslik : t.baslik}>
      <div className="form-dikey">
        <ul className="acilis-uyarilari">
          {not.uyarilar.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>

        {onayBekliyor && (
          <div className="deltat-onay">
            <label htmlFor="acilis-deltat">
              {t.deltaTEtiket} <b>{proje.deltaT ?? '—'} µs</b>
            </label>
            <DeltaTSecici id="acilis-deltat" deger={secilen} degisti={setSecilen} />
            <p className="ipucu-kucuk">{t.deltaTNotu}</p>
          </div>
        )}

        <div className="pencere-alt-butonlar">
          {onayBekliyor ? (
            <>
              <button className="ikincil-buton" onClick={acilisNotuKapat}>
                {t.sonra}
              </button>
              <button
                className="buton-birincil"
                disabled={secilen === null}
                onClick={() => {
                  guncelle(deltaTAyarla(secilen));
                  acilisNotuKapat();
                }}
              >
                {t.onayla}
              </button>
            </>
          ) : (
            <button className="buton-birincil" onClick={acilisNotuKapat}>
              {m.ortak.tamam}
            </button>
          )}
        </div>
      </div>
    </Pencere>
  );
}
