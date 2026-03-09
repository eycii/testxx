package com.mcadmin;

import com.mcadmin.commands.McAdminCommand;
import com.mcadmin.commands.MuteCommand;
import com.mcadmin.commands.MuteListCommand;
import com.mcadmin.commands.UnmuteCommand;
import com.mcadmin.listeners.ChatListener;
import com.mcadmin.listeners.PlayerListener;
import com.mcadmin.managers.MuteManager;
import com.mcadmin.websocket.McAdminWebSocketServer;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.logging.Level;

/**
 * MCAdmin Plugin - Ana sınıf
 * Minecraft Paper sunucusu için WebSocket tabanlı yönetim sistemi
 */
public class McAdminPlugin extends JavaPlugin {

    // Tekil örnek (singleton)
    private static McAdminPlugin instance;

    // Yönetici sınıflar
    private MuteManager muteManager;
    private McAdminWebSocketServer webSocketServer;

    @Override
    public void onEnable() {
        instance = this;

        // Varsayılan config dosyasını oluştur
        saveDefaultConfig();

        // Mute yöneticisini başlat
        muteManager = new MuteManager(this);
        muteManager.loadMutes();

        // WebSocket sunucusunu başlat (config'de etkinleştirilmişse)
        if (getConfig().getBoolean("websocket.enabled", true)) {
            startWebSocketServer();
        } else {
            getLogger().info("WebSocket sunucusu config'de devre dışı bırakılmış.");
        }

        // Komutları kaydet
        registerCommands();

        // Dinleyicileri kaydet
        registerListeners();

        getLogger().info("MCAdmin Plugin başarıyla etkinleştirildi!");
        getLogger().info("WebSocket portu: " + getConfig().getInt("websocket.port", 8080));
    }

    @Override
    public void onDisable() {
        // Mute verilerini kaydet
        if (muteManager != null) {
            muteManager.saveMutes();
        }

        // WebSocket sunucusunu durdur
        if (webSocketServer != null) {
            try {
                webSocketServer.stop(1000);
                getLogger().info("WebSocket sunucusu durduruldu.");
            } catch (InterruptedException e) {
                getLogger().log(Level.WARNING, "WebSocket sunucusu durdurulurken hata oluştu.", e);
                Thread.currentThread().interrupt();
            }
        }

        getLogger().info("MCAdmin Plugin devre dışı bırakıldı.");
    }

    /**
     * WebSocket sunucusunu başlatır
     */
    private void startWebSocketServer() {
        try {
            int port = getConfig().getInt("websocket.port", 8080);
            String host = getConfig().getString("websocket.host", "0.0.0.0");

            webSocketServer = new McAdminWebSocketServer(this, host, port);
            webSocketServer.start();

            getLogger().info("WebSocket sunucusu başlatıldı: " + host + ":" + port);
        } catch (Exception e) {
            getLogger().log(Level.SEVERE, "WebSocket sunucusu başlatılamadı!", e);
        }
    }

    /**
     * Plugin komutlarını kaydet
     */
    private void registerCommands() {
        getCommand("mcadmin").setExecutor(new McAdminCommand(this));
        getCommand("mute").setExecutor(new MuteCommand(this));
        getCommand("unmute").setExecutor(new UnmuteCommand(this));
        getCommand("mutelist").setExecutor(new MuteListCommand(this));
    }

    /**
     * Event dinleyicilerini kaydet
     */
    private void registerListeners() {
        getServer().getPluginManager().registerEvents(new ChatListener(this), this);
        getServer().getPluginManager().registerEvents(new PlayerListener(this), this);
    }

    /**
     * Config dosyasını yeniden yükler
     */
    public void reloadPluginConfig() {
        reloadConfig();
        getLogger().info("Config dosyası yeniden yüklendi.");
    }

    // --- Getter metodları ---

    public static McAdminPlugin getInstance() {
        return instance;
    }

    public MuteManager getMuteManager() {
        return muteManager;
    }

    public McAdminWebSocketServer getWebSocketServer() {
        return webSocketServer;
    }
}
