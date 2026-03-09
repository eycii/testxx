package com.mcadmin.commands;

import com.mcadmin.McAdminPlugin;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * /mcadmin komutunu yöneten sınıf
 * Ana yönetim komutu: help, reload, generatetoken, status
 */
public class McAdminCommand implements CommandExecutor, TabCompleter {

    private final McAdminPlugin plugin;

    public McAdminCommand(McAdminPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command,
                             @NotNull String label, @NotNull String[] args) {

        if (!sender.hasPermission("mcadmin.use")) {
            sender.sendMessage("§cBu komutu kullanmak için yetkiniz yok.");
            return true;
        }

        if (args.length == 0) {
            showHelp(sender);
            return true;
        }

        switch (args[0].toLowerCase()) {
            case "help" -> showHelp(sender);
            case "reload" -> handleReload(sender);
            case "generatetoken" -> handleGenerateToken(sender, args);
            case "status" -> handleStatus(sender);
            default -> {
                sender.sendMessage("§cBilinmeyen alt komut: " + args[0]);
                sender.sendMessage("§7/mcadmin help yazarak yardım alın.");
            }
        }

        return true;
    }

    /**
     * Yardım menüsünü gösterir
     */
    private void showHelp(CommandSender sender) {
        sender.sendMessage("§6§l=== MCAdmin Yardım ===");
        sender.sendMessage("§e/mcadmin help §7- Bu yardım menüsünü gösterir");
        sender.sendMessage("§e/mcadmin reload §7- Config dosyasını yeniden yükler");
        sender.sendMessage("§e/mcadmin generatetoken <kullanıcı_adı> §7- Yeni token oluşturur");
        sender.sendMessage("§e/mcadmin status §7- Plugin durumunu gösterir");
        sender.sendMessage("§6§l=== Mute Komutları ===");
        sender.sendMessage("§e/mute <oyuncu> <süre> <sebep> §7- Oyuncuyu mute eder");
        sender.sendMessage("§e/unmute <oyuncu> §7- Oyuncuyu unmute eder");
        sender.sendMessage("§e/mutelist §7- Mute'lu oyuncuları listeler");
        sender.sendMessage("§7Süre formatları: 5s, 5m, 1h, 2d, permanent");
    }

    /**
     * Config yeniden yükleme
     */
    private void handleReload(CommandSender sender) {
        if (!sender.hasPermission("mcadmin.admin")) {
            sender.sendMessage("§cBu işlem için 'mcadmin.admin' yetkisi gerekli.");
            return;
        }

        plugin.reloadPluginConfig();
        sender.sendMessage("§aConfig dosyası başarıyla yeniden yüklendi.");
    }

    /**
     * Token oluşturma
     */
    private void handleGenerateToken(CommandSender sender, String[] args) {
        if (!sender.hasPermission("mcadmin.admin")) {
            sender.sendMessage("§cBu işlem için 'mcadmin.admin' yetkisi gerekli.");
            return;
        }

        if (args.length < 2) {
            sender.sendMessage("§cKullanım: /mcadmin generatetoken <kullanıcı_adı>");
            return;
        }

        String username = args[1];
        String token = generateSecureToken();

        // Token'ı config'e kaydet
        List<java.util.Map<?, ?>> tokens = plugin.getConfig().getMapList("security.tokens");
        java.util.Map<String, Object> newToken = new java.util.HashMap<>();
        newToken.put("token", token);
        newToken.put("username", username);
        newToken.put("permissions", Arrays.asList("admin"));
        tokens.add(newToken);

        plugin.getConfig().set("security.tokens", tokens);
        plugin.saveConfig();

        sender.sendMessage("§aYeni token oluşturuldu:");
        sender.sendMessage("§eKullanıcı: §f" + username);
        sender.sendMessage("§eToken: §f" + token);
        sender.sendMessage("§7Bu token'ı güvenli bir yerde saklayın!");
    }

    /**
     * Plugin durumunu gösterir
     */
    private void handleStatus(CommandSender sender) {
        sender.sendMessage("§6§l=== MCAdmin Durum ===");
        sender.sendMessage("§ePlugin Versiyonu: §f" + plugin.getDescription().getVersion());

        if (plugin.getWebSocketServer() != null) {
            sender.sendMessage("§eWebSocket Durumu: §aBağlantı Dinleniyor");
            sender.sendMessage("§eBağlı İstemci: §f" +
                    plugin.getWebSocketServer().getAuthenticatedClientCount());
        } else {
            sender.sendMessage("§eWebSocket Durumu: §cDevre Dışı");
        }

        sender.sendMessage("§eAktif Mute: §f" +
                plugin.getMuteManager().getActiveMuteCount());

        sender.sendMessage("§eOnline Oyuncu: §f" +
                plugin.getServer().getOnlinePlayers().size());
    }

    /**
     * Güvenli rastgele token oluşturur
     */
    private String generateSecureToken() {
        return UUID.randomUUID().toString().replace("-", "") +
               UUID.randomUUID().toString().replace("-", "");
    }

    @Override
    public List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command command,
                                      @NotNull String alias, @NotNull String[] args) {
        List<String> completions = new ArrayList<>();

        if (args.length == 1) {
            List<String> subCommands = Arrays.asList("help", "reload", "generatetoken", "status");
            String partial = args[0].toLowerCase();
            for (String sub : subCommands) {
                if (sub.startsWith(partial)) {
                    completions.add(sub);
                }
            }
        }

        return completions;
    }
}
