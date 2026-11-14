import { useEffect, useState, type InputHTMLAttributes } from 'react';
import { ondalikSayi } from '../../core';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  deger: number | null | undefined;
  degisti: (deger: number | null) => void;
  /** Kabul edilen en küçük değer (dahil değil ise `asgariHaric`). */
  asgari?: number;
  asgariHaric?: boolean;
}

/** Türkçe ondalık girişi ("3,5") kabul eden sayı kutusu; geçersiz girişi işaretler. */
export function SayiGirdisi({ deger, degisti, asgari, asgariHaric, className = '', ...geri }: Props) {
  const [metin, setMetin] = useState(deger === null || deger === undefined ? '' : String(deger).replace('.', ','));

  useEffect(() => {
    const mevcut = ondalikSayi(metin);
    if (mevcut !== (deger ?? null)) setMetin(deger === null || deger === undefined ? '' : String(deger).replace('.', ','));
    // metin bilerek bağımlılık değil: yalnızca dışarıdan gelen değişiklikte eşitlenir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deger]);

  const sayi = ondalikSayi(metin);
  const aralikDisi = sayi !== null && asgari !== undefined && (asgariHaric ? sayi <= asgari : sayi < asgari);
  const gecersiz = (metin.trim() !== '' && sayi === null) || aralikDisi;

  return (
    <input
      {...geri}
      inputMode="decimal"
      className={`${className} ${gecersiz ? 'girdi-hatali' : ''}`}
      value={metin}
      aria-invalid={gecersiz}
      onChange={(e) => {
        setMetin(e.target.value);
        const n = ondalikSayi(e.target.value);
        const disinda = n !== null && asgari !== undefined && (asgariHaric ? n <= asgari : n < asgari);
        if (e.target.value.trim() === '') degisti(null);
        else if (n !== null && !disinda) degisti(n);
      }}
    />
  );
}
