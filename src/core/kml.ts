// Google Earth (KML 2.2) dışa aktarma ve paratoner KML şeması.
//
// Şema (sürüm 1): her Placemark'ın <ExtendedData> öğesinde `pt_` önekli <Data> alanları bulunur.
// Google Earth bunları balonda tablo olarak gösterir; saha uygulaması aynı alanları yazarak projeye
// öğe gönderebilir. Sayılar ondalık noktayla yazılır; koordinatlar WGS84 boylam,enlem'dir ve
// yükseklik yazılmaz (öğeler zemine oturur; kot ve yükseklik aşağıdaki alanlarla taşınır).
//
//   Belge      pt_surum (şema sürümü), pt_uygulama, pt_kotlar (saha: bütün kotlar, JSON [{ad, m}])
//   Ortak      pt_tur = yapi | paratoner | parsel | rp_daire,  pt_kimlik
//   Yapı       pt_H_m (kot seviyesinden çatıya), pt_kot (kot adı), pt_kot_m (kotun referanstan yüksekliği),
//              pt_C1 … pt_C5; yalnızca dışa aktarmada sonuç: pt_seviye, pt_sonuc, pt_kapsama
//   Paratoner  pt_mast_m, pt_kot ve pt_kot_m (zemindeyse), pt_yapi (çatıdaysa yapının pt_kimlik'i),
//              pt_deltaT (paratonere özel ΔT, µs), pt_aktif (1/0)
//   Saha       pt_dogruluk_m (konum doğruluğu, m; içe aktarmada gösterilir), pt_konum_kaynagi (gps | elle),
//              pt_zaman (ISO), pt_not (içe aktarma önizlemesinde gösterilir); bkz. sahaKml.ts
//   Rp dairesi (yalnızca dışa aktarma) pt_paratoner, pt_yapi, pt_rp_m, pt_seviye, pt_h_m, pt_deltaT

import type { Metinler } from '../dil';
import { kotMetni, sayi, yuzde } from './bicim';
import { etkinDeltaT } from './dogrulama';
import type { ProjeSonucu } from './hesap';
import { DAIRE_ADIMI } from './geometri';
import { elipsoitMesafe, yerelDuzlem } from './koordinat';
import { paratonerTepeKotu } from './kot';
import type { LatLng, Paratoner, Proje, Yapi } from './tipler';
import { aciklama, KML_SEMA_SURUMU, kmlRengi, veri, xml, type KmlAlanlari } from './kmlTemel';

export { KML_SEMA_SURUMU, kmlSayi } from './kmlTemel';

export type KmlTuru = 'yapi' | 'paratoner' | 'parsel' | 'rp_daire';

type Alanlar = KmlAlanlari;

const koordinat = (n: LatLng) => `${n.lng.toFixed(8)},${n.lat.toFixed(8)},0`;

function halka(poligon: LatLng[]): string {
  const k = poligon.map(koordinat);
  if (k.length && k[0] !== k[k.length - 1]) k.push(k[0]!);
  return k.join(' ');
}

const PARATONER_RENGI = '#f59e0b';
const DAIRE_RENGI = '#f59e0b';
const PARSEL_RENGI = '#71717a';

function stiller(renkler: string[]): string {
  const yapi = renkler.map(
    (r) =>
      `<Style id="yapi-${r.slice(1)}"><LineStyle><color>${kmlRengi(r)}</color><width>2</width></LineStyle>` +
      `<PolyStyle><color>${kmlRengi(r, '66')}</color></PolyStyle></Style>`,
  );
  return [
    ...yapi,
    `<Style id="paratoner"><IconStyle><color>${kmlRengi(PARATONER_RENGI)}</color><scale>1.1</scale></IconStyle></Style>`,
    `<Style id="rp-daire"><LineStyle><color>${kmlRengi(DAIRE_RENGI)}</color><width>2</width></LineStyle><PolyStyle><fill>0</fill></PolyStyle></Style>`,
    `<Style id="parsel"><LineStyle><color>${kmlRengi(PARSEL_RENGI)}</color><width>2</width></LineStyle><PolyStyle><fill>0</fill></PolyStyle></Style>`,
  ].join('');
}

