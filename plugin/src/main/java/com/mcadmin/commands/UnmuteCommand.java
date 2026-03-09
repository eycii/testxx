package com.mcadmin.commands;

import com.mcadmin.McAdminPlugin;
import com.mcadmin.managers.MuteManager;
import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * /unmute komutunu yöneten sınıf
 * Kullanım: /unmute <oyuncu>
 */
public class UnmuteCommand implements CommandExecutor, TabCompleter {

    private final McAdminPlugin plugin;

    public UnmuteCommand(McAdminPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command,
                             @NotNull String label, @NotNull String[] args) {

        if (!sender.hasPermission("mcadmin.mute")) {
            sender.sendMessage("§cBu komutu kullanmak için yetkiniz yok.");
            return true;
        }

        if (args.length < 1) {
            sender.sendMessage("§cKullanım: /unmute <oyuncu>");
            return true;
        }

        String playerName = args[0];
        MuteManager muteManager = plugin.getMuteManager();

        // UUID'yi isimle bul (hem online hem offline oyuncu için)
        UUID targetUUID = muteManager.getUUIDByName(playerName);

        if (targetUUID == null) {
            // Online oyuncuda ara
            Player onlinePlayer = Bukkit.getPlayer(playerName);
            if (onlinePlayer != null) {
                targetUUID = onlinePlayer.getUniqueId();
            }
        }

        if (targetUUID == null) {
            sender.sendMessage("§cOyuncu bulunamadı: §e" + playerName);
            sender.sendMessage("§7Bu oyuncu mute edilmiş olmayabilir.");
            return true;
        }

        if (!muteManager.isMuted(targetUUID)) {
            sender.sendMessage("§c" + playerName + " zaten mute değil.");
            return true;
        }

        muteManager.unmutePlayer(targetUUID);

        // Oyuncu çevrimiçiyse bildir
        Player target = Bukkit.getPlayer(targetUUID);
        if (target != null) {
            String unmuteMessage = plugin.getConfig().getString("messages.unmute-message",
                    "&aArtık konuşabilirsiniz!");
            target.sendMessage(net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer
                    .legacyAmpersand().deserialize(unmuteMessage));
        }

        sender.sendMessage("§a" + playerName + " başarıyla unmute edildi.");

        // WebSocket log yayınla
        if (plugin.getWebSocketServer() != null) {
            String unmutedBy = (sender instanceof Player) ? sender.getName() : "Konsol";
            plugin.getWebSocketServer().broadcastLog("INFO",
                    unmutedBy + " tarafından " + playerName + " unmute edildi.");
        }

        return true;
    }

    @Override
    public List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command command,
                                      @NotNull String alias, @NotNull String[] args) {
        List<String> completions = new ArrayList<>();

        if (args.length == 1) {
            // Mute'lu oyuncuları öner
            String partial = args[0].toLowerCase();

            // Mute'lu online oyuncular
            for (Player player : Bukkit.getOnlinePlayers()) {
                if (plugin.getMuteManager().isMuted(player.getUniqueId()) &&
                        player.getName().toLowerCase().startsWith(partial)) {
                    completions.add(player.getName());
                }
            }

            // Mute'lu offline oyuncular (önbellekten)
            for (java.util.Map<String, Object> mute : plugin.getMuteManager().getMutedPlayers()) {
                String name = (String) mute.get("name");
                if (name != null && name.toLowerCase().startsWith(partial) && !completions.contains(name)) {
                    completions.add(name);
                }
            }
        }

        return completions;
    }
}
