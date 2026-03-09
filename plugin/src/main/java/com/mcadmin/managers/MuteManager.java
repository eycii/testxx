package com.mcadmin.managers;

import com.mcadmin.McAdminPlugin;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;

/**
 * Mute yönetici sınıfı
 * Oyuncuların mute durumunu yönetir ve kalıcı olarak saklar
 */
public class MuteManager {

    private final McAdminPlugin plugin;
    private final File muteFile;

    // Aktif mute'lar: UUID -> MuteInfo
    private final Map<UUID, MuteInfo> activeMutes;

    // İsimden UUID'ye önbellek
    private final Map<String, UUID> nameToUUID;

    /**
     * Mute bilgilerini tutan iç sınıf
     */
    public static class MuteInfo {
        public final UUID playerUUID;
        public final String playerName;
        public final String reason;
        public final long startTime;
        public final long endTime; // -1 ise kalıcı
        public final String mutedBy;

        public MuteInfo(UUID playerUUID, String playerName, String reason,
                        long startTime, long endTime, String mutedBy) {
            this.playerUUID = playerUUID;
            this.playerName = playerName;
            this.reason = reason;
            this.startTime = startTime;
            this.endTime = endTime;
            this.mutedBy = mutedBy;
        }

        /**
         * Mute'un hala aktif olup olmadığını kontrol eder
         */
        public boolean isActive() {
            if (endTime == -1) return true; // Kalıcı mute
            return System.currentTimeMillis() < endTime;
        }

        /**
         * Kalan süreyi milisaniye cinsinden döndürür
         */
        public long getRemainingMs() {
            if (endTime == -1) return -1; // Kalıcı
            return endTime - System.currentTimeMillis();
        }

        /**
         * Kalan süreyi okunabilir formatta döndürür
         */
        public String getRemainingFormatted() {
            if (endTime == -1) return "Kalıcı";
            long remaining = getRemainingMs();
            if (remaining <= 0) return "Süresi doldu";

            long seconds = remaining / 1000;
            long minutes = seconds / 60;
            long hours = minutes / 60;
            long days = hours / 24;

            if (days > 0) return days + " gün " + (hours % 24) + " saat";
            if (hours > 0) return hours + " saat " + (minutes % 60) + " dakika";
            if (minutes > 0) return minutes + " dakika";
            return seconds + " saniye";
        }
    }

    public MuteManager(McAdminPlugin plugin) {
        this.plugin = plugin;
        this.activeMutes = new ConcurrentHashMap<>();
        this.nameToUUID = new ConcurrentHashMap<>();
        this.muteFile = new File(plugin.getDataFolder(), "mutes.yml");
    }

    /**
     * Oyuncuyu mute eder
     *
     * @param playerUUID Oyuncu UUID'si
     * @param playerName Oyuncu adı
     * @param reason     Mute sebebi
     * @param durationMs Süre (milisaniye), -1 ise kalıcı
     * @param mutedBy    Mute eden kişi
     */
    public void mutePlayer(UUID playerUUID, String playerName, String reason, long durationMs, String mutedBy) {
        long startTime = System.currentTimeMillis();
        long endTime = (durationMs == -1) ? -1 : startTime + durationMs;

        MuteInfo muteInfo = new MuteInfo(playerUUID, playerName, reason, startTime, endTime, mutedBy);
        activeMutes.put(playerUUID, muteInfo);
        nameToUUID.put(playerName.toLowerCase(), playerUUID);

        // Dosyaya kaydet (config'de etkinleştirilmişse)
        if (plugin.getConfig().getBoolean("mute.save-to-file", true)) {
            saveMutes();
        }
    }

    /**
     * Oyuncunun mute'unu kaldırır
     *
     * @param playerUUID Oyuncu UUID'si
     */
    public void unmutePlayer(UUID playerUUID) {
        activeMutes.remove(playerUUID);

        // Dosyayı güncelle
        if (plugin.getConfig().getBoolean("mute.save-to-file", true)) {
            saveMutes();
        }
    }

    /**
     * Oyuncunun mute durumunu kontrol eder
     *
     * @param playerUUID Oyuncu UUID'si
     * @return true ise mute
     */
    public boolean isMuted(UUID playerUUID) {
        MuteInfo muteInfo = activeMutes.get(playerUUID);
        if (muteInfo == null) return false;

        // Süresi dolmuş mu?
        if (!muteInfo.isActive()) {
            activeMutes.remove(playerUUID);
            return false;
        }

        return true;
    }

    /**
     * Oyuncunun mute bilgisini döndürür
     *
     * @param playerUUID Oyuncu UUID'si
     * @return MuteInfo veya null
     */
    public MuteInfo getMuteInfo(UUID playerUUID) {
        MuteInfo muteInfo = activeMutes.get(playerUUID);
        if (muteInfo == null) return null;

        if (!muteInfo.isActive()) {
            activeMutes.remove(playerUUID);
            return null;
        }

        return muteInfo;
    }

