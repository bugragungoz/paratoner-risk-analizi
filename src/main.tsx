// Paratoner Risk Analizi — Copyright (C) 2026 Buğra Güngöz — GPL-3.0-or-later

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import '@fontsource/jetbrains-mono/400.css';
import 'leaflet/dist/leaflet.css'; // tema stillerinden ÖNCE: tema, Leaflet varsayılanlarını ezebilsin
import './arayuz/stil/bugra.css';
import './arayuz/stil/arayuz.css';
import { ProjeSaglayici } from './arayuz/durum/ProjeSaglayici';
import { EtkilesimSaglayici } from './arayuz/ortak/Etkilesim';
import { HataYakalayici } from './arayuz/ortak/HataYakalayici';
import { Uygulama } from './arayuz/Uygulama';

const kok = document.getElementById('root');
if (!kok) throw new Error('#root bulunamadı');

createRoot(kok).render(
  <StrictMode>
    <HataYakalayici>
      <EtkilesimSaglayici>
        <ProjeSaglayici>
          <Uygulama />
        </ProjeSaglayici>
      </EtkilesimSaglayici>
    </HataYakalayici>
  </StrictMode>,
);
