// Faz 5: harita katmanları yalnızca resmi servisler; anahtarsız katman OSM'ye düşer.
import { readFileSync } from 'node:fs';
import { describe, test, expect } from 'vitest';
import { KATMANLAR, KATMAN_ADLARI, etkinKatman, karoAdresi, katmanKullanilabilir } from '../src/arayuz/harita/katmanlar';
import { koordinatCoz } from '../src/arayuz/harita/konumArama';

const ANAHTARLI = { google: true, esri: true };

describe('Harita katmanları', () => {
  test('anahtarlı katmanlar tarayıcıda (masaüstü dışında) kullanılamaz, OSM gösterilir', () => {
    expect(etkinKatman('google_uydu', ANAHTARLI)).toBe('osm');
    expect(etkinKatman('esri_uydu', ANAHTARLI)).toBe('osm');
    expect(etkinKatman('bilinmeyen', ANAHTARLI)).toBe('osm');
    expect(katmanKullanilabilir('osm', { google: false, esri: false })).toBe(true);
    expect(karoAdresi('osm')).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  });

  test('her katmanın atfı var; Google "Google Maps", Esri "Powered by Esri"', () => {
    for (const k of KATMAN_ADLARI) expect(KATMANLAR[k].atif.length).toBeGreaterThan(5);
    expect(KATMANLAR.google_uydu.atif).toBe('Google Maps');
    expect(KATMANLAR.esri_uydu.atif).toMatch(/^Powered by Esri/);
    expect(KATMANLAR.osm.atif).toMatch(/OpenStreetMap/);
  });

  test('koordinat girişi tanınır', () => {
    expect(koordinatCoz('39,92 32,85')).toEqual({ lat: 39.92, lng: 32.85 });
    expect(koordinatCoz('39.92, 32.85')).toEqual({ lat: 39.92, lng: 32.85 });
    expect(koordinatCoz('Kızılay')).toBeNull();
    expect(koordinatCoz('95 32')).toBeNull();
  });
});

describe('Resmi olmayan uçlar ve taklit kalmadı', () => {
  const dosyalar = [
    'src/arayuz/harita/katmanlar.ts',
    'src/arayuz/harita/Harita.tsx',
    'src/arayuz/pencereler/StreetViewPaneli.tsx',
    'src-tauri/src/harita_servisleri.rs',
    'src-tauri/src/lib.rs',
    'src-tauri/tauri.conf.json',
  ].map((f) => [f, readFileSync(f, 'utf8')]);

  test.each(dosyalar)('%s', (_ad, icerik) => {
    expect(icerik).not.toMatch(/mt\d?\.google\.com|\{s\}\.google\.com|lyrs=|output=svembed|server\.arcgisonline\.com/);
    expect(icerik).not.toMatch(/Mozilla\/5\.0|Chrome\/\d/);
    expect(icerik).not.toMatch(/offline_tiles|offline_karolari_indir/);
  });

  test('CSP: görseller yalnızca karo vekilinden, çerçeve yalnızca Google', () => {
    const csp = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')).app.security.csp;
    expect(csp).toContain("img-src 'self' data: blob: http://karo.localhost;");
    expect(csp).toContain('frame-src https://www.google.com;');
    expect(csp).not.toMatch(/googleapis|arcgis|openstreetmap/);
  });
});
