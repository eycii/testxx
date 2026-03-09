package com.mcadmin.websocket;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mcadmin.McAdminPlugin;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;

/**
 * MCAdmin WebSocket Sunucusu
 * Masaüstü uygulamasından gelen bağlantıları kabul eder ve işler
 */
public class McAdminWebSocketServer extends WebSocketServer {

    private final McAdminPlugin plugin;
    private final Gson gson;

    // Bağlı ve kimlik doğrulaması yapılmış istemciler
    // WebSocket -> TokenBilgisi (kullanıcı adı, yetkiler)
    private final Map<WebSocket, AuthenticatedClient> authenticatedClients;

    // Kimlik doğrulama bekleme durumundaki istemciler
    private final Map<WebSocket, Long> pendingClients;

    // Kimlik doğrulama zaman aşımı (ms)
    private static final long AUTH_TIMEOUT_MS = 30_000;

    // Rate limiting - istemci başına saniyede maksimum mesaj sayısı
    private static final int MAX_MESSAGES_PER_SECOND = 20;
    private final Map<WebSocket, RateLimiter> rateLimiters;

    /**
     * Kimlik doğrulaması yapılmış istemci bilgilerini tutan sınıf
     */
    public static class AuthenticatedClient {
        public final String username;
        public final java.util.List<String> permissions;
        public final long connectedAt;

        public AuthenticatedClient(String username, java.util.List<String> permissions) {
            this.username = username;
            this.permissions = permissions;
            this.connectedAt = System.currentTimeMillis();
        }

        /**
         * İstemcinin belirli bir yetkiye sahip olup olmadığını kontrol eder
         */
        public boolean hasPermission(String permission) {
            return permissions.contains("admin") || permissions.contains(permission);
        }
    }

    /**
     * Rate limiter - spam koruması için
     */
    private static class RateLimiter {
        private int count;
        private long windowStart;

        public RateLimiter() {
            this.count = 0;
            this.windowStart = System.currentTimeMillis();
        }

        public boolean isAllowed() {
            long now = System.currentTimeMillis();
            if (now - windowStart >= 1000) {
                // Yeni pencere başlat
                count = 0;
                windowStart = now;
            }
            count++;
            return count <= MAX_MESSAGES_PER_SECOND;
        }
    }

    public McAdminWebSocketServer(McAdminPlugin plugin, String host, int port) {
        super(new InetSocketAddress(host, port));
        this.plugin = plugin;
        this.gson = new Gson();
        this.authenticatedClients = new ConcurrentHashMap<>();
        this.pendingClients = new ConcurrentHashMap<>();
        this.rateLimiters = new ConcurrentHashMap<>();
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        // Yeni bağlantıyı kimlik doğrulama bekleme listesine ekle
        pendingClients.put(conn, System.currentTimeMillis());
        rateLimiters.put(conn, new RateLimiter());

        plugin.getLogger().info("Yeni bağlantı: " + conn.getRemoteSocketAddress());

        // İstemciye kimlik doğrulama gerektiğini bildir
        JsonObject response = new JsonObject();
        response.addProperty("type", "connected");
        response.addProperty("message", "Kimlik doğrulama gerekli. Token gönderin.");
        conn.send(gson.toJson(response));

        // Zaman aşımı kontrolü için zamanlanmış görev
        plugin.getServer().getScheduler().runTaskLaterAsynchronously(plugin, () -> {
            if (pendingClients.containsKey(conn) && conn.isOpen()) {
                JsonObject timeoutMsg = new JsonObject();
                timeoutMsg.addProperty("type", "error");
                timeoutMsg.addProperty("message", "Kimlik doğrulama zaman aşımı. Bağlantı kapatılıyor.");
                conn.send(gson.toJson(timeoutMsg));
                conn.close(1008, "Kimlik doğrulama zaman aşımı");
            }
        }, AUTH_TIMEOUT_MS / 50); // Bukkit ticks (20 ticks/s, so ms/50 = ticks)
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        String clientInfo = "bilinmiyor";
        if (authenticatedClients.containsKey(conn)) {
            clientInfo = authenticatedClients.get(conn).username;
        }

        // Temizleme
        authenticatedClients.remove(conn);
        pendingClients.remove(conn);
        rateLimiters.remove(conn);

        plugin.getLogger().info("Bağlantı kapatıldı [" + clientInfo + "]: " + reason);
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        // Rate limiting kontrolü
        RateLimiter limiter = rateLimiters.get(conn);
        if (limiter != null && !limiter.isAllowed()) {
            sendError(conn, "Çok fazla istek gönderdiniz. Lütfen bekleyin.");
            return;
        }

        try {
            JsonObject json = JsonParser.parseString(message).getAsJsonObject();
            String type = json.get("type").getAsString();

            if ("auth".equals(type)) {
                // Kimlik doğrulama isteği
                handleAuth(conn, json);
            } else if ("action".equals(type)) {
                // İşlem isteği - kimlik doğrulaması gerekli
                if (!authenticatedClients.containsKey(conn)) {
                    sendError(conn, "Kimlik doğrulaması yapılmadı. Önce token gönderin.");
                    return;
                }
                handleAction(conn, json);
            } else {
                sendError(conn, "Bilinmeyen mesaj tipi: " + type);
            }

        } catch (Exception e) {
            plugin.getLogger().log(Level.WARNING, "Mesaj işlenemedi: " + message, e);
            sendError(conn, "Geçersiz mesaj formatı.");
        }
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        plugin.getLogger().log(Level.WARNING, "WebSocket hatası", ex);
    }

