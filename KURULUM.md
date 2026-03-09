# 📖 Kurulum Rehberi — Adım Adım

Bu rehber, Minecraft sunucunuzu hiç kod yazmadan yönetim paneline bağlamak için ihtiyacınız olan her şeyi açıklar.

---

## ⚡ En Kolay Yol: Hazır Dosyaları İndir

Kendi bilgisayarınızda derleme yapmak zorunda değilsiniz. GitHub Releases sayfasından hazır dosyaları indirin:

> **👉 [Releases sayfasına git →](../../releases/latest)**

| İndirmeniz gereken dosya | Ne işe yarar? |
|--------------------------|---------------|
| `mcadmin-plugin-1.0.0.jar` | Minecraft sunucusuna yüklenecek plugin |
| `Minecraft Admin Panel Setup X.X.X.exe` | Windows masaüstü uygulaması |
| `Minecraft Admin Panel-X.X.X.AppImage` | Linux masaüstü uygulaması |
| `Minecraft Admin Panel-X.X.X.dmg` | macOS masaüstü uygulaması |

---

## 📋 Bölüm 1 — Plugin Kurulumu (Minecraft Sunucusu)

### Adım 1 — Paper Sunucusunu Hazırlayın

Eğer henüz Paper sunucunuz yoksa:

