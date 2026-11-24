// DXF altlığının harita katmanı: tek bir tuvalde, uydu görüntüsünün üstünde, yapıların altında
// çizilir (kendi bölmesi, z-dizini 350). Çizim koordinatları hizalama değişince bir kez coğrafi ve
// Web Mercator koordinatına çevrilir; harita kaydırılıp yakınlaştırıldığında yalnızca ölçeklenir.
// Görünür alan dışındaki çoklu çizgiler atlanır. Tuval fare olaylarını almaz (tıklamalar haritaya).

import L from 'leaflet';
import { altlikDonusturucu, type AltlikAyari, type DxfAltligi, type LatLng } from '../../core';
import { aciRengi } from './aci';

/** Tek renk kipinde renk seçilmemişse: uydu görüntüsünde sarı, açık haritada koyu pembe. */
export const varsayilanTekRenk = (koyuZemin: boolean) => (koyuZemin ? '#ffd400' : '#d81b60');

interface HazirParca {
  katman: number;
  kapali: boolean;
  /** Yakınlaştırma 0'daki dünya pikseli (x, y, …). */
  dunya: Float64Array;
  /** Coğrafi koordinat (enlem, boylam, …): köşeye yakalama için. */
  cografi: Float64Array;
  sinir: [number, number, number, number];
}

const BOLME = 'altlik';

export class AltlikKatmani extends L.Layer {
  private tuval = L.DomUtil.create('canvas', 'altlik-tuval') as HTMLCanvasElement;
  private parcalar: HazirParca[] = [];
  private renkler: string[] = [];
  private gorunurKatman: boolean[] = [];
  private opaklik = 0.85;
  private kare = 0;
  private anahtar = '';
  private harita: L.Map | null = null;

  /** Çizim, ayar ya da zemin değişince çağrılır; koordinatlar yalnızca hizalama değişince yeniden hesaplanır. */
  ayarla(cozum: DxfAltligi, ayar: AltlikAyari, koyuZemin: boolean) {
    const anahtar = JSON.stringify([ayar.hizalama, ayar.birim]);
    if (anahtar !== this.anahtar || this.parcalar.length === 0) {
      this.anahtar = anahtar;
      const don = altlikDonusturucu(ayar.hizalama, ayar.birim);
      const crs = L.CRS.EPSG3857;
      this.parcalar = cozum.parcalar.map((p) => {
        const n = p.noktalar.length;
        const dunya = new Float64Array(n);
        const cografi = new Float64Array(n);
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (let i = 0; i < n; i += 2) {
          const c = don(p.noktalar[i]!, p.noktalar[i + 1]!);
          const w = crs.latLngToPoint(L.latLng(c.lat, c.lng), 0);
          dunya[i] = w.x;
          dunya[i + 1] = w.y;
          cografi[i] = c.lat;
          cografi[i + 1] = c.lng;
          if (w.x < x0) x0 = w.x;
          if (w.x > x1) x1 = w.x;
          if (w.y < y0) y0 = w.y;
          if (w.y > y1) y1 = w.y;
        }
        return { katman: p.katman, kapali: p.kapali, dunya, cografi, sinir: [x0, y0, x1, y1] };
      });
      // Aynı katmanın çizgileri tek yolda çizilsin diye katmana göre sıralanır.
      this.parcalar.sort((a, b) => a.katman - b.katman);
    }
    const gizli = new Set(ayar.gizliKatmanlar);
    this.gorunurKatman = cozum.katmanlar.map((k) => !gizli.has(k.ad));
    const tek = ayar.tekRenk ?? varsayilanTekRenk(koyuZemin);
    this.renkler = cozum.katmanlar.map((k) => (ayar.renk === 'tek' ? tek : aciRengi(k.renk, koyuZemin)));
    this.opaklik = ayar.opaklik;
    this.cizimIste();
  }

  override onAdd(harita: L.Map) {
    this.harita = harita;
    const bolme = harita.getPane(BOLME) ?? harita.createPane(BOLME);
    bolme.style.zIndex = '350';
    bolme.style.pointerEvents = 'none';
    bolme.appendChild(this.tuval);
    harita.on('move resize zoomend viewreset', this.cizimIste, this);
    harita.on('zoomanim', this.gizle, this);
    this.cizimIste();
    return this;
  }

  override onRemove(harita: L.Map) {
    harita.off('move resize zoomend viewreset', this.cizimIste, this);
    harita.off('zoomanim', this.gizle, this);
    cancelAnimationFrame(this.kare);
    this.tuval.remove();
    this.harita = null;
    return this;
  }

  private gizle() {
    this.tuval.style.visibility = 'hidden';
  }

  private cizimIste() {
    cancelAnimationFrame(this.kare);
    this.kare = requestAnimationFrame(() => this.ciz());
  }

