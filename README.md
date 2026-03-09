# 🎮 Minecraft Paper Sunucu Yönetim Sistemi

Paper Minecraft sunucuları için **WebSocket tabanlı** tam özellikli yönetim sistemi. Masaüstü uygulaması üzerinden sunucunuzu kolayca yönetin.

## ✨ Özellikler

### 🔌 Paper Plugin
- **WebSocket API Sunucusu** - Gerçek zamanlı masaüstü uygulama bağlantısı
- **Token Tabanlı Kimlik Doğrulama** - Güvenli erişim kontrolü
- **Oyuncu Yönetimi** - Online oyuncu listesi, bilgileri ve hızlı işlemler
- **Mute Sistemi** - Süreli/kalıcı mute, sebep kaydetme, kalıcı depolama
- **Item Verme** - Enchantment, custom isim, lore desteği
- **Mesajlaşma** - Broadcast, özel mesaj, title, action bar
- **Canlı Log Akışı** - Tüm sunucu olayları masaüstüne iletilir
- **Yetki Sistemi** - Granüler izin kontrolü

### 🖥️ Electron Masaüstü Uygulaması
- **Modern Dark/Light Tema** - Göz dostu arayüz
- **Gerçek Zamanlı Oyuncu Listesi** - Anlık güncelleme
- **Mute Yönetimi** - Hızlı mute/unmute paneli
- **Item Verme Paneli** - Arama, enchantment, kit sistemi
- **Mesaj Merkezi** - Renk kodları, şablonlar
- **Canlı Log Görüntüleyici** - Filtreleme, arama, dışa aktarma
- **Otomatik Yeniden Bağlanma** - Bağlantı koptuğunda otomatik deneme
- **Beni Hatırla** - Token ve sunucu bilgilerini kaydetme

## 📁 Proje Yapısı

```
testxx/
├── plugin/                          # Paper Plugin (Java/Maven)
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/mcadmin/
│       │   ├── McAdminPlugin.java   # Ana plugin sınıfı
│       │   ├── websocket/
│       │   │   ├── McAdminWebSocketServer.java
│       │   │   └── ActionHandler.java
│       │   ├── managers/
│       │   │   └── MuteManager.java
│       │   ├── commands/
│       │   │   ├── McAdminCommand.java
│       │   │   ├── MuteCommand.java
│       │   │   ├── UnmuteCommand.java
│       │   │   └── MuteListCommand.java
│       │   └── listeners/
│       │       ├── ChatListener.java
│       │       └── PlayerListener.java
│       └── resources/
│           ├── plugin.yml
│           └── config.yml
│
├── desktop-app/                     # Electron Masaüstü Uygulaması
│   ├── package.json
│   ├── main.js                      # Electron ana process
│   ├── preload.js                   # Güvenli köprü
│   └── renderer/
│       ├── index.html               # Giriş sayfası
│       ├── dashboard.html           # Ana panel
│       ├── css/
│       │   └── style.css
│       └── js/
│           ├── connection.js        # WebSocket istemcisi
│           ├── dashboard.js         # Panel yönetimi
│           └── utils.js             # Yardımcı fonksiyonlar
│
└── README.md
```

## 🛠️ Sistem Gereksinimleri

| Bileşen | Gereksinim |
|---------|-----------|
| Minecraft Sunucu | Paper 1.20.x veya üzeri |
| Java | 17 veya üzeri |
| Maven | 3.6 veya üzeri |
| Node.js | 18 veya üzeri |
| npm | 8 veya üzeri |

## 🚀 Kurulum

### 1. Plugin Kurulumu

**Gerekli araçlar:** Java 17+, Maven 3.6+

```bash
# Plugin dizinine git
cd plugin

# Maven ile derle (JAR oluştur)
mvn clean package

# Çıktı: target/mcadmin-plugin-1.0.0.jar
```

**Paper sunucusuna yükle:**
1. `target/mcadmin-plugin-1.0.0.jar` dosyasını Paper sunucunuzun `plugins/` dizinine kopyalayın
2. Sunucuyu başlatın (otomatik olarak `plugins/MCAdmin/config.yml` oluşturulur)
3. İlk token oluşturun:
   ```
   /mcadmin generatetoken AdminAdi
   ```
