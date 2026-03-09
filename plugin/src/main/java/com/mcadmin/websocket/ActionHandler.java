package com.mcadmin.websocket;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.mcadmin.McAdminPlugin;
import com.mcadmin.managers.MuteManager;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer;
import org.bukkit.Bukkit;
import org.bukkit.GameMode;
import org.bukkit.Material;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.java_websocket.WebSocket;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;

/**
 * WebSocket üzerinden gelen işlem isteklerini işleyen sınıf
 */
public class ActionHandler {

    private final McAdminPlugin plugin;
    private final WebSocket conn;
    private final McAdminWebSocketServer.AuthenticatedClient client;
    private final Gson gson;

    public ActionHandler(McAdminPlugin plugin, WebSocket conn,
                         McAdminWebSocketServer.AuthenticatedClient client, Gson gson) {
        this.plugin = plugin;
        this.conn = conn;
        this.client = client;
        this.gson = gson;
    }

    /**
     * İşlem isteğini yönlendirir
     */
    public void handle(String action, JsonObject json) {
        switch (action) {
            case "getPlayers" -> handleGetPlayers();
            case "mutePlayer" -> handleMutePlayer(json);
            case "unmutePlayer" -> handleUnmutePlayer(json);
            case "getMutedPlayers" -> handleGetMutedPlayers();
            case "giveItem" -> handleGiveItem(json);
            case "sendMessage" -> handleSendMessage(json);
            case "broadcast" -> handleBroadcast(json);
            default -> sendResponse(action, false, "Bilinmeyen işlem: " + action);
        }
    }

    /**
     * Online oyuncu listesini döndürür
     */
    private void handleGetPlayers() {
        if (!client.hasPermission("use")) {
            sendResponse("getPlayers", false, "Yetkiniz yok.");
            return;
        }

        JsonObject response = new JsonObject();
        response.addProperty("type", "players");

        List<JsonObject> playerList = new ArrayList<>();
        for (Player player : Bukkit.getOnlinePlayers()) {
            JsonObject playerData = new JsonObject();
            playerData.addProperty("uuid", player.getUniqueId().toString());
            playerData.addProperty("name", player.getName());
            playerData.addProperty("health", player.getHealth());
            playerData.addProperty("maxHealth", player.getMaxHealth());
            playerData.addProperty("location", player.getWorld().getName() + ", " +
                    (int) player.getLocation().getX() + ", " +
                    (int) player.getLocation().getY() + ", " +
                    (int) player.getLocation().getZ());
            playerData.addProperty("gamemode", player.getGameMode().name());
            playerData.addProperty("isMuted", plugin.getMuteManager().isMuted(player.getUniqueId()));
            playerList.add(playerData);
        }

        response.add("data", gson.toJsonTree(playerList));
        response.addProperty("onlineCount", Bukkit.getOnlinePlayers().size());
        sendRaw(gson.toJson(response));
    }

    /**
     * Oyuncuyu mute eder
     */
    private void handleMutePlayer(JsonObject json) {
        if (!client.hasPermission("mute")) {
            sendResponse("mutePlayer", false, "Yetkiniz yok.");
            return;
        }

        if (!json.has("player")) {
            sendResponse("mutePlayer", false, "Oyuncu adı gerekli.");
            return;
        }

        String playerName = json.get("player").getAsString();
        String duration = json.has("duration") ? json.get("duration").getAsString() : "1h";
        String reason = json.has("reason") ? json.get("reason").getAsString() : "Sebep belirtilmedi";

        Player target = Bukkit.getPlayer(playerName);
        if (target == null) {
            sendResponse("mutePlayer", false, "Oyuncu çevrimiçi değil: " + playerName);
            return;
        }

        MuteManager muteManager = plugin.getMuteManager();
        long durationMs = muteManager.parseDuration(duration);

        if (durationMs < 0) {
            sendResponse("mutePlayer", false, "Geçersiz süre formatı: " + duration);
            return;
        }

        muteManager.mutePlayer(target.getUniqueId(), playerName, reason, durationMs, client.username);

        // Oyuncuya bildir
        String muteMessage = plugin.getConfig().getString("messages.mute-message",
                "&cSusturuldunuz! Sebep: {reason}");
        muteMessage = muteMessage.replace("{reason}", reason);
        target.sendMessage(LegacyComponentSerializer.legacyAmpersand().deserialize(muteMessage));

        sendResponse("mutePlayer", true, playerName + " mute edildi. Süre: " + duration + ", Sebep: " + reason);

        // Log yayınla
        plugin.getWebSocketServer().broadcastLog("INFO",
                client.username + " tarafından " + playerName + " mute edildi. Sebep: " + reason);
    }

