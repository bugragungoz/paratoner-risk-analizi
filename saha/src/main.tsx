// Keşif (Paratoner saha uygulaması) — Copyright (C) 2026 Buğra Güngöz — GPL-3.0-or-later

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '../../src/arayuz/stil/bugra.css';
import './saha.css';
import { SahaSaglayici } from './baglam';
import { Uygulama } from './Uygulama';

const kok = document.getElementById('root');
if (!kok) throw new Error('#root yok');

createRoot(kok).render(
  <StrictMode>
    <SahaSaglayici>
      <Uygulama />
    </SahaSaglayici>
  </StrictMode>,
);
