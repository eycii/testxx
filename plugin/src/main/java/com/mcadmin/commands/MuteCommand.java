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

/**
 * /mute komutunu yöneten sınıf
 * Kullanım: /mute <oyuncu> <süre> <sebep>
 */
public class MuteCommand implements CommandExecutor, TabCompleter {

    private final McAdminPlugin plugin;

    public MuteCommand(McAdminPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command,
                             @NotNull String label, @NotNull String[] args) {

        if (!sender.hasPermission("mcadmin.mute")) {
            sender.sendMessage("§cBu komutu kullanmak için yetkiniz yok.");
            return true;
        }

        if (args.length < 3) {
            sender.sendMessage("§cKullanım: /mute <oyuncu> <süre> <sebep>");
            sender.sendMessage("§7Süre formatları: 5s, 5m, 1h, 2d, permanent");
            return true;
        }

        String playerName = args[0];
        String duration = args[1];

        // Sebep (geri kalan tüm argümanları birleştir)
        StringBuilder reasonBuilder = new StringBuilder();
        for (int i = 2; i < args.length; i++) {
            if (i > 2) reasonBuilder.append(" ");
            reasonBuilder.append(args[i]);
        }
        String reason = reasonBuilder.toString();

        // Oyuncuyu bul
        Player target = Bukkit.getPlayer(playerName);
        if (target == null) {
            sender.sendMessage("§cOyuncu çevrimiçi değil: §e" + playerName);
            return true;
        }

        // Kendini mute edemez
        if (sender instanceof Player senderPlayer && senderPlayer.getUniqueId().equals(target.getUniqueId())) {
            sender.sendMessage("§cKendinizi mute edemezsiniz.");
            return true;
        }

        // Bypass yetkisi kontrolü
        if (target.hasPermission("mcadmin.mute.bypass")) {
            sender.sendMessage("§cBu oyuncu mute edilemez (bypass yetkisi var).");
            return true;
        }

        MuteManager muteManager = plugin.getMuteManager();
        long durationMs = muteManager.parseDuration(duration);

        if (durationMs == -2) {
            sender.sendMessage("§cGeçersiz süre formatı: §e" + duration);
            sender.sendMessage("§7Geçerli formatlar: 5s, 5m, 1h, 2d, permanent");
            return true;
        }

        // Zaten mute mu?
        if (muteManager.isMuted(target.getUniqueId())) {
            sender.sendMessage("§c" + playerName + " zaten mute edilmiş.");
            return true;
        }

        // Mute et
        String mutedByName = (sender instanceof Player) ? sender.getName() : "Konsol";
        muteManager.mutePlayer(target.getUniqueId(), target.getName(), reason, durationMs, mutedByName);

        // Oyuncuya bildir
        String muteMessage = plugin.getConfig().getString("messages.mute-message",
                "&cSusturuldunuz! Sebep: {reason}");
        muteMessage = muteMessage.replace("{reason}", reason);
        target.sendMessage(net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer
                .legacyAmpersand().deserialize(muteMessage));

        // Komut kullanıcısına bildir
        String durationText = (durationMs == -1) ? "Kalıcı" :
                muteManager.getMuteInfo(target.getUniqueId()).getRemainingFormatted();
        sender.sendMessage("§a" + playerName + " mute edildi.");
        sender.sendMessage("§7Süre: " + durationText + " | Sebep: " + reason);

        // WebSocket log yayınla
        if (plugin.getWebSocketServer() != null) {
            plugin.getWebSocketServer().broadcastLog("INFO",
                    mutedByName + " tarafından " + playerName + " mute edildi. Sebep: " + reason);
        }

        return true;
    }

    @Override
    public List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command command,
                                      @NotNull String alias, @NotNull String[] args) {
        List<String> completions = new ArrayList<>();

        if (args.length == 1) {
            // Online oyuncu adlarını öner
            String partial = args[0].toLowerCase();
            for (Player player : Bukkit.getOnlinePlayers()) {
                if (player.getName().toLowerCase().startsWith(partial)) {
                    completions.add(player.getName());
                }
            }
        } else if (args.length == 2) {
            // Süre önerileri
            List<String> durations = List.of("5m", "15m", "30m", "1h", "6h", "12h", "1d", "7d", "30d", "permanent");
            String partial = args[1].toLowerCase();
            for (String duration : durations) {
                if (duration.startsWith(partial)) {
                    completions.add(duration);
                }
            }
        } else if (args.length == 3) {
            // Sebep önerileri
            List<String> reasons = List.of("Spam", "Küfür", "Reklam", "Hakaret", "Kural_ihlali");
            String partial = args[2].toLowerCase();
            for (String reason : reasons) {
                if (reason.toLowerCase().startsWith(partial)) {
                    completions.add(reason);
                }
            }
        }

        return completions;
    }
}