const poligonGeometrisi = (poligon: LatLng[]) =>
  `<Polygon><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode><outerBoundaryIs><LinearRing><coordinates>${halka(poligon)}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;

/** KML 2.2 şemasındaki sıra: name, description, styleUrl, ExtendedData, geometri. */
function placemark(ad: string, stil: string, satirlar: string[], alanlar: Alanlar, geometri: string): string {
  return `<Placemark><name>${xml(ad)}</name>${satirlar.length ? aciklama(satirlar) : ''}<styleUrl>#${stil}</styleUrl>${veri(alanlar)}${geometri}</Placemark>`;
}

/** Paratoner merkezli, yarıçapı metre olan dairenin köşeleri (elipsoit üzerinde, DAIRE_ADIMI köşe). */
export function daireKoseleri(merkez: LatLng, yaricap: number): LatLng[] {
  const d = yerelDuzlem(merkez);
  return Array.from({ length: DAIRE_ADIMI }, (_, i) => {
    const a = (2 * Math.PI * i) / DAIRE_ADIMI;
    return d.geri({ x: yaricap * Math.sin(a), y: yaricap * Math.cos(a) });
  });
}

function kotBilgisi(proje: Proje, kotId: string | null | undefined): { ad: string; m: number } | null {
  const k = proje.kot_seviyeleri.find((x) => x.id === kotId);
  return k ? { ad: k.isim, m: k.taban_kottan_yukseklik_m } : null;
}

function yapiPlacemark(yapi: Yapi, proje: Proje, sonuc: ProjeSonucu, m: Metinler): string {
  const s = sonuc.yapilar.find((y) => y.yapiId === yapi.id);
  const kot = kotBilgisi(proje, yapi.kot_seviyesi_id);
  const satirlar = [
    yapi.H_m !== null ? m.kml.yukseklik(sayi(yapi.H_m)) : null,
    kot ? m.kml.kot(kot.ad, kotMetni(kot.m)) : null,
    s?.risk ? m.kml.seviye(s.risk.seviye) : null,
    s ? m.kml.sonuc(s.nihai.etiket) : null,
    s?.kapsama ? m.kml.kapsama(yuzde(s.kapsama.kapsamaOrani)) : null,
  ].filter((x): x is string => x !== null);
  const alanlar: Alanlar = {
    pt_tur: 'yapi',
    pt_kimlik: yapi.id,
    pt_H_m: yapi.H_m,
    pt_kot: kot?.ad,
    pt_kot_m: kot?.m,
    pt_C1: yapi.C1,
    pt_C2: yapi.C2,
    pt_C3: yapi.C3,
    pt_C4: yapi.C4,
    pt_C5: yapi.C5,
    pt_seviye: s?.risk?.sutun,
    pt_sonuc: s?.nihai.kod,
    pt_kapsama: s?.kapsama ? Number(s.kapsama.kapsamaOrani.toFixed(4)) : undefined,
  };
  const renk = s?.nihai.renk ?? PARSEL_RENGI;
  return placemark(yapi.isim, `yapi-${renk.slice(1)}`, satirlar, alanlar, poligonGeometrisi(yapi.poligon));
}

function paratonerPlacemark(pr: Paratoner, proje: Proje, m: Metinler): string {
  const yapi = pr.yapi_id ? proje.yapilar.find((y) => y.id === pr.yapi_id) : undefined;
  const kot = yapi ? null : kotBilgisi(proje, pr.kot_seviyesi_id);
  const uc = paratonerTepeKotu(pr, proje);
  const dT = etkinDeltaT(pr, proje);
  const satirlar = [
    m.kml.mast(sayi(pr.mast_yuksekligi_m)),
    yapi ? m.kml.catida(yapi.isim) : kot ? m.kml.taban(`${kot.ad} (${kotMetni(kot.m)} m)`) : null,
    uc !== null ? m.kml.ucKotu(kotMetni(uc)) : null,
    dT !== null ? m.kml.deltaT(dT) : null,
    pr.aktif_mi === false ? m.kml.devreDisi : null,
  ].filter((x): x is string => x !== null);
  const alanlar: Alanlar = {
    pt_tur: 'paratoner',
    pt_kimlik: pr.id,
    pt_mast_m: pr.mast_yuksekligi_m,
    pt_kot: kot?.ad,
    pt_kot_m: kot?.m,
    pt_yapi: yapi?.id,
    pt_deltaT: pr.deltaT ?? undefined,
    pt_aktif: pr.aktif_mi === false ? 0 : 1,
  };
  return placemark(pr.isim, 'paratoner', satirlar, alanlar, `<Point><coordinates>${koordinat(pr)}</coordinates></Point>`);
}

