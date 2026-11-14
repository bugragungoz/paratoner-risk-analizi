// Rapordaki harita şekli: yakalanan harita görüntüsüne ölçek çubuğu, kuzey oku, lejant ve
// sağlayıcı atfı çizilir. Harita Web Mercator'dadır; kuzey her zaman yukarıdır.

export interface LejantOgesi {
  tur: 'nokta' | 'alan' | 'cizgi';
  renk: string;
  metin: string;
  kesikli?: boolean;
}

/** En fazla `enFazlaPx` genişliğe sığan, 1-2-5 dizisinden yuvarlak ölçek uzunluğu. */
export function yuvarlakOlcek(metrePerPx: number, enFazlaPx: number): { metre: number; px: number } {
  const enFazlaMetre = metrePerPx * enFazlaPx;
  const us = Math.pow(10, Math.floor(Math.log10(enFazlaMetre)));
  const metre = [5, 2, 1].map((k) => k * us).find((m) => m <= enFazlaMetre) ?? us;
  return { metre, px: metre / metrePerPx };
}

export const olcekMetni = (m: number) => (m >= 1000 ? `${String(m / 1000).replace('.', ',')} km` : `${m} m`);

function kutu(ctx: CanvasRenderingContext2D, x: number, y: number, g: number, y2: number, o: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = o;
  ctx.beginPath();
  ctx.roundRect(x, y, g, y2, 4 * o);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function haritaSekliniSusle(
  tuval: HTMLCanvasElement,
  s: {
    /** Tuval pikseli / CSS pikseli. */
    olcek: number;
    metrePerPx: number;
    lejant: LejantOgesi[];
    atif: string;
    /** Google Maps logosu (Google katmanında): ölçek kutusunun üstüne, 18 px yükseklikte. */
    logo?: HTMLImageElement | null;
  },
): void {
  const ctx = tuval.getContext('2d');
  if (!ctx) return;
  const o = s.olcek;
  const W = tuval.width;
  const H = tuval.height;
  const kenar = 12 * o;
  const yazi = (boyut: number, kalin = false) => `${kalin ? '600 ' : ''}${boyut * o}px "Segoe UI", Arial, sans-serif`;
  ctx.textBaseline = 'middle';

  // Kuzey oku (sağ üst)
  const r = 18 * o;
  const kx = W - kenar - r;
  const ky = kenar + r;
  kutu(ctx, kx - r, ky - r, 2 * r, 2 * r + 2 * o, o);
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(kx, ky - r + 5 * o);
  ctx.lineTo(kx + 7 * o, ky + 6 * o);
  ctx.lineTo(kx, ky + 2 * o);
  ctx.lineTo(kx - 7 * o, ky + 6 * o);
  ctx.closePath();
  ctx.fill();
  ctx.font = yazi(10, true);
  ctx.textAlign = 'center';
  ctx.fillText('K', kx, ky + r - 6 * o);

  // Ölçek çubuğu (sol alt)
  const olcek = yuvarlakOlcek(s.metrePerPx, 140);
  const cubuk = olcek.px * o;
  const ox = kenar;
  const oy = H - kenar - 30 * o;
  kutu(ctx, ox, oy, cubuk + 24 * o, 30 * o, o);
  const bx = ox + 12 * o;
  const by = oy + 19 * o;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 ? '#fff' : '#111';
    ctx.fillRect(bx + (cubuk / 4) * i, by, cubuk / 4, 5 * o);
  }
  ctx.strokeStyle = '#111';
  ctx.lineWidth = o;
  ctx.strokeRect(bx, by, cubuk, 5 * o);
  ctx.fillStyle = '#111';
  ctx.font = yazi(10);
  ctx.textAlign = 'left';
  ctx.fillText('0', bx - 2 * o, oy + 10 * o);
  ctx.textAlign = 'right';
  ctx.fillText(olcekMetni(olcek.metre), bx + cubuk + 6 * o, oy + 10 * o);

  // Google Maps logosu (ölçek kutusunun üstünde; Google'ın istediği boşluklarla)
  if (s.logo && s.logo.naturalHeight > 0) {
    const lh = 18 * o;
    const lw = (s.logo.naturalWidth / s.logo.naturalHeight) * lh;
    ctx.drawImage(s.logo, ox, oy - 10 * o - lh, lw, lh);
  }

  // Lejant (sol üst)
  if (s.lejant.length) {
    ctx.font = yazi(11);
    const satir = 18 * o;
    const genislik = Math.max(...s.lejant.map((l) => ctx.measureText(l.metin).width)) + 40 * o;
    const lx = kenar;
    const ly = kenar;
    kutu(ctx, lx, ly, genislik, s.lejant.length * satir + 10 * o, o);
    s.lejant.forEach((l, i) => {
      const cy = ly + 5 * o + satir * i + satir / 2;
      const sx = lx + 10 * o;
      ctx.save();
      if (l.tur === 'nokta') {
        ctx.fillStyle = l.renk;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 * o;
        ctx.beginPath();
        ctx.arc(sx + 7 * o, cy, 5.5 * o, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (l.tur === 'alan') {
        ctx.fillStyle = l.renk;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(sx, cy - 5 * o, 14 * o, 10 * o);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = l.renk;
        ctx.lineWidth = 1.5 * o;
        ctx.strokeRect(sx, cy - 5 * o, 14 * o, 10 * o);
      } else {
        ctx.strokeStyle = l.renk;
        ctx.lineWidth = 2.5 * o;
        if (l.kesikli) ctx.setLineDash([4 * o, 3 * o]);
        ctx.beginPath();
        ctx.moveTo(sx, cy);
        ctx.lineTo(sx + 16 * o, cy);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = '#111';
      ctx.textAlign = 'left';
      ctx.fillText(l.metin, sx + 22 * o, cy);
    });
  }

  // Sağlayıcı atfı (sağ alt)
  if (s.atif) {
    ctx.font = yazi(10);
    const g = ctx.measureText(s.atif).width + 12 * o;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(W - g, H - 16 * o, g, 16 * o);
    ctx.fillStyle = '#333';
    ctx.textAlign = 'right';
    ctx.fillText(s.atif, W - 6 * o, H - 8 * o);
  }
}
