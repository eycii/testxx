package com.mcadmin.commands;

import com.mcadmin.McAdminPlugin;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.jetbrains.annotations.NotNull;

import java.util.List;
import java.util.Map;

/**
 * /mutelist komutunu yöneten sınıf
 * Mute'lu oyuncuların listesini gösterir
 */
public class MuteListCommand implements CommandExecutor {

    private final McAdminPlugin plugin;

    public MuteListCommand(McAdminPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command,
                             @NotNull String label, @NotNull String[] args) {

        if (!sender.hasPermission("mcadmin.mute")) {
            sender.sendMessage("§cBu komutu kullanmak için yetkiniz yok.");
            return true;
        }

        List<Map<String, Object>> mutedPlayers = plugin.getMuteManager().getMutedPlayers();

        if (mutedPlayers.isEmpty()) {
            sender.sendMessage("§7Şu anda mute'lu oyuncu yok.");
            return true;
        }

        sender.sendMessage("§6§l=== Mute Listesi (" + mutedPlayers.size() + " oyuncu) ===");

        for (Map<String, Object> mute : mutedPlayers) {
            String name = (String) mute.get("name");
            String reason = (String) mute.get("reason");
            String remaining = (String) mute.get("remaining");
            String mutedBy = (String) mute.get("mutedBy");

            sender.sendMessage("§e" + name + " §7| §cSebep: §f" + reason);
            sender.sendMessage("  §7Kalan: §e" + remaining + " §7| §7Mute Eden: §f" + mutedBy);
        }

        return true;
    }
}
