/**
 * Yardımcı Fonksiyonlar (utils.js)
 * Uygulama genelinde kullanılan yardımcı araçlar
 */

/**
 * Bildirim gösterir (Bootstrap Toast)
 * @param {string} title - Başlık
 * @param {string} message - Mesaj
 * @param {string} type - Tip ('success', 'danger', 'warning', 'info')
 */
function showNotification(title, message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');

    if (!toast) return;

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    // Toast rengini güncelle
    toast.className = 'toast';
    const headerEl = toast.querySelector('.toast-header');
    if (headerEl) {
        headerEl.className = 'toast-header';
        switch (type) {
            case 'success':
                headerEl.classList.add('bg-success', 'text-white');
                break;
            case 'danger':
            case 'error':
                headerEl.classList.add('bg-danger', 'text-white');
                break;
            case 'warning':
                headerEl.classList.add('bg-warning', 'text-dark');
                break;
            default:
                headerEl.classList.add('bg-info', 'text-white');
        }
    }

    const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
    bsToast.show();
}

/**
 * Minecraft renk kodlarını HTML'e çevirir
 * @param {string} text - & formatında renkli metin
 * @returns {string} - HTML formatında metin
 */
function minecraftColorsToHtml(text) {
    const colorMap = {
        '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
        '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
        '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
        'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
    };

    let html = '';
    let i = 0;
    let openSpan = false;

    while (i < text.length) {
        if (text[i] === '&' && i + 1 < text.length) {
            const code = text[i + 1].toLowerCase();
            if (colorMap[code]) {
                if (openSpan) html += '</span>';
                html += `<span style="color:${colorMap[code]}">`;
                openSpan = true;
                i += 2;
                continue;
            } else if (code === 'r') {
                if (openSpan) html += '</span>';
                openSpan = false;
                i += 2;
                continue;
            }
        }
        html += escapeHtml(text[i]);
        i++;
    }

    if (openSpan) html += '</span>';
    return html;
}

/**
 * HTML özel karakterlerini escape eder
 * @param {string} text - İşlenecek metin
 * @returns {string} - Güvenli metin
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

/**
 * Tarih/saati formatlar
 * @param {number} timestamp - Unix timestamp (ms)
 * @returns {string} - Formatlanmış tarih
 */