    @Override
    public void onStart() {
        plugin.getLogger().info("WebSocket sunucusu dinlemeye başladı.");
    }

    /**
     * Kimlik doğrulama isteğini işler
     */
    private void handleAuth(WebSocket conn, JsonObject json) {
        if (!json.has("token")) {
            sendAuthFailure(conn, "Token eksik.");
            return;
        }

        String token = json.get("token").getAsString();
        AuthResult result = validateToken(token);

        if (result == null) {
            sendAuthFailure(conn, "Geçersiz token.");
            plugin.getLogger().warning("Geçersiz token ile bağlantı girişimi: " + conn.getRemoteSocketAddress());
            conn.close(1008, "Geçersiz token");
            return;
        }

        // Kimlik doğrulama başarılı
        pendingClients.remove(conn);
        authenticatedClients.put(conn, new AuthenticatedClient(result.username, result.permissions));

        JsonObject response = new JsonObject();
        response.addProperty("type", "auth");
        response.addProperty("success", true);
        response.addProperty("username", result.username);
        response.add("permissions", gson.toJsonTree(result.permissions));
        conn.send(gson.toJson(response));

        plugin.getLogger().info(result.username + " başarıyla kimlik doğruladı.");
    }

    /**
     * Token doğrulama - config.yml'deki tokenlarla karşılaştırır
     */
    private AuthResult validateToken(String token) {
        java.util.List<java.util.Map<?, ?>> tokens = plugin.getConfig().getMapList("security.tokens");

        for (java.util.Map<?, ?> tokenEntry : tokens) {
            String configToken = (String) tokenEntry.get("token");
            if (token.equals(configToken)) {
                String username = (String) tokenEntry.get("username");
                @SuppressWarnings("unchecked")
                java.util.List<String> permissions = (java.util.List<String>) tokenEntry.get("permissions");
                return new AuthResult(username, permissions);
            }
        }
        return null;
    }

    /**
     * İşlem isteğini işler
     */
    private void handleAction(WebSocket conn, JsonObject json) {
        if (!json.has("action")) {
            sendError(conn, "İşlem belirtilmedi.");
            return;
        }

        String action = json.get("action").getAsString();
        AuthenticatedClient client = authenticatedClients.get(conn);

        // Ana thread'de Bukkit API çağrısı için scheduler kullan
        plugin.getServer().getScheduler().runTask(plugin, () -> {
            ActionHandler handler = new ActionHandler(plugin, conn, client, gson);
            handler.handle(action, json);
        });
    }

    // --- Yardımcı metodlar ---

    /**
     * Hata mesajı gönderir
     */
    private void sendError(WebSocket conn, String message) {
        JsonObject error = new JsonObject();
        error.addProperty("type", "error");
        error.addProperty("message", message);
        if (conn.isOpen()) {
            conn.send(gson.toJson(error));
        }
    }

    /**
     * Kimlik doğrulama başarısız mesajı gönderir
     */
    private void sendAuthFailure(WebSocket conn, String reason) {
        JsonObject response = new JsonObject();
        response.addProperty("type", "auth");
        response.addProperty("success", false);
        response.addProperty("message", reason);
        if (conn.isOpen()) {
            conn.send(gson.toJson(response));
        }
    }

    /**
     * Tüm bağlı ve kimlik doğrulaması yapılmış istemcilere mesaj yayınlar
     */
    public void broadcast(String message) {
        for (WebSocket conn : authenticatedClients.keySet()) {
            if (conn.isOpen()) {
                conn.send(message);
            }
        }
    }

    /**
     * Log mesajı yayınlar
     */
    public void broadcastLog(String level, String message) {
        JsonObject log = new JsonObject();
        log.addProperty("type", "log");
        log.addProperty("level", level);
        log.addProperty("message", message);
        log.addProperty("timestamp", System.currentTimeMillis());
        broadcast(gson.toJson(log));
    }

    /**
     * Bağlı ve kimlik doğrulaması yapılmış istemci sayısını döndürür
     */
    public int getAuthenticatedClientCount() {
        return authenticatedClients.size();
    }

    /**
     * Bağlı istemci bilgilerini döndürür
     */
    public Map<WebSocket, AuthenticatedClient> getAuthenticatedClients() {
        return new HashMap<>(authenticatedClients);
    }

    // --- İç sınıflar ---

    /**
     * Token doğrulama sonucunu tutan sınıf
     */
    private static class AuthResult {
        final String username;
        final java.util.List<String> permissions;

        AuthResult(String username, java.util.List<String> permissions) {
            this.username = username;
            this.permissions = permissions;
        }
    }
}
