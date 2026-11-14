# Güvenlik

## Açık bildirme

Bir güvenlik açığı bulduysanız herkese açık sorun (issue) açmayın. GitHub'ın
[özel güvenlik bildirimi](https://github.com/bugragungoz/paratoner-risk-analizi/security/advisories/new)
sayfasını kullanın. Bildirimde açığın nasıl tekrarlanacağını ve etkisini yazın.

Yalnızca en son sürüm için düzeltme yayımlanır.

## Programın güvenlik modeli

- **API anahtarları.** Program hiçbir harita anahtarı içermez. Kullanıcının girdiği Google ve Esri
  anahtarları Windows Kimlik Bilgileri Yöneticisi'nde saklanır; proje dosyasına ya da ayarlara
  yazılmaz. Harita karoları ve arama istekleri Rust tarafında, sağlayıcının resmi uç noktasına
  yapılır; ön yüz bu isteklerde anahtarı görmez. Tek istisna Street View'dur: Google Maps Embed API
  anahtarı adreste istediği için, Street View paneli açıldığında anahtar o çerçevenin adresinde yer alır.
- **Ağ.** Program yalnızca seçilen harita sağlayıcısına (Google, Esri, OpenStreetMap) bağlanır.
  Telemetri, kullanım istatistiği ya da otomatik güncelleme yoktur.
- **Dosyalar.** Proje dosyaları (`.ptproj`) yerel diskte kalır. Açılan dosya çalıştırılmaz;
  doğrulanmış veri olarak okunur.
- **İçerik güvenlik politikası.** Ön yüz sıkı bir CSP ile çalışır; uzaktan betik yüklenmez.

---

# Security

Please report vulnerabilities through GitHub's
[private vulnerability reporting](https://github.com/bugragungoz/paratoner-risk-analizi/security/advisories/new),
not as a public issue. Only the latest release receives fixes.
