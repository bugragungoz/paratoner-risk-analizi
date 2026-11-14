import * as SwitchPrimitive from '@radix-ui/react-switch';

interface Props {
  checked: boolean;
  onCheckedChange: (deger: boolean) => void;
  etiket?: string;
  id?: string;
  disabled?: boolean;
  ipucu?: string;
}

/** Erişilebilir aç/kapa anahtarı. */
export function Anahtar({ checked, onCheckedChange, etiket, id, disabled, ipucu }: Props) {
  const kok = (
    <SwitchPrimitive.Root className="ui-switch-root" checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} id={id}>
      <SwitchPrimitive.Thumb className="ui-switch-thumb" />
    </SwitchPrimitive.Root>
  );
  if (!etiket) return kok;
  return (
    <label className="ui-switch-satir" htmlFor={id} title={ipucu}>
      {kok}
      <span className="ui-switch-etiket">{etiket}</span>
    </label>
  );
}
