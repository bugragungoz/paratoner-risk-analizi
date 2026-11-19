// Seçili arayüz dilinin metinleri.

import { metinler, type Metinler } from '../../dil';
import { useProje } from '../durum/ProjeSaglayici';

export function useMetinler(): Metinler {
  return metinler(useProje().ayarlar.dil);
}