4. Token'ı bir yere not edin (tekrar görüntülenemez!)

### 2. Masaüstü Uygulama Kurulumu

**Gerekli araçlar:** Node.js 18+

```bash
# Masaüstü uygulama dizinine git
cd desktop-app

# Bağımlılıkları yükle
npm install

# Uygulamayı başlat (geliştirme modu)
npm start
```

**Dağıtılabilir dosya oluştur:**
```bash
# Windows için
npm run build-win

# macOS için
npm run build-mac

# Linux için
npm run build-linux

# Tüm platformlar
npm run build
```

## 💻 Kullanım

### İlk Bağlantı

1. Masaüstü uygulamayı başlatın
2. **Sunucu Adresi** alanına Paper sunucunuzun IP:Port bilgisini girin
   - Örnek: `192.168.1.100:8080` veya `127.0.0.1:8080` (yerel)
3. **Token** alanına plugin'den oluşturduğunuz token'ı girin
4. **Bağlan** butonuna tıklayın

### Plugin Komutları

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `/mcadmin` | Ana komut ve yardım menüsü | `mcadmin.use` |
| `/mcadmin reload` | Config dosyasını yeniden yükle | `mcadmin.admin` |
| `/mcadmin generatetoken <kullanıcı>` | Yeni API token oluştur | `mcadmin.admin` |
| `/mcadmin status` | Plugin durumu ve bağlı istemciler | `mcadmin.use` |
| `/mute <oyuncu> <süre> <sebep>` | Oyuncuyu mute et | `mcadmin.mute` |
| `/unmute <oyuncu>` | Mute'u kaldır | `mcadmin.mute` |
| `/mutelist` | Mute'lu oyuncuları listele | `mcadmin.mute` |

### Süre Formatları

| Format | Açıklama |
|--------|----------|
| `5s` | 5 saniye |
| `5m` | 5 dakika |
| `1h` | 1 saat |
| `2d` | 2 gün |
| `permanent` veya `perm` | Kalıcı |

### Yetki Sistemi

| Yetki | Açıklama |
|-------|----------|
| `mcadmin.use` | Temel kullanım |
| `mcadmin.mute` | Mute/unmute yetkisi |
| `mcadmin.mute.bypass` | Mute'tan muafiyet |
| `mcadmin.items` | Item verme yetkisi |
| `mcadmin.message` | Mesaj gönderme |
| `mcadmin.admin` | Tüm yetkiler + token oluşturma |

> **Not:** OP olan oyuncular otomatik olarak `mcadmin.admin` yetkisine sahip olur.

## ⚙️ Config Dosyası

`plugins/MCAdmin/config.yml`:

```yaml
# WebSocket Ayarları
websocket:
  enabled: true
  port: 8080          # Port numarası
  host: "0.0.0.0"    # 0.0.0.0 = tüm arayüzler, veya belirli IP

# Güvenlik
security:
  tokens:
    - token: "token-buraya"
      username: "Admin"
      permissions:
        - "admin"           # admin = tüm yetkiler
    - token: "baska-token"
      username: "Moderatör"
      permissions:
        - "use"
        - "mute"
        - "message"

# Mute Ayarları
mute:
  save-to-file: true       # Sunucu yeniden başladığında mute'ları hatırla
  default-duration: "1h"   # Varsayılan süre

# Mesaj Formatları (&a, &c gibi renk kodları kullanılabilir)
messages:
  mute-message: "&cSusturuldunuz! Sebep: {reason}"
  unmute-message: "&aArtık konuşabilirsiniz!"
  broadcast-prefix: "&6[DUYURU] &f"
```

## 🔐 WebSocket API

Plugin, `ws://sunucu-ip:8080` adresinde WebSocket sunucusu başlatır.

### Kimlik Doğrulama

```json
// İstemci → Sunucu
{ "type": "auth", "token": "token-burada" }

// Sunucu → İstemci (başarılı)
{
  "type": "auth",
  "success": true,
  "username": "Admin",
  "permissions": ["admin"]
}
```