function formatTime(timestamp) {
    if (!timestamp) return '--:--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Health değerini kalp ikonlarına çevirir
 * @param {number} health - Can değeri (0-20)
 * @param {number} maxHealth - Maksimum can
 * @returns {string} - Kalp ikonları
 */
function healthToHearts(health, maxHealth = 20) {
    const hearts = Math.ceil(health / 2);
    const maxHearts = Math.ceil(maxHealth / 2);
    let html = '';

    for (let i = 0; i < maxHearts; i++) {
        if (i < hearts) {
            html += '<span class="text-danger">❤</span>';
        } else {
            html += '<span class="text-secondary">🖤</span>';
        }
    }
    return html;
}

/**
 * Oyun modunu Türkçeleştirir
 * @param {string} gamemode - Oyun modu adı
 * @returns {string} - Türkçe ad
 */
function translateGamemode(gamemode) {
    const modes = {
        'SURVIVAL': 'Hayatta Kalma',
        'CREATIVE': 'Yaratıcı',
        'ADVENTURE': 'Macera',
        'SPECTATOR': 'İzleyici'
    };
    return modes[gamemode] || gamemode;
}

/**
 * Kalan süreyi okunabilir formata çevirir
 * @param {number} ms - Milisaniye
 * @returns {string} - Okunabilir süre
 */
function formatDuration(ms) {
    if (ms < 0) return 'Kalıcı';
    if (ms === 0) return 'Süresi doldu';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} gün ${hours % 24} saat`;
    if (hours > 0) return `${hours} saat ${minutes % 60} dakika`;
    if (minutes > 0) return `${minutes} dakika`;
    return `${seconds} saniye`;
}

/**
 * Metin içindeki kısmi eşleşmeyi vurgular
 * @param {string} text - Asıl metin
 * @param {string} query - Aranacak metin
 * @returns {string} - Vurgulanmış HTML
 */
function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(escapedQuery, 'gi'),
        match => `<mark>${match}</mark>`);
}

/**
 * Bir array'i sayfalara böler
 * @param {Array} array - Bölünecek array
 * @param {number} pageSize - Sayfa boyutu
 * @param {number} page - Sayfa numarası (0'dan başlar)
 * @returns {Array} - Sayfalanmış veri
 */
function paginate(array, pageSize, page = 0) {
    const start = page * pageSize;
    return array.slice(start, start + pageSize);
}

/**
 * Debounce fonksiyonu - çok sık çağrılan fonksiyonları sınırlar
 * @param {Function} func - Fonksiyon
 * @param {number} wait - Bekleme süresi (ms)
 * @returns {Function} - Debounced fonksiyon
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Minecraft item adını okunabilir formata çevirir
 * @param {string} itemName - Item adı (DIAMOND_SWORD)
 * @returns {string} - Okunabilir ad (Diamond Sword)
 */
function formatItemName(itemName) {
    if (!itemName) return '';
    return itemName.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Tüm yaygın Minecraft item adları listesi
 * (Temel itemler - tam liste plugin'den alınır)
 */
const MINECRAFT_ITEMS = [
    // Silahlar
    'WOODEN_SWORD', 'STONE_SWORD', 'IRON_SWORD', 'GOLDEN_SWORD', 'DIAMOND_SWORD', 'NETHERITE_SWORD',
    'BOW', 'CROSSBOW', 'ARROW', 'SPECTRAL_ARROW', 'TIPPED_ARROW', 'TRIDENT',

    // Kazma
    'WOODEN_PICKAXE', 'STONE_PICKAXE', 'IRON_PICKAXE', 'GOLDEN_PICKAXE', 'DIAMOND_PICKAXE', 'NETHERITE_PICKAXE',

    // Balta
    'WOODEN_AXE', 'STONE_AXE', 'IRON_AXE', 'GOLDEN_AXE', 'DIAMOND_AXE', 'NETHERITE_AXE',

    // Kürek
    'WOODEN_SHOVEL', 'STONE_SHOVEL', 'IRON_SHOVEL', 'GOLDEN_SHOVEL', 'DIAMOND_SHOVEL', 'NETHERITE_SHOVEL',

    // Çapa
    'WOODEN_HOE', 'STONE_HOE', 'IRON_HOE', 'GOLDEN_HOE', 'DIAMOND_HOE', 'NETHERITE_HOE',

    // Zırh - Kask
    'LEATHER_HELMET', 'CHAINMAIL_HELMET', 'IRON_HELMET', 'GOLDEN_HELMET', 'DIAMOND_HELMET', 'NETHERITE_HELMET',

    // Zırh - Göğüs
    'LEATHER_CHESTPLATE', 'CHAINMAIL_CHESTPLATE', 'IRON_CHESTPLATE', 'GOLDEN_CHESTPLATE',
    'DIAMOND_CHESTPLATE', 'NETHERITE_CHESTPLATE',

    // Zırh - Tayt
    'LEATHER_LEGGINGS', 'CHAINMAIL_LEGGINGS', 'IRON_LEGGINGS', 'GOLDEN_LEGGINGS',
    'DIAMOND_LEGGINGS', 'NETHERITE_LEGGINGS',

    // Zırh - Bot
    'LEATHER_BOOTS', 'CHAINMAIL_BOOTS', 'IRON_BOOTS', 'GOLDEN_BOOTS', 'DIAMOND_BOOTS', 'NETHERITE_BOOTS',

    // Yiyecek
    'APPLE', 'GOLDEN_APPLE', 'ENCHANTED_GOLDEN_APPLE', 'BREAD', 'COOKED_BEEF', 'COOKED_CHICKEN',
    'COOKED_PORK', 'COOKED_FISH', 'CARROT', 'POTATO', 'COOKED_POTATO', 'MELON_SLICE',

    // Hammadde
    'COAL', 'CHARCOAL', 'IRON_INGOT', 'GOLD_INGOT', 'DIAMOND', 'EMERALD', 'LAPIS_LAZULI',
    'REDSTONE', 'QUARTZ', 'NETHERITE_INGOT', 'NETHERITE_SCRAP',

    // Bloklar
    'STONE', 'COBBLESTONE', 'DIRT', 'GRASS_BLOCK', 'SAND', 'GRAVEL', 'OAK_LOG', 'OAK_PLANKS',
    'GLASS', 'OBSIDIAN', 'BEDROCK', 'CHEST', 'CRAFTING_TABLE', 'FURNACE', 'TNT',

    // Diğer
    'ENDER_PEARL', 'BLAZE_ROD', 'BLAZE_POWDER', 'GHAST_TEAR', 'SLIME_BALL', 'FEATHER',
    'LEATHER', 'STICK', 'STRING', 'BONE', 'GUNPOWDER', 'FLINT', 'FLINT_AND_STEEL',
    'BUCKET', 'WATER_BUCKET', 'LAVA_BUCKET', 'MILK_BUCKET',
    'EXPERIENCE_BOTTLE', 'BOOK', 'ENCHANTED_BOOK', 'NAME_TAG', 'SADDLE'
];

/**
 * Item adına göre filtreleme
 * @param {string} query - Arama terimi
 * @returns {string[]} - Eşleşen item adları
 */
function searchItems(query) {
    if (!query || query.trim() === '') return MINECRAFT_ITEMS.slice(0, 20);
    const upperQuery = query.toUpperCase().replace(/\s+/g, '_');
    return MINECRAFT_ITEMS.filter(item =>
        item.includes(upperQuery) ||
        formatItemName(item).toUpperCase().includes(query.toUpperCase())
    ).slice(0, 20);
}

/**
 * Yaygın enchantment listesi
 */
const ENCHANTMENTS = [
    'SHARPNESS', 'SMITE', 'BANE_OF_ARTHROPODS', 'KNOCKBACK', 'FIRE_ASPECT', 'LOOTING',
    'SWEEPING_EDGE', 'EFFICIENCY', 'SILK_TOUCH', 'UNBREAKING', 'FORTUNE', 'POWER',
    'PUNCH', 'FLAME', 'INFINITY', 'LUCK_OF_THE_SEA', 'LURE', 'LOYALTY', 'IMPALING',
    'RIPTIDE', 'CHANNELING', 'MULTISHOT', 'QUICK_CHARGE', 'PIERCING',
    'PROTECTION', 'FIRE_PROTECTION', 'FEATHER_FALLING', 'BLAST_PROTECTION',
    'PROJECTILE_PROTECTION', 'RESPIRATION', 'AQUA_AFFINITY', 'THORNS',
    'DEPTH_STRIDER', 'FROST_WALKER', 'SOUL_SPEED', 'MENDING', 'VANISHING_CURSE',
    'BINDING_CURSE'
];
