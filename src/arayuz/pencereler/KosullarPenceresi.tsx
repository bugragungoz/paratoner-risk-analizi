// İlk açılışta (ve koşullar değiştiğinde) gösterilen kullanım koşulları. Onaylanmadan kapanmaz:
// Esc ve dışarı tıklama etkisizdir; kabul etmeyen kullanıcı programı kapatır.

import * as Dialog from '@radix-ui/react-dialog';
import { TELIF } from '../ortak/yasal';
import { pencere, tauriMi } from '../platform/tauri';
import { useMetinler } from '../ortak/useMetinler';

export function KosullarPenceresi({ kabulEt }: { kabulEt: () => void }) {
  const m = useMetinler();
  const t = m.kosullar;
  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="pencere-arkaplan" />
        <Dialog.Content
          className="pencere pencere-genis"
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="pencere-ustbar">
            <Dialog.Title className="pencere-baslik">{t.baslik}</Dialog.Title>
          </div>
          <div className="pencere-govde">
            <div className="form-dikey">
              <p className="ipucu">{t.giris}</p>
              <dl className="kosul-listesi">
                {m.yasal.kosullar.map((k) => (
                  <div key={k.baslik}>
                    <dt>{k.baslik}</dt>
                    <dd>{k.metin}</dd>
                  </div>
                ))}
              </dl>
              <p className="ipucu-kucuk">
                {TELIF}. {m.yasal.lisansAciklamasi}
              </p>
              <div className="pencere-alt-butonlar">
                {tauriMi() && (
                  <button type="button" className="ikincil-buton" onClick={() => pencere.kapat()}>
                    {t.reddet}
                  </button>
                )}
                <button type="button" className="buton-birincil" onClick={kabulEt} autoFocus>
                  {t.kabul}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
