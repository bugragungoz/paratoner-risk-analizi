// Kullanım koşulları, sorumluluk reddi ve lisans özeti. Uygulamadaki bütün yasal metinler buradan
// gelir (ilk açılış penceresi, Hakkında, yan paneldeki bildirim). Depodaki karşılığı: NOTICE.md.
//
// Metin değişirse KOSUL_SURUMU da değiştirilir; kullanıcı yeni metni bir kez daha onaylar.

export const KOSUL_SURUMU = '2026-11';

export const YAZAR = 'Buğra Güngöz';
export const TELIF = `Copyright © 2026 ${YAZAR}`;
export const DEPO_ADRESI = 'https://github.com/bugragungoz/paratoner-risk-analizi';

export interface YasalMadde {
  baslik: string;
  metin: string;
}

export const SORUMLULUK_OZETI =
  'Bu program bir hesap yardımcısıdır ve hiçbir garanti verilmeden sunulur. Sonuçlardan, rapordan ve bunlara dayanan kararlardan kullanıcı ve projeyi imzalayan mühendis sorumludur; yazar hiçbir sorumluluk kabul etmez.';

export const KULLANIM_KOSULLARI: readonly YasalMadde[] = [
  {
    baslik: 'Garanti yoktur',
    metin:
      'Program "olduğu gibi" sunulur. Doğruluk, eksiksizlik, kesintisiz çalışma, belirli bir amaca uygunluk ya da herhangi bir standarda, yönetmeliğe veya şartnameye uygunluk dahil, açık ya da zımni hiçbir garanti verilmez.',
  },
  {
    baslik: 'Sorumluluk kabul edilmez',
    metin:
      'Yazar ve katkıda bulunanlar; programın kullanılmasından, kullanılamamasından ya da sonuçlarına güvenilmesinden doğan can ve mal kaybı, maddi ve manevi zarar, iş ve gelir kaybı, idari ya da hukuki yaptırım dahil hiçbir doğrudan ya da dolaylı zarardan, yürürlükteki hukukun izin verdiği en geniş ölçüde sorumlu değildir.',
  },
  {
    baslik: 'Mühendislik hizmeti değildir',
    metin:
      'Program mühendislik, danışmanlık, proje onayı ya da uygunluk belgesi yerine geçmez. Sonuçlar yetkili bir mühendis tarafından bağımsız olarak doğrulanmalıdır. Girdilerin, hesabın, raporun ve bunlara dayanan her kararın sorumluluğu kullanıcıya ve projeyi imzalayan mühendise aittir.',
  },
  {
    baslik: 'Standart ve mevzuat',
    metin:
      'Program NF C 17-102 standardının metnini içermez ve standardın yerine geçmez; standart yayıncısından temin edilmelidir. Bir projede hangi standardın, baskının ve yöntemin geçerli olduğunu belirlemek kullanıcının sorumluluğundadır.',
  },
  {
    baslik: 'Üçüncü taraflar',
    metin:
      'Bu bağımsız bir projedir; AFNOR, herhangi bir standart kuruluşu, paratoner üreticisi, Google, Esri ya da OpenStreetMap ile bağlantısı yoktur ve onlar tarafından onaylanmamıştır. Adı geçen markalar sahiplerine aittir. Harita servisleri kullanıcının kendi hesabı ve anahtarıyla, sağlayıcının koşullarına göre kullanılır; doğan ücret ve yükümlülükler kullanıcıya aittir.',
  },
  {
    baslik: 'Kabul',
    metin: 'Programı kullanmanız bu koşulları kabul ettiğiniz anlamına gelir. Kabul etmiyorsanız programı kullanmayın.',
  },
];

export const LISANS_ACIKLAMASI =
  'Programın tasarımı, hesap akışı, arayüzü ve kaynak kodu yazarına aittir ve GNU Genel Kamu Lisansı sürüm 3 ya da (tercihinize göre) daha sonraki bir sürümle lisanslanmıştır.';

export const LISANS_IZINLERI: readonly string[] = [
  'Programı ticari işler dahil her amaçla kullanabilir, kaynak kodunu inceleyebilir, değiştirebilir ve dağıtabilirsiniz.',
  'Dağıttığınız her kopyada telif ve yazar bildirimleri ile bu koşullar korunur.',
  'Değiştirilmiş sürüm, özgün programdan farklı olduğu açıkça belirtilerek, aynı lisansla ve kaynak koduyla birlikte dağıtılır; kapalı kaynaklı bir ürüne dahil edilemez.',
  'Program adı ve logosu, değiştirilmiş sürümleri özgün programmış gibi sunmak için kullanılamaz.',
];
