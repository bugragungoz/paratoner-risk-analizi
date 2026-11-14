import { useRef, useState, type ReactNode } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

interface Props {
  tetikleyici: ReactNode;
  children: ReactNode;
  genislik?: number;
  hizalama?: 'sol' | 'sag';
}

/** Üzerine gelince açılan bilgi kartı; ekran kenarında otomatik yeniden konumlanır. */
export function BilgiKarti({ tetikleyici, children, genislik = 280, hizalama = 'sol' }: Props) {
  const [acik, setAcik] = useState(false);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ac = () => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    setAcik(true);
  };
  const kapat = () => {
    zamanlayici.current = setTimeout(() => setAcik(false), 100);
  };
  return (
    <PopoverPrimitive.Root open={acik}>
      <PopoverPrimitive.Trigger asChild>
        <span className="ui-hovercard-tetikleyici" onMouseEnter={ac} onMouseLeave={kapat}>
          {tetikleyici}
        </span>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="ui-hovercard-icerik"
          style={{ width: genislik }}
          side="bottom"
          align={hizalama === 'sol' ? 'start' : 'end'}
          sideOffset={6}
          collisionPadding={12}
          onMouseEnter={ac}
          onMouseLeave={kapat}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
