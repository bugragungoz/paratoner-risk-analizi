// İlk açılışta (ve koşullar değiştiğinde) gösterilen kullanım koşulları. Onaylanmadan kapanmaz:
// Esc ve dışarı tıklama etkisizdir; kabul etmeyen kullanıcı programı kapatır.

import * as Dialog from '@radix-ui/react-dialog';
import { KULLANIM_KOSULLARI, LISANS_ACIKLAMASI, TELIF } from '../ortak/yasal';
import { pencere, tauriMi } from '../platform/tauri';

export function KosullarPenceresi({ kabulEt }: { kabulEt: () => void }) {
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
            <Dialog.Title className="pencere-baslik">Kullanım koşulları ve sorumluluk reddi</Dialog.Title>
          </div>
          <div className="pencere-govde">
            <div className="form-dikey">
              <p className="ipucu">Programı kullanmadan önce aşağıdaki koşulları okuyun. Bu metne daha sonra Yardım › Hakkında penceresinden ulaşabilirsiniz.</p>
              <dl className="kosul-listesi">
                {KULLANIM_KOSULLARI.map((m) => (
                  <div key={m.baslik}>
                    <dt>{m.baslik}</dt>
                    <dd>{m.metin}</dd>
                  </div>
                ))}
              </dl>
              <p className="ipucu-kucuk">
                {TELIF}. {LISANS_ACIKLAMASI}
              </p>
              <div className="pencere-alt-butonlar">
                {tauriMi() && (
                  <button type="button" className="ikincil-buton" onClick={() => pencere.kapat()}>
                    Kabul etmiyorum, kapat
                  </button>
                )}
                <button type="button" className="buton-birincil" onClick={kabulEt} autoFocus>
                  Okudum, kabul ediyorum
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