    /**
     * Oyuncunun mute'unu kaldırır
     */
    private void handleUnmutePlayer(JsonObject json) {
        if (!client.hasPermission("mute")) {
            sendResponse("unmutePlayer", false, "Yetkiniz yok.");
            return;
        }

        if (!json.has("player")) {
            sendResponse("unmutePlayer", false, "Oyuncu adı gerekli.");
            return;
        }

        String playerName = json.get("player").getAsString();
        MuteManager muteManager = plugin.getMuteManager();

        // UUID'yi oyuncu adıyla bul
        java.util.UUID targetUUID = muteManager.getUUIDByName(playerName);
        if (targetUUID == null) {
            sendResponse("unmutePlayer", false, "Oyuncu bulunamadı: " + playerName);
            return;
        }

        if (!muteManager.isMuted(targetUUID)) {
            sendResponse("unmutePlayer", false, playerName + " zaten mute değil.");
            return;
        }

        muteManager.unmutePlayer(targetUUID);

        // Çevrimiçiyse bildir
        Player target = Bukkit.getPlayer(targetUUID);
        if (target != null) {
            String unmuteMessage = plugin.getConfig().getString("messages.unmute-message",
                    "&aArtık konuşabilirsiniz!");
            target.sendMessage(LegacyComponentSerializer.legacyAmpersand().deserialize(unmuteMessage));
        }

        sendResponse("unmutePlayer", true, playerName + " unmute edildi.");

        // Log yayınla
        plugin.getWebSocketServer().broadcastLog("INFO",
                client.username + " tarafından " + playerName + " unmute edildi.");
    }

    /**
     * Mute'lu oyuncuları listeler
     */
    private void handleGetMutedPlayers() {
        if (!client.hasPermission("mute")) {
            sendResponse("getMutedPlayers", false, "Yetkiniz yok.");
            return;
        }

        List<java.util.Map<String, Object>> mutedList = plugin.getMuteManager().getMutedPlayers();

        JsonObject response = new JsonObject();
        response.addProperty("type", "response");
        response.addProperty("action", "getMutedPlayers");
        response.addProperty("success", true);
        response.add("data", gson.toJsonTree(mutedList));
        sendRaw(gson.toJson(response));
    }

    /**
     * Oyuncuya item verir
     */
    private void handleGiveItem(JsonObject json) {
        if (!client.hasPermission("items")) {
            sendResponse("giveItem", false, "Yetkiniz yok.");
            return;
        }

        if (!json.has("player") || !json.has("item")) {
            sendResponse("giveItem", false, "Oyuncu adı ve item gerekli.");
            return;
        }

        String playerName = json.get("player").getAsString();
        String itemName = json.get("item").getAsString().toUpperCase();
        int amount = json.has("amount") ? json.get("amount").getAsInt() : 1;

        // Miktar sınırları
        amount = Math.max(1, Math.min(64, amount));

        Player target = Bukkit.getPlayer(playerName);
        if (target == null) {
            sendResponse("giveItem", false, "Oyuncu çevrimiçi değil: " + playerName);
            return;
        }

        // Material'i bul
        Material material = Material.getMaterial(itemName);
        if (material == null || !material.isItem()) {
            sendResponse("giveItem", false, "Geçersiz item: " + itemName);
            return;
        }

        // ItemStack oluştur
        ItemStack itemStack = new ItemStack(material, amount);
        ItemMeta meta = itemStack.getItemMeta();

        if (meta != null) {
            // Custom isim
            if (json.has("displayName") && !json.get("displayName").getAsString().isEmpty()) {
                String displayName = json.get("displayName").getAsString();
                meta.displayName(LegacyComponentSerializer.legacyAmpersand().deserialize(displayName));
            }

            // Lore (açıklama)
            if (json.has("lore")) {
                List<Component> loreList = new ArrayList<>();
                for (var loreElement : json.getAsJsonArray("lore")) {
                    loreList.add(LegacyComponentSerializer.legacyAmpersand()
                            .deserialize(loreElement.getAsString()));
                }
                meta.lore(loreList);
            }

            // Enchantmentlar
            if (json.has("enchantments")) {
                JsonObject enchants = json.getAsJsonObject("enchantments");
                for (String enchantName : enchants.keySet()) {
                    try {
                        @SuppressWarnings("deprecation")
                        Enchantment enchantment = Enchantment.getByName(enchantName.toUpperCase());
                        if (enchantment != null) {
                            int level = enchants.get(enchantName).getAsInt();
                            meta.addEnchant(enchantment, level, true); // ignoreLevelRestriction=true
                        }
                    } catch (Exception e) {
                        plugin.getLogger().log(Level.WARNING, "Geçersiz enchantment: " + enchantName, e);
                    }
                }
            }

            itemStack.setItemMeta(meta);
        }

        // İtemi ver
        target.getInventory().addItem(itemStack);

        sendResponse("giveItem", true, playerName + "'e " + amount + "x " + itemName + " verildi.");

        // Log yayınla
        plugin.getWebSocketServer().broadcastLog("INFO",
                client.username + " tarafından " + playerName + "'e " + amount + "x " + itemName + " verildi.");
    }

