# Değişiklik günlüğü

Biçim [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) düzenindedir; sürümler
[anlamsal sürümleme](https://semver.org/lang/tr/) kullanır.

## Yayımlanmamış

### Eklendi

- **Google Earth (KML / KMZ):** dosya menüsünden dışa ve içe aktarma.
  - Dışa aktarılan KML'de yapılar sonuç renkleriyle, paratonerler, her yapıya ulaşan paratonerin
    gerçek Rp dairesi ve parsel sınırı ayrı klasörlerde yer alır; yükseklik, kot, katsayılar ve
    sonuçlar Google Earth balonunda okunur.
  - İçe aktarmada noktalar paratoner, poligonlar yapı ya da parsel sınırı olarak önerilir; tür, ad,
    yükseklik ve taban (kot ya da çatı) önizlemede düzeltilir, öğeler tek adımda (tek geri alma)
    eklenir. Mast yüksekliği girilmeden paratoner eklenmez; yüksekliği ya da katsayıları eksik yapı
    eklenir ama "hesaplanamadı" görünür. Kot ve yükseklik KML'in yükseklik değerinden alınmaz.
  - Saha uygulamaları için `pt_` önekli alanlarla şema (sürüm 1): yükseklik, kot, katsayılar, çatıdaki
    paratonerin yapısı ve konum doğruluğu taşınabilir.

- **AutoCAD DXF dışa aktarma:** dosya menüsünden. Koordinat sistemi olarak TUREF / TM (3° dilim,
  EPSG 5253-5259; vaziyet planlarıyla aynı, dilim proje konumundan önerilir) ya da yerel metrik
  sistem seçilir; yerel sistemin başlangıç noktası ilk çıktıda projeye kaydedilir, sonraki çıktılar
  üst üste gelir. Yapılar sonuca göre ayrı katmanlarda (YAPI_KORUNUYOR, YAPI_KORUNMUYOR,
  YAPI_ISTEGE_BAGLI, YAPI_HESAPLANAMADI), açıkta kalan alanlar, paratonerler, gerçek Rp daireleri
  (TUREF'te izdüşüm ölçek katsayısıyla), parsel sınırı, etiketler ve bilgi yazısı. Biçim AutoCAD R12
  (Türkçe Windows kod sayfası), birim metre, Z = 0.

- **DXF altlık:** dosya menüsünden bir DXF çizimi (ör. vaziyet planı) haritada ayrı bir katman
  olarak açılır; yalnızca görseldir, hesaba ve rapordaki harita şekline girmez.
  - TUREF / TM koordinatlı çizim kendiliğinden yerine oturur (dilim, çizimi projeye en yakın yere
    koyandır); koordinatsız çizim iki nokta ile hizalanır: çizimde ve haritada ikişer nokta seçilir
    (çizim köşelerine, yapı köşelerine ve paratonerlere yakalanır), ölçek çizim biriminden gelir ve
    noktalardan bulunan ölçekle farkı bildirilir. Ardından metre ve derece adımlarıyla ince ayar.
  - Katmanlar ayrı ayrı gizlenir; opaklık, katman renkleri ya da tek renk; çizim birimi seçilebilir.
  - Okunanlar: LINE, LWPOLYLINE/POLYLINE (yaylı), CIRCLE, ARC, ELLIPSE, SPLINE, SOLID/3DFACE,
    LEADER, iç içe bloklar ve ölçüler; aynalanmış öğeler doğru yöne çevrilir. Yazılar ve taramalar
    gösterilmez. AutoCAD R12–2018 ASCII DXF; eski sürümlerde kod sayfası ($DWGCODEPAGE) okunur.
  - Projede çizimin kendisi değil yolu ve hizalaması saklanır (AutoCAD dış başvurusu gibi); proje
    açılınca çizim yolundan yeniden okunur, bulunamazsa yeniden seçilir.

### Düzeltildi

- **Hesap:** mesafe, alan ve kapsama elipsoit (GRS80) üzerinde, yapının yerel Transverse Mercator
  düzleminde hesaplanıyor. Önceden Dünya küre kabul ediliyordu: doğu-batı yönündeki mesafeler
  %0,26'ya kadar kısa (60 m'de yaklaşık 15 cm, güvensiz yönde), kuzey-güney yönündekiler %0,2'ye
  kadar uzun ölçülüyordu. Sonuçlar santimetre düzeyinde değişir; 300 rastgele sahadaki 913 yapıdan
  yalnızca birinin sonucu değişti. Haritadaki mesafe ölçümü de aynı modeli kullanır.
- **Hesap:** bir paratoner yapının bütün köşelerini kapsıyorsa yapı "koruma yeterli" sayılır.
  Koruma dairesi kapsama hesabında 128 kenarlı iç teğet çokgenle temsil edildiği için, en uzak
  köşesi dairenin birkaç santim içinde kalan bir yapı "kısmi koruma (%99,9)" görünebiliyordu;
  hesap tablosunda aynı yapının paratoner satırı ise "yeterli" diyordu.

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
