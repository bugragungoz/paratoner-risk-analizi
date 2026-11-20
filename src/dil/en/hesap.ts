// English texts of the calculation core: result labels, row reasons, validation messages.
// Terms follow the English edition of NF C 17-102 (ESE air terminal, protection level, protection
// radius Rp, ΔT ESE efficiency, thunderstorm days).

import type { Metinler } from '../index';

export const hesapEn: Metinler['hesap'] = {
  seviye: {
    EK: 'Level 1 + additional measures',
    I: 'Level 1',
    II: 'Level 2',
    III: 'Level 3',
    IV: 'Level 4',
    ISTEGE_BAGLI: 'Optional',
    GECERSIZ: 'INVALID DATA',
  },
  seviyeKisa: { EK: 'I+', I: 'I', II: 'II', III: 'III', IV: 'IV', ISTEGE_BAGLI: 'Opt.', GECERSIZ: '?' },
  satir: { YETERLI: 'Protection adequate', KISMI: 'Partial protection', YETERSIZ: 'Protection inadequate' },
  nihai: {
    YETERLI: 'Protection adequate',
    YETERLI_KOMBINE: 'Protection adequate (combined)',
    KISMI: (oran) => `Partial protection (${oran}): part of the structure is exposed`,
    YETERSIZ: 'Protection inadequate',
    KORUYUCU_YOK: 'No protecting air terminal',
    GEOMETRI_HATASI: 'Geometry error',
    ISTEGE_BAGLI_ICINDE: 'Protection optional (whole structure protected)',
    ISTEGE_BAGLI_DISINDA: 'Protection optional (structure not fully protected)',
    HESAPLANAMADI: 'Not calculated',
  },
  rp: {
    GECERSIZ_H: 'Invalid h value.',
    DELTA_T_TANIMSIZ: 'ΔT not selected or not in the table (valid values: 15, 30, 45, 60 µs).',
    H_2_ALTI: 'According to NF C 17-102, h may not be less than 2 m.',
    H_60_USTU: 'No table-based Rp can be produced for this height. Heights above 60 m require a separate engineering assessment.',
  },
  uyariEkOnlem:
    "Required protection level 'Level 1 + additional measures': in addition to the level I protection radius, the additional protection measures required by the standard must be assessed.",
  uyariYuksekYapi:
    'The structure is taller than 60 m: the provisions of NF C 17-102 for tall structures (protection against side flashes) must be assessed separately.',
  nedenKotEksik: 'Elevation data missing (elevation level or structure not found)',
  nedenYapiYuksek: 'The structure is as tall as or taller than the air terminal — it cannot be protected',
  nedenPoligon: 'Invalid structure polygon.',
  deltaTYok: 'ΔT (ESE efficiency) not selected.',
  deltaTYokParatoner: (adlar) => `ΔT (ESE efficiency) not selected: ${adlar}.`,
  nkYok: 'Nk (thunderstorm days per year, Td) not entered.',
  riskGecersiz: 'Invalid risk assessment: Nd could not be calculated.',
  dogrulama: {
    onEk: (ad, mesaj) => `${ad}: ${mesaj}`,
    yapiKotYok: 'its elevation level was not found.',
    yapiH: 'height (H) not entered or not greater than zero.',
    yapiBoyut: 'manual dimensions selected but L and W not entered.',
    yapiPoligon: 'the polygon needs at least 3 corners.',
    yapiPoligonKesisiyor: 'the polygon edges intersect; move the corners so that they do not cross.',
    yapiCEksik: (eksik) => `risk coefficients missing (${eksik}).`,
    yapiCStandartDisi: (c, deger) => `${c} = ${deger} is not in the standard table; select it again.`,
    yapiC2Tutarsiz: 'C2 does not match the selected structure/roof material; select it again.',
    paratonerYapiYok: 'the structure it stands on was not found.',
    paratonerKotYok: 'its elevation level was not found.',
    paratonerMast: 'mast height must be greater than zero.',
    deltaTGecersiz: (dT, gecerli) => `ΔT = ${dT} µs is not in the table (valid values: ${gecerli} µs).`,
    nkYok: 'Nk (thunderstorm days per year, Td) not entered.',
    deltaTOnay:
      'ΔT not confirmed: the project was imported from an earlier version, where ΔT = 60 µs was the default. Select the ΔT of the air terminal you use.',
    deltaTYokParatoner: (adlar) => `ΔT (ESE efficiency) not selected: ${adlar}. Select the ΔT of the air terminal or the default ΔT of the project.`,
    deltaTYok: 'ΔT (ESE efficiency) not selected. Select the ΔT of the project in Settings.',
    projeDeltaTGecersiz: (dT) => `Project ΔT = ${dT} µs is not in the table.`,
    yuksekYapi: (yapi) =>
      `${yapi}: taller than 60 m. The provisions of NF C 17-102 for tall structures (protection against side flashes) must be assessed separately.`,
    h60: (pr, yapi, h) => `${pr} → ${yapi}: h = ${h} m > 60 m. No standard Rp can be produced; a separate engineering assessment is required.`,
    catiDisinda: (pr, yapi) =>
      `${pr}: its base is the roof of "${yapi}" but it lies outside that structure. The height is taken from the roof and the distances from its position; correct the position or the base.`,
    yapiIcinde: (pr, yapi) =>
      `${pr}: inside "${yapi}" but its height is measured from an elevation level. If the air terminal is on the roof, set its base to "On a structure".`,
    adTekrarYapi: (adlar) => `Structures with the same name: ${adlar}. Rename them so they can be told apart in the calculation table and the report.`,
    adTekrarParatoner: (adlar) => `Air terminals with the same name: ${adlar}. Rename them so they can be told apart in the calculation table and the report.`,
    ustUste: (a, b, alan) =>
      `${a} and ${b} overlap (common area ${alan} m²). The same structure may have been drawn twice; Ae and the results are calculated for each structure separately.`,
  },
};
