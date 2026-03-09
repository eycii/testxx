package com.mcadmin.listeners;

import com.mcadmin.McAdminPlugin;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;

/**
 * Oyuncu olayları dinleyicisi
 * Oyuncu giriş/çıkış olaylarını takip eder ve WebSocket üzerinden bildirir
 */
public class PlayerListener implements Listener {

    private final McAdminPlugin plugin;

    public PlayerListener(McAdminPlugin plugin) {
        this.plugin = plugin;
    }

    /**
     * Oyuncu sunucuya katıldığında tetiklenir
     */
    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        String playerName = event.getPlayer().getName();

        // WebSocket üzerinden log yayınla
        if (plugin.getWebSocketServer() != null) {
            plugin.getWebSocketServer().broadcastLog("INFO",
                    playerName + " sunucuya katıldı.");

            // Güncel oyuncu listesini tüm bağlı istemcilere gönder
            // (Küçük gecikme ile - oyuncu tam olarak yüklensin diye)
            plugin.getServer().getScheduler().runTaskLaterAsynchronously(plugin, () -> {
                broadcastPlayerList();
            }, 20L); // 1 saniye gecikme
        }
    }

    /**
     * Oyuncu sunucudan ayrıldığında tetiklenir
     */
    @EventHandler
    public void onPlayerQuit(PlayerQuitEvent event) {
        String playerName = event.getPlayer().getName();

        // WebSocket üzerinden log yayınla
        if (plugin.getWebSocketServer() != null) {
            plugin.getWebSocketServer().broadcastLog("INFO",
                    playerName + " sunucudan ayrıldı.");

            // Güncel oyuncu listesini gönder
            broadcastPlayerList();
        }
    }

    /**
     * Güncel oyuncu listesini WebSocket üzerinden yayınlar
     */
    private void broadcastPlayerList() {
        if (plugin.getWebSocketServer() == null) return;

        com.google.gson.JsonObject playerUpdate = new com.google.gson.JsonObject();
        playerUpdate.addProperty("type", "playerUpdate");
        playerUpdate.addProperty("onlineCount", plugin.getServer().getOnlinePlayers().size());

        com.google.gson.Gson gson = new com.google.gson.Gson();
        java.util.List<com.google.gson.JsonObject> playerList = new java.util.ArrayList<>();

        for (org.bukkit.entity.Player player : plugin.getServer().getOnlinePlayers()) {
            com.google.gson.JsonObject playerData = new com.google.gson.JsonObject();
            playerData.addProperty("uuid", player.getUniqueId().toString());
            playerData.addProperty("name", player.getName());
            playerData.addProperty("health", player.getHealth());
            playerData.addProperty("gamemode", player.getGameMode().name());
            playerData.addProperty("isMuted",
                    plugin.getMuteManager().isMuted(player.getUniqueId()));
            playerList.add(playerData);
        }

        playerUpdate.add("players", gson.toJsonTree(playerList));
        plugin.getWebSocketServer().broadcast(gson.toJson(playerUpdate));
    }
}
