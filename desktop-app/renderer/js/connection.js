/**
 * WebSocket Bağlantı Yöneticisi (connection.js)
 * Minecraft sunucusu ile WebSocket bağlantısını yönetir
 */

class ServerConnection {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.authenticated = false;
        this.listeners = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000; // ms
        this.reconnectTimer = null;
        this.autoReconnect = true;
        this.connectionCallbacks = null;

        // Bağlantı bilgileri
        this.host = null;
        this.port = null;
        this.token = null;

        // Kullanıcı bilgileri
        this.username = null;
        this.permissions = [];

        // Bağlantı başlangıç zamanı
        this.connectedAt = null;
    }

    /**
     * Sunucuya WebSocket bağlantısı kurar
     * @param {string} host - Sunucu IP adresi
     * @param {number} port - Port numarası
     * @param {string} token - Kimlik doğrulama token'ı
     * @param {Object} callbacks - Callback fonksiyonları
     * @returns {Promise} - Bağlantı sonucu
     */
    connect(host, port, token, callbacks = {}) {
        this.host = host;
        this.port = port;
        this.token = token;
        this.connectionCallbacks = callbacks;

        return new Promise((resolve, reject) => {
            try {
                const wsUrl = `ws://${host}:${port}`;

                if (callbacks.onStatusUpdate) {
                    callbacks.onStatusUpdate(`${wsUrl} adresine bağlanılıyor...`);
                }

                this.ws = new WebSocket(wsUrl);

                // Bağlantı zaman aşımı
                const connectionTimeout = setTimeout(() => {
                    if (!this.connected) {
                        this.ws.close();
                        const error = 'Bağlantı zaman aşımı (10 saniye)';
                        if (callbacks.onError) callbacks.onError(error);
                        reject(new Error(error));
                    }
                }, 10000);

                this.ws.onopen = () => {
                    clearTimeout(connectionTimeout);
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    console.log('WebSocket bağlantısı kuruldu:', wsUrl);
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this._handleMessage(data, callbacks, resolve, reject);
                    } catch (e) {
                        console.error('Mesaj parse hatası:', e);
                    }
                };

                this.ws.onclose = (event) => {
                    clearTimeout(connectionTimeout);
                    this.connected = false;
                    this.authenticated = false;
                    console.log('WebSocket bağlantısı kapatıldı:', event.code, event.reason);

                    // Bağlantı kesme olayını tetikle
                    this._emit('disconnect', { code: event.code, reason: event.reason });

                    // Otomatik yeniden bağlan
                    if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this._scheduleReconnect();
                    }
                };

                this.ws.onerror = (error) => {
                    clearTimeout(connectionTimeout);
                    console.error('WebSocket hatası:', error);
                    const errorMsg = 'Bağlantı hatası. Sunucu adresi ve portunu kontrol edin.';
                    if (callbacks.onError) callbacks.onError(errorMsg);
                    reject(new Error(errorMsg));
                };

            } catch (error) {
                const errorMsg = 'WebSocket oluşturma hatası: ' + error.message;
                if (callbacks.onError) callbacks.onError(errorMsg);
                reject(new Error(errorMsg));
            }
        });
    }

    /**
     * Gelen mesajları işler
     */
    _handleMessage(data, callbacks, resolve, reject) {
        switch (data.type) {
            case 'connected':
                // Kimlik doğrulama isteğini gönder
                this.send({ type: 'auth', token: this.token });
                if (callbacks.onStatusUpdate) {
                    callbacks.onStatusUpdate('Token doğrulanıyor...');
                }
                break;

            case 'auth':
                if (data.success) {
                    this.authenticated = true;
                    this.username = data.username;
                    this.permissions = data.permissions || [];
                    this.connectedAt = Date.now();

                    console.log('Kimlik doğrulama başarılı:', data.username);

                    if (callbacks.onStatusUpdate) {
                        callbacks.onStatusUpdate('Kimlik doğrulama başarılı!');
                    }
                    if (callbacks.onSuccess) {
                        callbacks.onSuccess(data);
                    }

                    // Bağlantı bilgilerini global olarak kaydet
                    window.currentUser = {
                        username: data.username,
                        permissions: data.permissions || []
                    };

                    resolve(data);
                } else {
                    const error = 'Kimlik doğrulama başarısız: ' + (data.message || 'Geçersiz token');
                    if (callbacks.onError) callbacks.onError(error);
                    reject(new Error(error));
                }
                break;

            case 'error':
                console.error('Sunucu hatası:', data.message);
                this._emit('error', data);
                break;

            default:
                // Diğer mesajları event listener'lara ilet
                this._emit(data.type, data);
                this._emit('message', data);
                break;
        }
    }

    /**
     * Bağlantıyı kapatır
     */
    disconnect() {
        this.autoReconnect = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        if (this.ws) {
            this.ws.close(1000, 'Kullanıcı bağlantıyı kesti');
        }
        this.connected = false;
        this.authenticated = false;
    }

    /**
     * JSON mesaj gönderir
     * @param {Object} data - Gönderilecek veri
     */
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket bağlı değil, mesaj gönderilemedi');
        }
    }

    /**
     * Event listener ekler
     * @param {string} event - Olay adı
     * @param {Function} callback - Callback fonksiyonu
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * Event listener kaldırır
     */
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Olayı tetikler
     */
    _emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error('Event listener hatası:', e);
                }
            });
        }
    }

    /**
     * Yeniden bağlanmayı planlar
     */
    _scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 3);

        console.log(`Yeniden bağlanma denemesi ${this.reconnectAttempts}/${this.maxReconnectAttempts} - ${delay}ms sonra`);

        this._emit('reconnecting', {
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            delay: delay
        });

        this.reconnectTimer = setTimeout(() => {
            if (!this.connected && this.host && this.port && this.token) {
                this.connect(this.host, this.port, this.token, this.connectionCallbacks)
                    .catch(() => {
                        // Hata loglandı, yeniden deneme devam eder
                    });
            }
        }, delay);
    }

    // --- API Metodları ---

    /**
     * Online oyuncu listesini ister
     */
    getPlayers() {
        this.send({ type: 'action', action: 'getPlayers' });
    }

    /**
     * Oyuncuyu mute eder
     * @param {string} player - Oyuncu adı
     * @param {string} duration - Süre (5m, 1h, 1d, permanent)
     * @param {string} reason - Sebep
     */
    mutePlayer(player, duration, reason) {
        this.send({
            type: 'action',
            action: 'mutePlayer',
            player,
            duration,
            reason
        });
    }

    /**
     * Oyuncunun mute'unu kaldırır
     * @param {string} player - Oyuncu adı
     */
    unmutePlayer(player) {
        this.send({
            type: 'action',
            action: 'unmutePlayer',
            player
        });
    }

    /**
     * Mute'lu oyuncuları ister
     */
    getMutedPlayers() {
        this.send({ type: 'action', action: 'getMutedPlayers' });
    }

    /**
     * Oyuncuya item verir
     * @param {string} player - Oyuncu adı
     * @param {string} item - Item adı (DIAMOND_SWORD vs.)
     * @param {number} amount - Miktar (1-64)
     * @param {Object} options - Ek seçenekler (displayName, lore, enchantments)
     */
    giveItem(player, item, amount, options = {}) {
        this.send({
            type: 'action',
            action: 'giveItem',
            player,
            item,
            amount,
            ...options
        });
    }

    /**
     * Mesaj gönderir
     * @param {string} target - Hedef ('all' veya oyuncu adı)
     * @param {string} message - Mesaj
     * @param {string} messageType - Mesaj tipi ('chat', 'title', 'actionbar')
     */
    sendMessage(target, message, messageType = 'chat') {
        this.send({
            type: 'action',
            action: target === 'all' ? 'broadcast' : 'sendMessage',
            target,
            message,
            messageType
        });
    }

    /**
     * Tüm oyunculara duyuru gönderir
     * @param {string} message - Mesaj
     * @param {string} messageType - Mesaj tipi
     */
    broadcast(message, messageType = 'chat') {
        this.send({
            type: 'action',
            action: 'broadcast',
            message,
            type: messageType
        });
    }

    /**
     * Yetki kontrolü
     * @param {string} permission - Yetki adı
     * @returns {boolean}
     */
    hasPermission(permission) {
        return this.permissions.includes('admin') || this.permissions.includes(permission);
    }

    /**
     * Bağlantı süresini okunabilir formatta döndürür
     */
    getUptimeFormatted() {
        if (!this.connectedAt) return '-';
        const elapsed = Date.now() - this.connectedAt;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
}