  private ciz() {
    const h = this.harita;
    if (!h) return;
    const boyut = h.getSize();
    const oran = window.devicePixelRatio || 1;
    const t = this.tuval;
    if (t.width !== Math.round(boyut.x * oran) || t.height !== Math.round(boyut.y * oran)) {
      t.width = Math.round(boyut.x * oran);
      t.height = Math.round(boyut.y * oran);
      t.style.width = `${boyut.x}px`;
      t.style.height = `${boyut.y}px`;
    }
    const sol = h.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(t, sol);
    t.style.visibility = 'visible';
    const ctx = t.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    ctx.clearRect(0, 0, boyut.x, boyut.y);
    ctx.globalAlpha = this.opaklik;
    ctx.lineWidth = 1;

    // Kabın sol üst köşesinin dünya pikseli ve yakınlaştırma 0'a göre ölçek.
    const olcek = h.options.crs!.scale(h.getZoom()) / h.options.crs!.scale(0);
    const o = sol.add(h.getPixelOrigin());
    const gx0 = o.x / olcek;
    const gy0 = o.y / olcek;
    const gx1 = (o.x + boyut.x) / olcek;
    const gy1 = (o.y + boyut.y) / olcek;
    // Ekranda 1,5 pikselden küçük kalan şekil tek nokta olarak basılır (uzaklaştırınca on binlerce
    // görünmez yolu çizmek yerine).
    const kucuk = 1.5 / olcek;

    // Çok uzun tek bir yolu çizmek tarayıcıda çok yavaştır: yol ~5000 köşede bir çizilip yenilenir.
    const PARTI = 5000;
    let katman = -1;
    let koseSayisi = 0;
    const bitir = () => {
      if (koseSayisi > 0) ctx.stroke();
      ctx.beginPath();
      koseSayisi = 0;
    };
    for (const p of this.parcalar) {
      if (!this.gorunurKatman[p.katman]) continue;
      const [x0, y0, x1, y1] = p.sinir;
      if (x1 < gx0 || x0 > gx1 || y1 < gy0 || y0 > gy1) continue;
      if (p.katman !== katman) {
        bitir();
        katman = p.katman;
        const renk = this.renkler[katman] ?? '#ffffff';
        ctx.strokeStyle = renk;
        ctx.fillStyle = renk;
      }
      if (x1 - x0 < kucuk && y1 - y0 < kucuk) {
        ctx.fillRect(Math.floor(x0 * olcek - o.x), Math.floor(y0 * olcek - o.y), 1, 1);
        continue;
      }
      const d = p.dunya;
      ctx.moveTo(d[0]! * olcek - o.x, d[1]! * olcek - o.y);
      for (let i = 2; i < d.length; i += 2) ctx.lineTo(d[i]! * olcek - o.x, d[i + 1]! * olcek - o.y);
      if (p.kapali) ctx.closePath();
      koseSayisi += d.length / 2;
      if (koseSayisi >= PARTI) bitir();
    }
    bitir();
  }

  /** Ekrandaki noktaya en yakın görünür altlık köşesi (en çok `esik` piksel uzakta). */
  enYakinKose(nokta: LatLng, esik = 14): LatLng | null {
    const h = this.harita;
    if (!h) return null;
    const olcek = h.options.crs!.scale(h.getZoom()) / h.options.crs!.scale(0);
    const hedef = h.options.crs!.latLngToPoint(L.latLng(nokta.lat, nokta.lng), 0);
    const sinir = esik / olcek;
    let en: LatLng | null = null;
    let enUzaklik = sinir * sinir;
    for (const p of this.parcalar) {
      if (!this.gorunurKatman[p.katman]) continue;
      const [x0, y0, x1, y1] = p.sinir;
      if (hedef.x < x0 - sinir || hedef.x > x1 + sinir || hedef.y < y0 - sinir || hedef.y > y1 + sinir) continue;
      const d = p.dunya;
      for (let i = 0; i < d.length; i += 2) {
        const u = (d[i]! - hedef.x) ** 2 + (d[i + 1]! - hedef.y) ** 2;
        if (u < enUzaklik) {
          enUzaklik = u;
          en = { lat: p.cografi[i]!, lng: p.cografi[i + 1]! };
        }
      }
    }
    return en;
  }

  /** Altlığın coğrafi sınırı (haritayı altlığa götürmek için). */
  sinir(): L.LatLngBounds | null {
    const b = L.latLngBounds([]);
    for (const p of this.parcalar) {
      for (let i = 0; i < p.cografi.length; i += 2) b.extend([p.cografi[i]!, p.cografi[i + 1]!]);
    }
    return b.isValid() ? b : null;
  }
}