    /**
     * Mute'lu oyuncuların listesini döndürür
     *
     * @return Mute bilgileri listesi
     */
    public List<Map<String, Object>> getMutedPlayers() {
        List<Map<String, Object>> result = new ArrayList<>();

        activeMutes.entrySet().removeIf(entry -> !entry.getValue().isActive());

        for (MuteInfo mute : activeMutes.values()) {
            Map<String, Object> muteData = new HashMap<>();
            muteData.put("uuid", mute.playerUUID.toString());
            muteData.put("name", mute.playerName);
            muteData.put("reason", mute.reason);
            muteData.put("mutedBy", mute.mutedBy);
            muteData.put("remaining", mute.getRemainingFormatted());
            muteData.put("permanent", mute.endTime == -1);
            result.add(muteData);
        }

        return result;
    }

    /**
     * İsimden UUID döndürür
     *
     * @param name Oyuncu adı
     * @return UUID veya null
     */
    public UUID getUUIDByName(String name) {
        return nameToUUID.get(name.toLowerCase());
    }

    /**
     * Süre string'ini milisaniyeye çevirir
     *
     * @param duration Süre string'i (5m, 1h, 2d, permanent)
     * @return Milisaniye, -1 ise kalıcı, -2 ise geçersiz format
     */
    public long parseDuration(String duration) {
        if ("permanent".equalsIgnoreCase(duration) || "perm".equalsIgnoreCase(duration)) {
            return -1;
        }

        if (duration == null || duration.isEmpty()) {
            return -2;
        }

        try {
            char unit = duration.charAt(duration.length() - 1);
            long amount = Long.parseLong(duration.substring(0, duration.length() - 1));

            return switch (Character.toLowerCase(unit)) {
                case 's' -> amount * 1000L;
                case 'm' -> amount * 60 * 1000L;
                case 'h' -> amount * 60 * 60 * 1000L;
                case 'd' -> amount * 24 * 60 * 60 * 1000L;
                default -> -2; // Geçersiz birim
            };
        } catch (NumberFormatException e) {
            return -2; // Geçersiz format
        }
    }

    /**
     * Mute verilerini dosyaya kaydeder
     */
    public void saveMutes() {
        try {
            if (!muteFile.getParentFile().exists()) {
                muteFile.getParentFile().mkdirs();
            }

            YamlConfiguration config = new YamlConfiguration();
            int index = 0;

            for (MuteInfo mute : activeMutes.values()) {
                if (!mute.isActive()) continue;

                String path = "mutes." + index;
                config.set(path + ".uuid", mute.playerUUID.toString());
                config.set(path + ".name", mute.playerName);
                config.set(path + ".reason", mute.reason);
                config.set(path + ".startTime", mute.startTime);
                config.set(path + ".endTime", mute.endTime);
                config.set(path + ".mutedBy", mute.mutedBy);
                index++;
            }

            config.save(muteFile);
        } catch (IOException e) {
            plugin.getLogger().log(Level.SEVERE, "Mute verileri kaydedilemedi!", e);
        }
    }

    /**
     * Mute verilerini dosyadan yükler
     */
    public void loadMutes() {
        if (!muteFile.exists()) {
            return;
        }

        try {
            FileConfiguration config = YamlConfiguration.loadConfiguration(muteFile);

            if (!config.contains("mutes")) return;

            for (String key : config.getConfigurationSection("mutes").getKeys(false)) {
                String path = "mutes." + key;

                UUID uuid = UUID.fromString(config.getString(path + ".uuid"));
                String name = config.getString(path + ".name");
                String reason = config.getString(path + ".reason");
                long startTime = config.getLong(path + ".startTime");
                long endTime = config.getLong(path + ".endTime");
                String mutedBy = config.getString(path + ".mutedBy", "Bilinmiyor");

                MuteInfo muteInfo = new MuteInfo(uuid, name, reason, startTime, endTime, mutedBy);

                // Sadece aktif mute'ları yükle
                if (muteInfo.isActive()) {
                    activeMutes.put(uuid, muteInfo);
                    nameToUUID.put(name.toLowerCase(), uuid);
                }
            }

            plugin.getLogger().info(activeMutes.size() + " aktif mute yüklendi.");
        } catch (Exception e) {
            plugin.getLogger().log(Level.SEVERE, "Mute verileri yüklenemedi!", e);
        }
    }

    /**
     * Aktif mute sayısını döndürür
     */
    public int getActiveMuteCount() {
        activeMutes.entrySet().removeIf(entry -> !entry.getValue().isActive());
        return activeMutes.size();
    }
}
