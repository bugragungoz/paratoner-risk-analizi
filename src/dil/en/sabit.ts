// Names of the risk coefficient options, materials and structure types (simplified method of
// NF C 17-102).

import type { Metinler } from '../index';

export const sabitEn: Metinler['sabit'] = {
  cAdi: { C1: 'Environment', C2: 'Structure and roof material', C3: 'Contents', C4: 'Occupancy', C5: 'Consequences of lightning' },
  C1: {
    '0.25': 'Surrounded by structures or trees of the same height or taller',
    '0.5': 'Surrounded by smaller structures',
    '1': 'Isolated: no other structure within a distance of 3H',
    '2': 'Isolated on a hilltop (highest point of the area)',
  },
  C3: {
    '0.5': 'No value, non-flammable contents',
    '1': 'Common value, normally flammable contents',
    '2': 'High value or particularly flammable contents',
    '3': 'Exceptional value or irreplaceable, highly flammable or explosive contents',
  },
  C4: { '0.5': 'Unoccupied', '1': 'Normally occupied', '3': 'Difficult evacuation or risk of panic' },
  C5: {
    '1': 'Continuity of service not required, no environmental consequences',
    '5': 'Continuity of service required, no environmental consequences',
    '10': 'Consequences for the environment',
  },
  yapiMalzemesi: { metal: 'Metal structure', normal: 'Common structure (brick, concrete, masonry)', yanici: 'Flammable structure (timber etc.)' },
  catiMalzemesi: { metal: 'Metal roof', normal: 'Common roof (tiles, concrete etc.)', yanici: 'Flammable roof (timber, straw, reed etc.)' },
  yapiTipi: {
    kumes: 'Poultry house',
    silo: 'Silo',
    idari_bina: 'Office building',
    lojman: 'Staff housing',
    depo: 'Warehouse',
    su_deposu: 'Water tower',
    tank: 'Tank',
    jenerator_odasi: 'Generator room',
    diger: 'Other',
  },
  yapiTipiGerekce: {
    kumes: 'Among structures of the same height; brick walls, metal roof; unoccupied; production value',
    silo: 'Among the highest points of the site; metal structure; unoccupied',
    idari_bina: 'Normal occupancy, common value',
    lojman: 'Inhabited building',
    depo: 'Brick walls, metal roof; unoccupied; medium value',
    su_deposu: 'Elevated; continuity of service and environmental consequences low',
    tank: 'Metal structure; risk of flammable contents; unoccupied',
    jenerator_odasi: 'Metal structure; fuel contents; unoccupied',
    diger: 'Default values — to be reviewed',
  },
};
