import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEtkilesim } from './Etkilesim';

interface Props {
  acik: boolean;
  kapat: () => void;
  baslik: string;
  children: ReactNode;
  /** 'normal' (form), 'genis' (form + önizleme), 'tam' (tablo). */
  boyut?: 'normal' | 'genis' | 'tam';
  ustSag?: ReactNode;
  /** Harita görünür kalsın diye arka planı karartma (çizim sonrası formlar). */
  saydam?: boolean;
}

/** Ortak pencere: Esc ve dışarı tıklama ile kapanır, odağı içinde tutar. */
export function Pencere({ acik, kapat, baslik, children, boyut = 'normal', ustSag, saydam }: Props) {
  const { etiketler } = useEtkilesim();
  return (
    <Dialog.Root open={acik} onOpenChange={(a) => !a && kapat()}>
      <Dialog.Portal>
        <Dialog.Overlay className={`pencere-arkaplan ${saydam ? 'saydam' : ''}`} />
        <Dialog.Content className={`pencere pencere-${boyut}`} aria-describedby={undefined}>
          <div className="pencere-ustbar">
            <Dialog.Title className="pencere-baslik">{baslik}</Dialog.Title>
            <div className="pencere-ust-sag">
              {ustSag}
              <Dialog.Close asChild>
                <button className="ikon-buton" title={etiketler.kapat} aria-label={etiketler.kapat}>
                  <X size={15} />
                </button>
              </Dialog.Close>
            </div>
          </div>
          <div className="pencere-govde">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
