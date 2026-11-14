// Bu uygulama Buğra Güngöz tarafından hazırlanmıştır.
// GitHub: https://github.com/bugragungoz

// Hesap tablosunu CSV olarak dışa aktarma.
import { projeHesapTablosuUret } from './hesapTablosu';

function csvHucre(deger) {
  const s = String(deger ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Proje hesap tablosunu CSV metnine çevirir (Türkçe locale, noktalı
 * virgül ayraç — Excel'in Türkçe sürümüyle uyumlu).
 */
export function hesapTablosuCsvUret(proje) {
  const tablo = projeHesapTablosuUret(proje);
  const basliklar = [
    'Yapı', 'Gerekli Seviye', 'Ae (m²)', 'Nd', 'Nc', 'E',
    'Paratoner', 'Birincil mi', 'h (m)', 'Rp (m)',
    'Mesafe (en yakın, m)', 'Mesafe (en uzak, m)',
    'Marj (en yakın, m)', 'Marj (en uzak, m)', 'Durum',
  ];

  const satirlar = [basliklar.map(csvHucre).join(';')];

  tablo.forEach((yapiSonuc) => {
    if (yapiSonuc.satirlar.length === 0) {
      satirlar.push(
        [yapiSonuc.yapiIsim, yapiSonuc.seviye, yapiSonuc.Ae?.toFixed(1), '', '', '', '', '', '', '', '', '', '', '', 'Paratoner yok']
          .map(csvHucre)
          .join(';')
      );
      return;
    }
    yapiSonuc.satirlar.forEach((s) => {
      satirlar.push(
        [
          yapiSonuc.yapiIsim,
          yapiSonuc.seviye,
          yapiSonuc.Ae?.toFixed(1),
          yapiSonuc.Nd?.toFixed(5),
          yapiSonuc.Nc?.toFixed(5),
          yapiSonuc.E !== null ? yapiSonuc.E.toFixed(3) : '',
          s.paratonerIsim,
          s.paratonerId === yapiSonuc.birincilParatonerId ? 'Evet' : '',
          s.gecerliMi ? s.gercekH.toFixed(1) : '',
          s.gecerliMi ? s.rp : '',
          s.gecerliMi ? s.enYakin.toFixed(1) : '',
          s.gecerliMi ? s.enUzak.toFixed(1) : '',
          s.gecerliMi ? s.marjEnYakin.toFixed(1) : '',
          s.gecerliMi ? s.marjEnUzak.toFixed(1) : '',
          s.gecerliMi ? s.durum : s.neden,
        ]
          .map(csvHucre)
          .join(';')
      );
    });
  });

  return satirlar.join('\r\n');
}

export function hesapTablosuCsvIndir(proje) {
  const csv = hesapTablosuCsvUret(proje);
  // BOM ekle — Excel'in Türkçe karakterleri (ğ,ş,ı,ç) doğru göstermesi için
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dosyaAdi = (proje.isim || 'hesap-tablosu').replace(/[^a-zA-Z0-9-_ĞÜŞİÖÇğüşiöç]/g, '_');
  a.download = `${dosyaAdi}-hesap-tablosu.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