/** Her yapı için, ona ulaşan (geçerli satırı olan ve yapıya değen) paratonerlerin gerçek Rp daireleri. */
function rpDaireleri(proje: Proje, sonuc: ProjeSonucu, m: Metinler): string[] {
  const sonuclar: string[] = [];
  for (const y of sonuc.yapilar) {
    const yapi = proje.yapilar.find((x) => x.id === y.yapiId);
    if (!yapi) continue;
    for (const s of y.satirlar) {
      if (!s.gecerli || s.rp === undefined || s.enYakin === undefined || s.enYakin > s.rp) continue;
      const pr = proje.paratonerler.find((p) => p.id === s.paratonerId);
      if (!pr) continue;
      const alanlar: Alanlar = {
        pt_tur: 'rp_daire',
        pt_paratoner: pr.id,
        pt_yapi: yapi.id,
        pt_rp_m: s.rp,
        pt_seviye: s.sutun,
        pt_h_m: s.gercekH,
        pt_deltaT: s.deltaT,
      };
      const satir = m.kml.rpDaire(sayi(s.rp), s.sutun ?? '-', sayi(s.gercekH), s.deltaT ?? 0);
      sonuclar.push(placemark(`${pr.isim} → ${yapi.isim}`, 'rp-daire', [satir], alanlar, poligonGeometrisi(daireKoseleri(pr, s.rp))));
    }
  }
  return sonuclar;
}

/** Proje alanına bakan kamera: öğelerin ortası, bütün öğeleri gösterecek uzaklıkta. */
function bakis(proje: Proje): string {
  const noktalar: LatLng[] = [...proje.yapilar.flatMap((y) => y.poligon), ...proje.paratonerler, ...(proje.parsel_siniri ?? [])];
  if (!noktalar.length) return '';
  const lat = noktalar.map((n) => n.lat);
  const lng = noktalar.map((n) => n.lng);
  const gk = { lat: Math.min(...lat), lng: Math.min(...lng) };
  const kd = { lat: Math.max(...lat), lng: Math.max(...lng) };
  const menzil = Math.max(150, elipsoitMesafe(gk, kd) * 1.6);
  return (
    `<LookAt><longitude>${((gk.lng + kd.lng) / 2).toFixed(8)}</longitude><latitude>${((gk.lat + kd.lat) / 2).toFixed(8)}</latitude>` +
    `<altitude>0</altitude><heading>0</heading><tilt>0</tilt><range>${Math.round(menzil)}</range><altitudeMode>relativeToGround</altitudeMode></LookAt>`
  );
}

const klasor = (ad: string, icerik: string[]) => (icerik.length ? `<Folder><name>${xml(ad)}</name>${icerik.join('')}</Folder>` : '');

/** Projenin KML belgesi: yapılar (sonuç renkleriyle), paratonerler, gerçek Rp daireleri ve parsel sınırı. */
export function kmlUret(proje: Proje, sonuc: ProjeSonucu, m: Metinler, uygulama: string): string {
  const renkler = [...new Set([PARSEL_RENGI, ...sonuc.yapilar.map((y) => y.nihai.renk)])];
  const parsel =
    proje.parsel_siniri && proje.parsel_siniri.length >= 3
      ? [placemark(m.kml.parsel, 'parsel', [], { pt_tur: 'parsel' }, poligonGeometrisi(proje.parsel_siniri))]
      : [];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    // Şema sırası: name, open, LookAt, Style, ExtendedData, alt öğeler.
    `<Document><name>${xml(proje.isim)}</name><open>1</open>`,
    bakis(proje),
    stiller(renkler),
    veri({ pt_surum: KML_SEMA_SURUMU, pt_uygulama: uygulama }),
    klasor(m.kml.klasorYapilar, proje.yapilar.map((y) => yapiPlacemark(y, proje, sonuc, m))),
    klasor(m.kml.klasorParatonerler, proje.paratonerler.map((p) => paratonerPlacemark(p, proje, m))),
    klasor(m.kml.klasorDaireler, rpDaireleri(proje, sonuc, m)),
    klasor(m.kml.klasorParsel, parsel),
    '</Document>',
    '</kml>',
    '',
  ].join('\n');
}
