# Değişiklik günlüğü

Biçim [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) düzenindedir; sürümler
[anlamsal sürümleme](https://semver.org/lang/tr/) kullanır.

## Yayımlanmamış

### Düzeltildi

- **Hesap:** mesafe, alan ve kapsama elipsoit (GRS80) üzerinde, yapının yerel Transverse Mercator
  düzleminde hesaplanıyor. Önceden Dünya küre kabul ediliyordu: doğu-batı yönündeki mesafeler
  %0,26'ya kadar kısa (60 m'de yaklaşık 15 cm, güvensiz yönde), kuzey-güney yönündekiler %0,2'ye
  kadar uzun ölçülüyordu. Sonuçlar santimetre düzeyinde değişir; 300 rastgele sahadaki 913 yapıdan
  yalnızca birinin sonucu değişti. Haritadaki mesafe ölçümü de aynı modeli kullanır.

## 1.9.1 (2026-11-15)

### Düzeltildi

- Rapor penceresinde rapor numarası ya da tesis adresi, üst çubukta proje adı yazılırken program
  takılmıyor. Hesaba girmeyen bu alanlar değiştiğinde bütün proje yeniden hesaplanıyor ve
  paratoner katmanı baştan çiziliyordu; 12 yapılı bir projede tuş başına yaklaşık 0,9 saniye
  sürüyordu.

## 1.9.0 (2026-11-15)

İlk açık sürüm.

- **Çizim:** yapılar, paratonerler, kot seviyeleri ve parsel sınırı harita üzerinde tanımlanır;
  projeler `.ptproj` dosyasında saklanır.
- **Risk analizi:** her yapı için gerekli koruma seviyesi; C1-C5 katsayıları tablo değerlerinden
  seçilir, sık kullanılan yapı türleri için C profilleri kaydedilir.
- **Koruma kontrolü:** paratoner başına ve birlikte koruma; sonuç haritada ve durum çubuğunda
  görünür.
- **Hesap dökümü:** Ae, Ng, Nd, C, Nc ve E adımlarının formülü, yerine konan değerler ve sonuç.
- **Rapor:** Word ve PDF; firma logosu, hazırlayan mühendis bilgisi ve imza kapakta yer alır.
  Kaynakça koruma yarıçapını NF C 17-102'nin Eylül 2011 baskısına, risk değerlendirmesini
  basitleştirilmiş yönteme ayrı ayrı bağlar.
- **Harita:** Google ve Esri uydu görüntüsü kullanıcının kendi anahtarıyla, anahtarsız
  OpenStreetMap; yalnızca resmi servisler.
- **Kullanım koşulları:** program ilk açılışta koşulları ve sorumluluk reddini gösterir, onay
  ister; tam metin Yardım › Hakkında penceresinde ve `NOTICE.md` dosyasındadır.
