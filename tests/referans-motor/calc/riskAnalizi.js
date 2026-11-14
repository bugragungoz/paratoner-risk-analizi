// Bu uygulama Buğra Güngöz tarafından hazırlanmıştır.
// GitHub: https://github.com/bugragungoz

// Risk analizi hesap motoru. Bkz. 03-faz3-risk-analizi.md — formüller
// bir referans proje raporundan birebir alınmıştır.
//
// NOT: Koruma seviyesi PARATONERİN değil, KORUNAN YAPININ özelliğidir
// (kullanıcı ile netleştirildi). Her yapı kendi C1-C5/Ae değerinden
// kendi "Gerekli Koruma Seviyesi"ni hesaplar.

/**
 * @param {number} Nk Bölgesel yıldırımlı gün sayısı (oraj), proje bazlı sabit
 * @returns {number} Ng — yıldırım yoğunluğu, /km²/yıl
 */
export function ngHesapla(Nk) {
  if (!Nk || Nk <= 0) return 0;
  return 0.04 * Math.pow(Nk, 1.25);
}

/**
 * @param {number} Ae m², Faz 2/1 geometri modülünden
 * @param {number} Ng
 * @param {number} C1
 * @returns {number} Nd
 */
export function ndHesapla(Ae, Ng, C1) {
  return Ae * Ng * C1 * 1e-6;
}

/**
 * @param {number} C2 @param {number} C3 @param {number} C4 @param {number} C5
 * @returns {{ C:number, Nc:number }}
 */
export function ncHesapla(C2, C3, C4, C5) {
  const C = C2 * C3 * C4 * C5;
  const Nc = C > 0 ? 5.5e-3 / C : null;
  return { C, Nc };
}

/**
 * @param {number} Nd @param {number} Nc
 * @returns {number|null} E — null ise geçersiz veri (Nd=0 vb.)
 */
export function eHesapla(Nd, Nc) {
  if (!Nd || Nd <= 0 || Nc === null || Nc === undefined) return null;
  return 1 - Nc / Nd;
}

/**
 * Gerekli Koruma Seviyesi tablosu — referans rapordan birebir.
 * @param {number|null} E
 * @returns {{ seviye: string, sutun: 'I'|'II'|'III'|'IV'|null, renk: string }}
 */
export function gerekliSeviyeBelirle(E) {
  if (E === null || E === undefined || Number.isNaN(E)) {
    return { seviye: 'GEÇERSİZ VERİ', sutun: null, renk: '#71717a' };
  }
  if (E > 0.98) return { seviye: 'Seviye 1 + Ek Önlem', sutun: 'I', renk: '#4d7ea8' };
  if (E > 0.95) return { seviye: 'Seviye 1', sutun: 'I', renk: '#4d7ea8' };
  if (E > 0.9) return { seviye: 'Seviye 2', sutun: 'II', renk: '#16a34a' };
  if (E > 0.8) return { seviye: 'Seviye 3', sutun: 'III', renk: '#f97316' };
  if (E > 0) return { seviye: 'Seviye 4', sutun: 'IV', renk: '#dc2626' };
  return { seviye: 'İsteğe Bağlı', sutun: 'IV', renk: '#71717a' };
}

/**
 * Bir yapı için TAM risk analizi zinciri: Ng -> Nd -> C/Nc -> E -> Seviye.
 * @param {object} yapi { Ae, C1, C2, C3, C4, C5 }
 * @param {number} Nk proje bazlı oraj değeri
 */
export function yapiRiskAnaliziYap(yapi, Nk) {
  const Ng = ngHesapla(Nk);
  const Nd = ndHesapla(yapi.Ae, Ng, yapi.C1);
  const { C, Nc } = ncHesapla(yapi.C2, yapi.C3, yapi.C4, yapi.C5);
  const E = eHesapla(Nd, Nc);
  const { seviye, sutun, renk } = gerekliSeviyeBelirle(E);
  return { Ng, Nd, C, Nc, E, seviye, sutun, renk };
}

