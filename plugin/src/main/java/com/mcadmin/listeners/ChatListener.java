package com.mcadmin.listeners;

import com.mcadmin.McAdminPlugin;
import com.mcadmin.managers.MuteManager;
import net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerChatEvent;

/**
 * Sohbet dinleyicisi
 * Mute'lu oyuncuların mesaj yazmasını engeller
 */
@SuppressWarnings("deprecation") // AsyncPlayerChatEvent deprecated in newer Paper versions
public class ChatListener implements Listener {

    private final McAdminPlugin plugin;

    public ChatListener(McAdminPlugin plugin) {
        this.plugin = plugin;
    }

    /**
     * Oyuncu chat mesajı gönderdiğinde tetiklenir
     * Mute'lu oyuncuların mesaj yazmasını engeller
     */
    @EventHandler(priority = EventPriority.LOWEST)
    public void onPlayerChat(AsyncPlayerChatEvent event) {
        // Bypass yetkisi varsa engelleme
        if (event.getPlayer().hasPermission("mcadmin.mute.bypass")) {
            return;
        }

        MuteManager muteManager = plugin.getMuteManager();

        if (muteManager.isMuted(event.getPlayer().getUniqueId())) {
            event.setCancelled(true);

            MuteManager.MuteInfo muteInfo = muteManager.getMuteInfo(event.getPlayer().getUniqueId());

            if (muteInfo != null) {
                // Mute mesajını oyuncuya gönder
                String muteMessage = plugin.getConfig().getString("messages.mute-message",
                        "&cSusturuldunuz! Sebep: {reason}");
                muteMessage = muteMessage.replace("{reason}", muteInfo.reason);

                String kalan = muteInfo.getRemainingFormatted();
                event.getPlayer().sendMessage(
                        LegacyComponentSerializer.legacyAmpersand().deserialize(muteMessage));
                event.getPlayer().sendMessage("§7Kalan süre: §e" + kalan);
            }
        }
    }
}
