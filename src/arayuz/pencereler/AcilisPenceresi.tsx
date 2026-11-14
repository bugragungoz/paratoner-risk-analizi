// Açılan projeyle ilgili bilgiler: eski sürümden aktarma, ΔT onayı, standart dışı C değerleri.

import { useState } from 'react';
import { deltaTAyarla } from '../durum/eylemler';
import { useProje, type AcilisNotu } from '../durum/ProjeSaglayici';
import { Pencere } from '../ortak/Pencere';
import { DeltaTSecici } from '../paneller/ProjeParametreleriPaneli';

export function AcilisPenceresi({ not }: { not: AcilisNotu }) {
  const { proje, guncelle, acilisNotuKapat } = useProje();
  const [secilen, setSecilen] = useState<number | null>(null);
  const onayBekliyor = not.deltaTOnayi && !!proje.deltaT_onay_gerekli;

  return (
    <Pencere acik kapat={acilisNotuKapat} baslik={onayBekliyor ? 'ΔT onayı gerekiyor' : 'Proje hakkında'}>
      <div className="form-dikey">
        <ul className="acilis-uyarilari">
          {not.uyarilar.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>

        {onayBekliyor && (
          <div className="deltat-onay">
            <label htmlFor="acilis-deltat">
              Paratoner yayılım süresi (ΔT) — eski kayıtta görünen değer: <b>{proje.deltaT ?? '—'} µs</b>
            </label>
            <DeltaTSecici id="acilis-deltat" deger={secilen} degisti={setSecilen} />
            <p className="ipucu-kucuk">Kullandığınız paratonerin belgesindeki (test raporu / katalog) ΔT değerini seçin. Değer, projenin bütün paratonerlerinde kullanılır.</p>
          </div>
        )}

        <div className="pencere-alt-butonlar">
          {onayBekliyor ? (
            <>
              <button className="ikincil-buton" onClick={acilisNotuKapat}>
                Sonra
              </button>
              <button
                className="buton-birincil"
                disabled={secilen === null}
                onClick={() => {
                  guncelle(deltaTAyarla(secilen));
                  acilisNotuKapat();
                }}
              >
                ΔT'yi onayla
              </button>
            </>
          ) : (
            <button className="buton-birincil" onClick={acilisNotuKapat}>
              Tamam
            </button>
          )}
        </div>
      </div>
    </Pencere>
  );
}