    /**
     * Mesaj gönderir (özel veya genel)
     */
    private void handleSendMessage(JsonObject json) {
        if (!client.hasPermission("message")) {
            sendResponse("sendMessage", false, "Yetkiniz yok.");
            return;
        }

        if (!json.has("message")) {
            sendResponse("sendMessage", false, "Mesaj gerekli.");
            return;
        }

        String message = json.get("message").getAsString();
        String target = json.has("target") ? json.get("target").getAsString() : "all";
        String type = json.has("messageType") ? json.get("messageType").getAsString() : "chat";

        if ("all".equals(target)) {
            // Tüm oyunculara gönder
            broadcastMessage(message, type);
            sendResponse("sendMessage", true, "Mesaj tüm oyunculara gönderildi.");
        } else {
            // Belirli oyuncuya gönder
            Player targetPlayer = Bukkit.getPlayer(target);
            if (targetPlayer == null) {
                sendResponse("sendMessage", false, "Oyuncu çevrimiçi değil: " + target);
                return;
            }
            sendPlayerMessage(targetPlayer, message, type);
            sendResponse("sendMessage", true, target + "'e mesaj gönderildi.");
        }

        // Log yayınla
        plugin.getWebSocketServer().broadcastLog("INFO",
                client.username + " tarafından mesaj gönderildi -> " + target + ": " + message);
    }

    /**
     * Broadcast mesaj gönderir
     */
    private void handleBroadcast(JsonObject json) {
        if (!client.hasPermission("message")) {
            sendResponse("broadcast", false, "Yetkiniz yok.");
            return;
        }

        if (!json.has("message")) {
            sendResponse("broadcast", false, "Mesaj gerekli.");
            return;
        }

        String message = json.get("message").getAsString();
        String type = json.has("type") ? json.get("type").getAsString() : "chat";
        String prefix = plugin.getConfig().getString("messages.broadcast-prefix", "&6[DUYURU] &f");

        broadcastMessage(prefix + message, type);
        sendResponse("broadcast", true, "Duyuru gönderildi.");

        // Log yayınla
        plugin.getWebSocketServer().broadcastLog("INFO",
                client.username + " tarafından duyuru gönderildi: " + message);
    }

    // --- Yardımcı metodlar ---

    /**
     * Tüm oyunculara mesaj yayınlar
     */
    private void broadcastMessage(String message, String type) {
        Component component = LegacyComponentSerializer.legacyAmpersand().deserialize(message);

        switch (type) {
            case "title" -> {
                for (Player player : Bukkit.getOnlinePlayers()) {
                    player.showTitle(net.kyori.adventure.title.Title.title(component, Component.empty()));
                }
            }
            case "actionbar" -> {
                for (Player player : Bukkit.getOnlinePlayers()) {
                    player.sendActionBar(component);
                }
            }
            default -> Bukkit.broadcast(component);
        }
    }

    /**
     * Belirli bir oyuncuya mesaj gönderir
     */
    private void sendPlayerMessage(Player player, String message, String type) {
        Component component = LegacyComponentSerializer.legacyAmpersand().deserialize(message);

        switch (type) {
            case "title" -> player.showTitle(net.kyori.adventure.title.Title.title(component, Component.empty()));
            case "actionbar" -> player.sendActionBar(component);
            default -> player.sendMessage(component);
        }
    }

    /**
     * Standart yanıt mesajı gönderir
     */
    private void sendResponse(String action, boolean success, String message) {
        JsonObject response = new JsonObject();
        response.addProperty("type", "response");
        response.addProperty("action", action);
        response.addProperty("success", success);
        response.addProperty("message", message);
        sendRaw(gson.toJson(response));
    }

    /**
     * Ham JSON mesajı gönderir
     */
    private void sendRaw(String message) {
        if (conn.isOpen()) {
            conn.send(message);
        }
    }
}