1. [papermc.io/downloads](https://papermc.io/downloads/paper) sayfasından **Paper 1.20.x veya üzeri** JAR'ını indirin (sunucunuzun Minecraft sürümüne uygun olanı seçin)
2. Yeni bir klasör oluşturun (örnek: `minecraft-server`)
3. JAR dosyasını bu klasöre kopyalayın
4. **Java'yı yükleyin** (aşağıya bakın) ve sunucuyu ilk kez başlatın:
   ```
   java -Xmx2G -jar paper-1.20.4-XXX.jar nogui
   ```
5. `eula.txt` dosyasını açın, `eula=false` satırını `eula=true` yapın
6. Sunucuyu tekrar başlatın — artık çalışıyor!

> **Java 17 Nasıl Yüklenir?**
> - Windows/macOS: [adoptium.net](https://adoptium.net/) → "Latest LTS" → İndir ve kur
> - Linux: `sudo apt install openjdk-17-jdk` (Ubuntu/Debian)

---

### Adım 2 — Plugin JAR Dosyasını Sunucuya Ekleyin

1. [Releases sayfasından](../../releases/latest) `mcadmin-plugin-1.0.0.jar` dosyasını indirin
2. Minecraft sunucu klasörünüzdeki `plugins/` dizinine kopyalayın:
   ```
   minecraft-server/
   └── plugins/
       └── mcadmin-plugin-1.0.0.jar   ← buraya
   ```
3. Sunucuyu yeniden başlatın (veya `/reload confirm` yazın)
4. Konsolda şu mesajı görmelisiniz:
   ```
   [MCAdmin] MCAdmin Plugin başarıyla etkinleştirildi!
   [MCAdmin] WebSocket portu: 8080
   ```

---

### Adım 3 — İlk Token Oluşturun

Token, masaüstü uygulamanın sunucuya güvenli bağlanmasını sağlayan şifredir.

1. Sunucu konsoluna veya oyun içinde OP yetkisiyle şu komutu yazın:
   ```
   /mcadmin generatetoken AdminAdi
   ```
   *Örnek:* `/mcadmin generatetoken Ahmet`

2. Ekranda şuna benzer bir çıktı göreceksiniz:
   ```
   Yeni token oluşturuldu:
   Kullanıcı: Ahmet
   Token: a1b2c3d4e5f6...  (uzun bir kod)
   ```

3. **Bu kodu kopyalayın ve güvenli bir yerde saklayın!** (Not defteri, şifre yöneticisi vb.)

> ⚠️ Token bir daha gösterilmeyecek. Unutursanız yenisini oluşturun.

---

### Adım 4 — Güvenlik Duvarı Ayarı (Uzak Sunucu İçin)

Masaüstü uygulamanızı başka bir bilgisayardan bağlayacaksanız:

**Windows Sunucu:**
1. Başlat menüsünde "Windows Defender Güvenlik Duvarı" ara
2. "Gelişmiş Ayarlar" → "Gelen Kurallar" → "Yeni Kural"
3. Port: **8080**, TCP, İzin Ver

**Linux Sunucu:**
```bash
sudo ufw allow 8080/tcp
```

**Yerel bilgisayarda test ediyorsanız** (sunucu ve uygulama aynı PC'de) bu adımı atlayabilirsiniz.

---

## 📋 Bölüm 2 — Masaüstü Uygulama Kurulumu

### Windows

1. [Releases sayfasından](../../releases/latest) `Minecraft Admin Panel Setup X.X.X.exe` dosyasını indirin
2. Dosyaya çift tıklayın
3. "Bu uygulamayı çalıştırmak istediğinizden emin misiniz?" diye sorarsa **Çalıştır** deyin
4. Kurulum sihirbazını takip edin → **Kur** → **Bitir**
5. Masaüstünde oluşan simgeye çift tıklayarak açın

---

### Linux (Ubuntu/Debian)

1. [Releases sayfasından](../../releases/latest) `.AppImage` dosyasını indirin
2. Terminali açın ve dosyayı çalıştırılabilir yapın:
   ```bash
   chmod +x "Minecraft Admin Panel-*.AppImage"
   ./Minecraft\ Admin\ Panel-*.AppImage
   ```

---

### macOS

1. [Releases sayfasından](../../releases/latest) `.dmg` dosyasını indirin
2. DMG dosyasını açın
3. **Minecraft Admin Panel** simgesini **Applications** klasörüne sürükleyin
4. Launchpad'den veya Applications klasöründen açın
5. İlk açılışta "bilinmeyen geliştirici" uyarısı çıkarsa:
   - Sağ tıklayın → **Aç** → **Aç** deyin

---

## 📋 Bölüm 3 — İlk Bağlantı

Uygulamayı açtığınızda şu ekranı göreceksiniz:

```
┌─────────────────────────────────────┐
│   Minecraft Yönetim Paneli          │
│                                     │
│  Sunucu Adresi:                     │
│  [127.0.0.1:8080]                   │
│                                     │
│  Token:                             │
│  [**************************]       │
│                                     │
│  [ ] Beni Hatırla                   │
│                                     │
│         [  BAĞLAN  ]                │
└─────────────────────────────────────┘
```

1. **Sunucu Adresi** kutusuna girin:
   - Sunucu bilgisayarınızda çalışıyorsa: `127.0.0.1:8080`
   - Başka bir bilgisayarda çalışıyorsa: `192.168.1.100:8080` *(sunucunun IP'si)*
   - Kiralık sunucuda çalışıyorsa: `sunucu-ip-adresi:8080`

2. **Token** kutusuna 3. adımda kopyaladığınız uzun kodu yapıştırın

3. **Beni Hatırla** kutusunu işaretlerseniz bir dahaki seferde otomatik doldurulur

4. **BAĞLAN** butonuna tıklayın

5. Başarılı bağlantıda dashboard açılacak! 🎉

---

## 📋 Bölüm 4 — Kaynaktan Derleme (İleri Kullanım)

Hazır dosyaları kullanmak istemeyip kendiniz derlemek isteyenler için:

### Plugin Derleme

**Gereksinimler:**
- Java 17: [adoptium.net](https://adoptium.net/)
- Maven 3.6+: [maven.apache.org/download](https://maven.apache.org/download.cgi)

```bash
# Repo'yu klonla
git clone https://github.com/eycii/testxx.git
cd testxx/plugin

# Derle
mvn clean package

# JAR dosyası burada:
# plugin/target/mcadmin-plugin-1.0.0.jar
```

### Masaüstü Uygulama Derleme

**Gereksinimler:**
- Node.js 18+: [nodejs.org](https://nodejs.org/) → "LTS" sürümü indir

```bash
cd testxx/desktop-app

# Bağımlılıkları yükle
npm install

# Geliştirme modunda çalıştır (derleme gerektirmez)
npm start

# Veya dağıtılabilir dosya oluştur:
npm run build-win    # Windows (.exe)
npm run build-linux  # Linux (.AppImage)
npm run build-mac    # macOS (.dmg)
```

---

## ❓ Sık Sorulan Sorular

### "WebSocket sunucusu başlatılamadı" hatası alıyorum

Port 8080 başka bir uygulama tarafından kullanılıyor. `plugins/MCAdmin/config.yml` dosyasını açın ve portu değiştirin:
```yaml
websocket:
  port: 8090   # 8080 yerine başka bir port
```

### Masaüstü uygulama "Bağlantı hatası" diyor

- Sunucunun çalıştığından emin olun
- Plugin'in yüklü olduğunu kontrol edin: `/mcadmin status`
- Token'ı doğru kopyaladığınızdan emin olun (başında/sonunda boşluk olmasın)
- 8080 portuna güvenlik duvarı izni verip vermediğinizi kontrol edin

### Token'ımı unuttum

Sunucu konsoluna yazın:
```
/mcadmin generatetoken YeniAdmin
```
Yeni bir token oluşturulur.

### Uygulamayı kapatıp açtığımda tekrar token girmek zorunda kalıyorum

Giriş ekranında **"Beni Hatırla"** kutusunu işaretleyin.

### Birden fazla kişi bağlanabilir mi?

Evet! Her kişi için ayrı token oluşturun:
```
/mcadmin generatetoken Moderatör1
/mcadmin generatetoken Moderatör2
```

### Sunucuyu farklı porta taşıdım, plugin çalışmıyor

`plugins/MCAdmin/config.yml` dosyasındaki `websocket.port` değerini sunucu portuna göre değil WebSocket portuna göre ayarlayın. Bunlar farklı portlar olabilir.

---

## 🆘 Yardım

Sorunuz varsa:
- GitHub [Issues](../../issues) sayfasında yeni bir konu açın
- Türkçe yazmaktan çekinmeyin!