### Online Oyuncu Listesi

```json
// İstemci → Sunucu
{ "type": "action", "action": "getPlayers" }

// Sunucu → İstemci
{
  "type": "players",
  "data": [
    {
      "uuid": "...",
      "name": "PlayerName",
      "health": 20,
      "location": "world, 100, 64, 200",
      "gamemode": "SURVIVAL",
      "isMuted": false
    }
  ]
}
```

### Mute Etme

```json
// İstemci → Sunucu
{
  "type": "action",
  "action": "mutePlayer",
  "player": "PlayerName",
  "duration": "1h",
  "reason": "Spam"
}
```

### Item Verme

```json
// İstemci → Sunucu
{
  "type": "action",
  "action": "giveItem",
  "player": "PlayerName",
  "item": "DIAMOND_SWORD",
  "amount": 1,
  "displayName": "Efsanevi Kılıç",
  "lore": ["Güçlü bir silah"],
  "enchantments": {
    "SHARPNESS": 5,
    "UNBREAKING": 3
  }
}
```

### Mesaj Gönderme

```json
// İstemci → Sunucu
{
  "type": "action",
  "action": "broadcast",
  "message": "&6Sunucu duyurusu!",
  "type": "chat"
}
```

## 🔒 Güvenlik

- **Token Tabanlı Kimlik Doğrulama** - Her bağlantı token doğrulaması yapar
- **Yetki Kontrolü** - Her işlem yetki kontrolünden geçer
- **Rate Limiting** - Saniyede maksimum 20 mesaj sınırı (spam koruması)
- **Auth Timeout** - 30 saniye içinde kimlik doğrulaması yapılmazsa bağlantı kapatılır
- **Context Isolation** - Electron'da Node.js render tarafında erişilemez
- **Content Security Policy** - XSS koruması

## 🛠️ Sorun Giderme

### Plugin Başlamıyor

```
SEVERE: WebSocket sunucusu başlatılamadı!
```

**Çözüm:** Port 8080 başka bir uygulama tarafından kullanılıyor olabilir.  
`config.yml` dosyasında `websocket.port` değerini değiştirin.

### Masaüstü Uygulama Bağlanamıyor

1. Paper sunucusunun çalıştığından emin olun
2. MCAdmin plugin'inin yüklü ve aktif olduğunu kontrol edin (`/mcadmin status`)
3. Güvenlik duvarında 8080 portuna izin verildiğini kontrol edin
4. Uzak sunucuya bağlanıyorsanız, sunucu `host: "0.0.0.0"` olarak ayarlanmalı

### Token Geçersiz

1. Token'ı kopyalarken fazladan boşluk olmadığından emin olun
2. Yeni token oluşturun: `/mcadmin generatetoken YeniKullanici`

### Mute Veriler Kayboldu

`config.yml` dosyasında `mute.save-to-file: true` olduğundan emin olun.

## 📊 Renk Kodları

Chat mesajları ve duyurularda `&` renk kodları kullanabilirsiniz:

| Kod | Renk |
|-----|------|
| `&0` | Siyah |
| `&1` | Koyu Mavi |
| `&2` | Koyu Yeşil |
| `&3` | Koyu Camgöbeği |
| `&4` | Koyu Kırmızı |
| `&5` | Koyu Mor |
| `&6` | Altın |
| `&7` | Gri |
| `&8` | Koyu Gri |
| `&9` | Mavi |
| `&a` | Yeşil |
| `&b` | Camgöbeği |
| `&c` | Kırmızı |
| `&d` | Açık Mor |
| `&e` | Sarı |
| `&f` | Beyaz |
| `&l` | **Kalın** |
| `&o` | *İtalik* |
| `&n` | Altı Çizgili |
| `&r` | Sıfırla |

## 📝 Lisans

MIT License - Özgürce kullanabilir, değiştirebilir ve dağıtabilirsiniz.

---

> 💡 **İpucu:** Token'larınızı güvende tutun! Token ele geçirilirse, yetkisi olan herkes sunucunuzu yönetebilir. Şüpheli durumlarda `/mcadmin generatetoken` ile yeni token oluşturun ve config'den eski token'ı silin.