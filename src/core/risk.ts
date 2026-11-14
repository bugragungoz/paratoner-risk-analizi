// Yıldırım risk analizi (NF C 17-102 basitleştirilmiş yöntemi):
// Ng = 0,04·Td^1,25 · Nd = Ae·Ng·C1·10⁻⁶ · C = C2·C3·C4·C5 · Nc = 5,5·10⁻³/C · E = 1 − Nc/Nd
// Koruma seviyesi PARATONERİN değil, KORUNAN YAPININ özelliğidir.

import type { Seviye } from './tipler';

export type SeviyeEtiketi =
  | 'Seviye 1 + ek önlem'
  | 'Seviye 1'
  | 'Seviye 2'
  | 'Seviye 3'
  | 'Seviye 4'
  | 'İsteğe bağlı'
  | 'GEÇERSİZ VERİ';

export interface SeviyeSonucu {
  seviye: SeviyeEtiketi;
  sutun: Seviye | null;
  renk: string;
}

export interface RiskAnalizi extends SeviyeSonucu {
  Ae: number;
  Ng: number;
  Nd: number;
  C: number;
  Nc: number | null;
  E: number | null;
  /** E > 0,98: Seviye I'e ek olarak ek koruma önlemleri gerekir. */
  ekOnlemGerekli: boolean;
  /** Nd ≤ Nc (E ≤ 0): koruma isteğe bağlıdır. */
  istegeBagli: boolean;
}

export function ngHesapla(Nk: number | null | undefined): number {
  if (!Nk || Nk <= 0) return 0;
  return 0.04 * Math.pow(Nk, 1.25);
}

export function ndHesapla(Ae: number, Ng: number, C1: number): number {
  return Ae * Ng * C1 * 1e-6;
}

export function ncHesapla(C2: number, C3: number, C4: number, C5: number): { C: number; Nc: number | null } {
  const C = C2 * C3 * C4 * C5;
  const Nc = C > 0 ? 5.5e-3 / C : null;
  return { C, Nc };
}

export function eHesapla(Nd: number, Nc: number | null): number | null {
  if (!Nd || Nd <= 0 || Nc === null || Nc === undefined) return null;
  return 1 - Nc / Nd;
}

/** Etkinliğe (E) göre gerekli koruma seviyesi. Eşik, yuvarlanmamış E'ye uygulanır. */
export function gerekliSeviyeBelirle(E: number | null | undefined): SeviyeSonucu {
  if (E === null || E === undefined || Number.isNaN(E)) {
    return { seviye: 'GEÇERSİZ VERİ', sutun: null, renk: '#71717a' };
  }
  if (E > 0.98) return { seviye: 'Seviye 1 + ek önlem', sutun: 'I', renk: '#4d7ea8' };
  if (E > 0.95) return { seviye: 'Seviye 1', sutun: 'I', renk: '#4d7ea8' };
  if (E > 0.9) return { seviye: 'Seviye 2', sutun: 'II', renk: '#16a34a' };
  if (E > 0.8) return { seviye: 'Seviye 3', sutun: 'III', renk: '#f97316' };
  if (E > 0) return { seviye: 'Seviye 4', sutun: 'IV', renk: '#dc2626' };
  return { seviye: 'İsteğe bağlı', sutun: 'IV', renk: '#71717a' };
}

export interface RiskGirdisi {
  Ae: number;
  C1: number;
  C2: number;
  C3: number;
  C4: number;
  C5: number;
}

/** Ng → Nd → C/Nc → E → seviye zinciri. */
export function yapiRiskAnalizi(girdi: RiskGirdisi, Nk: number | null | undefined): RiskAnalizi {
  const Ng = ngHesapla(Nk);
  const Nd = ndHesapla(girdi.Ae, Ng, girdi.C1);
  const { C, Nc } = ncHesapla(girdi.C2, girdi.C3, girdi.C4, girdi.C5);
  const E = eHesapla(Nd, Nc);
  const seviye = gerekliSeviyeBelirle(E);
  return {
    Ae: girdi.Ae,
    Ng,
    Nd,
    C,
    Nc,
    E,
    ...seviye,
    ekOnlemGerekli: E !== null && E > 0.98,
    istegeBagli: E !== null && E <= 0,
  };
}
