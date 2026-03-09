/**
 * Dashboard JavaScript (dashboard.js)
 * Ana panel, sekme yönetimi ve tüm UI işlemlerini yönetir
 */

// --- Global Değişkenler ---
let connection = null;
let currentPlayers = [];
let actionCount = 0;
let uptimeInterval = null;

// Hızlı kitler tanımları
const QUICK_KITS = [
    {
        name: 'Savaş Kiti', icon: '⚔️', color: 'danger',
        items: [
            { item: 'DIAMOND_SWORD', amount: 1, enchantments: { SHARPNESS: 5, UNBREAKING: 3 } },
            { item: 'DIAMOND_HELMET', amount: 1, enchantments: { PROTECTION: 4 } },
            { item: 'DIAMOND_CHESTPLATE', amount: 1, enchantments: { PROTECTION: 4 } },
            { item: 'DIAMOND_LEGGINGS', amount: 1, enchantments: { PROTECTION: 4 } },
            { item: 'DIAMOND_BOOTS', amount: 1, enchantments: { PROTECTION: 4 } }
        ]
    },
    {
        name: 'Madenci Kiti', icon: '⛏️', color: 'warning',
        items: [
            { item: 'DIAMOND_PICKAXE', amount: 1, enchantments: { EFFICIENCY: 5, UNBREAKING: 3, FORTUNE: 3 } },
            { item: 'DIAMOND_SHOVEL', amount: 1, enchantments: { EFFICIENCY: 5 } },
            { item: 'TORCH', amount: 64 },
            { item: 'BREAD', amount: 32 }
        ]
    },
    {
        name: 'İnşaat Kiti', icon: '🏗️', color: 'info',
        items: [
            { item: 'OAK_PLANKS', amount: 64 },
            { item: 'STONE', amount: 64 },
            { item: 'GLASS', amount: 64 },
            { item: 'CRAFTING_TABLE', amount: 4 }
        ]
    },
    {
        name: 'Yemek Kiti', icon: '🍖', color: 'success',
        items: [
            { item: 'COOKED_BEEF', amount: 64 },
            { item: 'GOLDEN_APPLE', amount: 8 },
            { item: 'ENCHANTED_GOLDEN_APPLE', amount: 2 }
        ]
    }
];

// Mesaj şablonları
const MESSAGE_TEMPLATES = [
    '&6[DUYURU] &fSunucu 5 dakika içinde yeniden başlatılacak!',
    '&a[ETKINLIK] &fPvP etkinliği başlıyor! Katılmak için spawn\'a gelin.',
    '&b[BILGI] &fYeni özellikler eklendi. /help yazarak öğrenin.',
    '&c[UYARI] &fKüfür ve hakaret yasaktır!',
    '&e[DESTEK] &fYardım için Discord sunucumuza katılın.'
];

/**
 * Sayfa yüklendiğinde çalışır
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Ayarları yükle
    const settings = await window.electronAPI.loadSettings();
    document.body.setAttribute('data-theme', settings.theme || 'dark');

    // Bağlantıyı al veya oluştur
    if (window.serverConnection && window.serverConnection.authenticated) {
        connection = window.serverConnection;
        initDashboard();
    } else {
        // Bağlantı yoksa login'e yönlendir
        window.electronAPI.navigateToLogin();
        return;
    }

    // Event listener'ları başlat
    setupEventListeners();
    setupWebSocketListeners();

    // Sekme sistemini başlat
    setupTabs();

    // Hızlı kitleri oluştur
    renderQuickKits();

    // Mesaj şablonlarını oluştur
    renderMessageTemplates();

    // Enchantment listesini başlat
    setupEnchantments();

    // Periyodik güncelleme (30 saniyede bir)
    setInterval(() => {
        if (connection && connection.authenticated) {
            connection.getPlayers();
        }
    }, 30000);

    // Uptime güncelleme
    uptimeInterval = setInterval(updateUptime, 1000);
});

/**
 * Dashboard'ı başlatır
 */
function initDashboard() {
    // Kullanıcı adını göster
    const username = connection.username || 'Admin';
    document.getElementById('currentUsername').textContent = username;
    document.getElementById('infoUsername').textContent = username;
    document.getElementById('infoPermissions').textContent = (connection.permissions || []).join(', ') || 'admin';

    // Bağlantı durumunu güncelle
    updateConnectionStatus(true);

    // Sunucu bilgisini göster
    document.getElementById('infoServer').textContent =
        `${connection.host}:${connection.port}`;

    // Ayarlar formunu doldur
    document.getElementById('settingsServerAddress').value =
        `${connection.host}:${connection.port}`;

    // İlk veri yüklemesi
    connection.getPlayers();
    connection.getMutedPlayers();
}

/**
 * Sekme sistemini kurar
 */
function setupTabs() {
    const navLinks = document.querySelectorAll('.nav-link[data-tab]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = link.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

/**
 * Sekme değiştirir
 */
function switchTab(tabName) {
    // Aktif nav linkini güncelle
    document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-tab') === tabName) {
            link.classList.add('active');
        }
    });

    // İçeriği güncelle
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.getElementById('tab-' + tabName);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Sekmeye özel başlatma
    if (tabName === 'mute') {
        connection.getMutedPlayers();
    }
}

/**
 * Event listener'ları kurar
 */
function setupEventListeners() {
    // Oyuncu yenileme
    document.getElementById('refreshPlayersBtn')?.addEventListener('click', () => {
        connection.getPlayers();
    });

    document.getElementById('refreshAllPlayersBtn')?.addEventListener('click', () => {
        connection.getPlayers();
    });

    // Oyuncu arama
    const playerSearch = document.getElementById('playerSearch');
    if (playerSearch) {
        playerSearch.addEventListener('input', debounce(() => {
            renderAllPlayers(currentPlayers, playerSearch.value);
        }, 300));
    }

    // Bağlantı kes
    document.getElementById('disconnectBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        if (connection) connection.disconnect();
        await window.electronAPI.navigateToLogin();
    });

    // Tema değiştir
    document.getElementById('themeToggle')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme();
    });

    document.getElementById('darkThemeBtn')?.addEventListener('click', () => setTheme('dark'));
    document.getElementById('lightThemeBtn')?.addEventListener('click', () => setTheme('light'));

    // Sidebar mobil toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('show');
    });

    // Mute formu
    document.getElementById('muteForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleMuteSubmit();
    });

    document.getElementById('refreshMutesBtn')?.addEventListener('click', () => {
        connection.getMutedPlayers();
    });

    // Item formu
    document.getElementById('itemForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleItemSubmit();
    });

    // Item arama
    document.getElementById('itemAmount')?.addEventListener('input', (e) => {
        document.getElementById('amountValue').textContent = e.target.value;
    });

    document.getElementById('itemSearch')?.addEventListener('input', debounce((e) => {
        showItemSearchResults(e.target.value);
    }, 300));

    document.getElementById('searchItemBtn')?.addEventListener('click', () => {
        const query = document.getElementById('itemSearch').value;
        showItemSearchResults(query);
    });

    // Enchantment ekleme
    document.getElementById('addEnchantBtn')?.addEventListener('click', addEnchantmentRow);

    // Mesaj alıcı seçimi
    document.querySelectorAll('input[name="msgTarget"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const playerSelect = document.getElementById('msgPlayerSelect');
            if (document.getElementById('targetSpecific').checked) {
                playerSelect.classList.remove('d-none');
            } else {
                playerSelect.classList.add('d-none');
            }
        });
    });

    // Mesaj formu
    document.getElementById('messageForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleMessageSubmit();
    });

    // Renk kodları butonları
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const messageText = document.getElementById('messageText');
            const color = btn.getAttribute('data-color');
            const start = messageText.selectionStart;
            const end = messageText.selectionEnd;
            const text = messageText.value;
            messageText.value = text.substring(0, start) + color + text.substring(end);
            messageText.focus();
            messageText.setSelectionRange(start + color.length, start + color.length);
        });
    });

    // Log kontrolleri
    document.getElementById('clearLogsBtn')?.addEventListener('click', () => {
        document.getElementById('logConsole').innerHTML = '';
        addLogEntry('INFO', 'Log konsolu temizlendi.');
    });

    document.getElementById('exportLogsBtn')?.addEventListener('click', exportLogs);

    document.getElementById('logFilter')?.addEventListener('change', filterLogs);
    document.getElementById('logSearch')?.addEventListener('input', debounce(filterLogs, 300));

    // Ayarlar kaydetme
    document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);

    // Quick mute modal onay
    document.getElementById('quickMuteConfirm')?.addEventListener('click', () => {
        const playerName = document.getElementById('quickMutePlayerName').textContent;
        const duration = document.getElementById('quickMuteDuration').value;
        const reason = document.getElementById('quickMuteReason').value || 'Sebep belirtilmedi';

        connection.mutePlayer(playerName, duration, reason);
        bootstrap.Modal.getInstance(document.getElementById('quickMuteModal'))?.hide();
    });
}

/**
 * WebSocket event listener'larını kurar
 */
function setupWebSocketListeners() {
    // Oyuncu listesi güncellemesi
    connection.on('players', (data) => {
        currentPlayers = data.data || [];
        updatePlayerUI(currentPlayers);
        document.getElementById('stat-online').textContent = currentPlayers.length;
        document.getElementById('onlineCountBadge').textContent = currentPlayers.length;
        updatePlayerDropdowns(currentPlayers);
    });

    // Oyuncu güncelleme
    connection.on('playerUpdate', (data) => {
        if (data.players) {
            currentPlayers = data.players;
            updatePlayerUI(currentPlayers);
            document.getElementById('stat-online').textContent = currentPlayers.length;
            document.getElementById('onlineCountBadge').textContent = currentPlayers.length;
            updatePlayerDropdowns(currentPlayers);
        }
    });

    // Yanıt işleme
    connection.on('response', (data) => {
        handleServerResponse(data);
    });

    // Log mesajları
    connection.on('log', (data) => {
        addLogEntry(data.level || 'INFO', data.message, data.timestamp);
    });

    // Hata mesajları
    connection.on('error', (data) => {
        showNotification('Hata', data.message, 'danger');
    });

    // Bağlantı koptu
    connection.on('disconnect', () => {
        updateConnectionStatus(false);
        showNotification('Bağlantı Kesildi', 'Sunucu ile bağlantı kesildi. Yeniden bağlanılıyor...', 'warning');
    });

    // Yeniden bağlanma
    connection.on('reconnecting', (data) => {
        updateConnectionStatus(false);
        addLogEntry('WARNING', `Yeniden bağlanma denemesi ${data.attempt}/${data.maxAttempts}...`);
    });
}

// --- UI Güncelleme Fonksiyonları ---

/**
 * Oyuncu listesini günceller (Dashboard tab)
 */
function updatePlayerUI(players) {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;

    if (players.length === 0) {
        playersList.innerHTML = `
            <div class="text-center text-muted p-4">
                <i class="bi bi-person-x display-4 d-block mb-2"></i>
                Çevrimiçi oyuncu yok
            </div>`;
        return;
    }

    playersList.innerHTML = players.map(player => `
        <div class="player-item d-flex align-items-center justify-content-between p-3 border-bottom">
            <div class="d-flex align-items-center gap-3">
                <span class="status-indicator ${player.isMuted ? 'muted' : 'online'}">
                    ${player.isMuted ? '🔇' : '🟢'}
                </span>
                <div>
                    <strong>${escapeHtml(player.name)}</strong>
                    ${player.isMuted ? '<span class="badge bg-warning ms-1 text-dark">Mute</span>' : ''}
                    <div class="text-muted small">${escapeHtml(player.gamemode || '')} | ❤ ${Math.round(player.health || 0)}</div>
                </div>
            </div>
            <div class="d-flex gap-1">
                ${connection.hasPermission('mute') ? `
                    <button class="btn btn-sm btn-outline-warning"
                            onclick="openQuickMute('${escapeHtml(player.name)}')">
                        <i class="bi bi-mic-mute"></i>
                    </button>` : ''}
                ${connection.hasPermission('items') ? `
                    <button class="btn btn-sm btn-outline-success"
                            onclick="quickGiveItem('${escapeHtml(player.name)}')">
                        <i class="bi bi-box-seam"></i>
                    </button>` : ''}
                ${connection.hasPermission('message') ? `
                    <button class="btn btn-sm btn-outline-info"
                            onclick="quickMessage('${escapeHtml(player.name)}')">
                        <i class="bi bi-chat"></i>
                    </button>` : ''}
            </div>
        </div>
    `).join('');

    // Tüm oyuncular sekmesini güncelle
    renderAllPlayers(players, document.getElementById('playerSearch')?.value || '');
}

/**
 * Tüm oyuncular sekmesini oluşturur
 */
function renderAllPlayers(players, searchQuery = '') {
    const container = document.getElementById('allPlayersList');
    if (!container) return;

    const filtered = searchQuery
        ? players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : players;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="bi bi-search display-4 d-block mb-2"></i>
                Oyuncu bulunamadı
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(player => `
        <div class="col-md-4 col-lg-3">
            <div class="card player-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${highlightMatch(player.name, searchQuery)}</h6>
                        <span class="badge ${player.isMuted ? 'bg-warning text-dark' : 'bg-success'}">
                            ${player.isMuted ? '🔇 Mute' : '🟢 Online'}
                        </span>
                    </div>
                    <div class="text-muted small mb-2">
                        <div>❤ ${healthToHearts(player.health || 0)}</div>
                        <div><i class="bi bi-controller me-1"></i>${translateGamemode(player.gamemode || '')}</div>
                        ${player.location ? `<div><i class="bi bi-geo-alt me-1"></i>${escapeHtml(player.location)}</div>` : ''}
                    </div>
                    <div class="d-flex gap-1 flex-wrap">
                        ${connection.hasPermission('mute') ? `
                            <button class="btn btn-xs btn-outline-warning btn-sm"
                                    onclick="openQuickMute('${escapeHtml(player.name)}')">
                                <i class="bi bi-mic-mute me-1"></i>Mute
                            </button>` : ''}
                        ${connection.hasPermission('items') ? `
                            <button class="btn btn-xs btn-outline-success btn-sm"
                                    onclick="quickGiveItem('${escapeHtml(player.name)}')">
                                <i class="bi bi-box-seam me-1"></i>Item
                            </button>` : ''}
                        ${connection.hasPermission('message') ? `
                            <button class="btn btn-xs btn-outline-info btn-sm"
                                    onclick="quickMessage('${escapeHtml(player.name)}')">
                                <i class="bi bi-chat me-1"></i>Mesaj
                            </button>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Oyuncu dropdown'larını günceller
 */
function updatePlayerDropdowns(players) {
    const dropdowns = [
        'mutePlayerSelect', 'itemPlayerSelect', 'msgPlayerSelect'
    ];

    dropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">Oyuncu seçin...</option>';
        players.forEach(player => {
            const option = document.createElement('option');
            option.value = player.name;
            option.textContent = player.name + (player.isMuted ? ' 🔇' : '');
            select.appendChild(option);
        });
        if (current) select.value = current;
    });
}

/**
 * Mute'lu oyuncu listesini günceller
 */
function updateMutedPlayersList(mutedPlayers) {
    const container = document.getElementById('mutedPlayersList');
    if (!container) return;

    document.getElementById('stat-muted').textContent = mutedPlayers.length;

    if (mutedPlayers.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-4">Mute\'lu oyuncu yok</div>';
        return;
    }

    container.innerHTML = mutedPlayers.map(mute => `
        <div class="mute-item p-3 border-bottom d-flex justify-content-between align-items-start">
            <div>
                <strong><i class="bi bi-mic-mute text-warning me-2"></i>${escapeHtml(mute.name)}</strong>
                <div class="text-muted small">
                    <div><i class="bi bi-chat-text me-1"></i>Sebep: ${escapeHtml(mute.reason)}</div>
                    <div><i class="bi bi-clock me-1"></i>Kalan: ${escapeHtml(mute.remaining)}</div>
                    <div><i class="bi bi-person me-1"></i>Mute Eden: ${escapeHtml(mute.mutedBy)}</div>
                </div>
            </div>
            <button class="btn btn-sm btn-outline-success"
                    onclick="handleUnmute('${escapeHtml(mute.name)}')">
                <i class="bi bi-mic me-1"></i>Unmute
            </button>
        </div>
    `).join('');
}

/**
 * Sunucu yanıtlarını işler
 */
function handleServerResponse(data) {
    actionCount++;
    document.getElementById('stat-actions').textContent = actionCount;

    if (data.success) {
        showNotification('Başarılı', data.message, 'success');
        addRecentAction(data.action, data.message, true);

        // İşleme göre güncelleme
        if (data.action === 'mutePlayer' || data.action === 'unmutePlayer') {
            connection.getMutedPlayers();
            connection.getPlayers();
        }
    } else {
        showNotification('Hata', data.message, 'danger');
        addRecentAction(data.action, data.message, false);
    }

    // Mute listesi yanıtı
    if (data.action === 'getMutedPlayers' && data.data) {
        updateMutedPlayersList(data.data);
    }
}

/**
 * Son işlemler listesine ekler
 */
function addRecentAction(action, message, success) {
    const list = document.getElementById('recentActions');
    if (!list) return;

    const emptyItem = list.querySelector('.text-muted.text-center');
    if (emptyItem) emptyItem.remove();

    const item = document.createElement('li');
    item.className = 'list-group-item d-flex justify-content-between align-items-center';
    item.innerHTML = `
        <span>
            <i class="bi bi-${success ? 'check-circle text-success' : 'x-circle text-danger'} me-2"></i>
            ${escapeHtml(message)}
        </span>
        <small class="text-muted">${formatTime(Date.now())}</small>
    `;

    list.insertBefore(item, list.firstChild);

    // Maksimum 10 işlem göster
    while (list.children.length > 10) {
        list.removeChild(list.lastChild);
    }
}

// --- Form Gönderme Fonksiyonları ---

/**
 * Mute formu gönderimi
 */
function handleMuteSubmit() {
    const player = document.getElementById('mutePlayerSelect').value;
    const duration = document.getElementById('muteDuration').value;
    const reason = document.getElementById('muteReason').value.trim();

    if (!player) {
        showNotification('Hata', 'Oyuncu seçin.', 'warning');
        return;
    }
    if (!reason) {
        showNotification('Hata', 'Sebep girin.', 'warning');
        return;
    }

    connection.mutePlayer(player, duration, reason);
    document.getElementById('muteForm').reset();
}

/**
 * Item verme formu gönderimi
 */
function handleItemSubmit() {
    const player = document.getElementById('itemPlayerSelect').value;
    const item = document.getElementById('selectedItem').value;
    const amount = parseInt(document.getElementById('itemAmount').value);
    const displayName = document.getElementById('itemDisplayName').value.trim();
    const lore = document.getElementById('itemLore').value.trim();

    if (!player) {
        showNotification('Hata', 'Oyuncu seçin.', 'warning');
        return;
    }
    if (!item) {
        showNotification('Hata', 'Item seçin.', 'warning');
        return;
    }

    // Enchantmentları topla
    const enchantments = {};
    document.querySelectorAll('.enchant-row').forEach(row => {
        const name = row.querySelector('.enchant-name').value;
        const level = parseInt(row.querySelector('.enchant-level').value);
        if (name && level > 0) {
            enchantments[name] = level;
        }
    });

    const options = {};
    if (displayName) options.displayName = displayName;
    if (lore) options.lore = [lore];
    if (Object.keys(enchantments).length > 0) options.enchantments = enchantments;

    connection.giveItem(player, item, amount, options);

    // Son verilen itemler listesine ekle
    addRecentItem(player, item, amount);
}

/**
 * Mesaj formu gönderimi
 */
function handleMessageSubmit() {
    const isAll = document.getElementById('targetAll').checked;
    const target = isAll ? 'all' : document.getElementById('msgPlayerSelect').value;
    const messageType = document.querySelector('input[name="msgType"]:checked').value;
    const message = document.getElementById('messageText').value.trim();

    if (!target) {
        showNotification('Hata', 'Oyuncu seçin.', 'warning');
        return;
    }
    if (!message) {
        showNotification('Hata', 'Mesaj girin.', 'warning');
        return;
    }

    connection.sendMessage(target, message, messageType);

    // Gönderilen mesajlara ekle
    addSentMessage(target, message);
    document.getElementById('messageText').value = '';
}

// --- Hızlı İşlem Fonksiyonları ---

/**
 * Hızlı mute modalını açar
 */
function openQuickMute(playerName) {
    document.getElementById('quickMutePlayerName').textContent = playerName;
    document.getElementById('quickMuteReason').value = '';
    const modal = new bootstrap.Modal(document.getElementById('quickMuteModal'));
    modal.show();
}

/**
 * Hızlı item verme - item sekmesine yönlendirir
 */
function quickGiveItem(playerName) {
    switchTab('items');
    const select = document.getElementById('itemPlayerSelect');
    if (select) select.value = playerName;
}

/**
 * Hızlı mesaj - mesaj sekmesine yönlendirir
 */
function quickMessage(playerName) {
    switchTab('messages');
    document.getElementById('targetSpecific').checked = true;
    const playerSelect = document.getElementById('msgPlayerSelect');
    playerSelect.classList.remove('d-none');
    if (playerSelect) playerSelect.value = playerName;
}

/**
 * Unmute işlemi
 */
function handleUnmute(playerName) {
    if (confirm(`${playerName} oyuncusunun mute'unu kaldırmak istiyor musunuz?`)) {
        connection.unmutePlayer(playerName);
    }
}

// --- Arama ve Filtreleme ---

/**
 * Item arama sonuçlarını gösterir
 */
function showItemSearchResults(query) {
    const resultsContainer = document.getElementById('itemSearchResults');
    const resultsList = document.getElementById('itemResultsList');

    if (!query || query.trim() === '') {
        resultsContainer.classList.add('d-none');
        return;
    }

    const results = searchItems(query);
    if (results.length === 0) {
        resultsContainer.classList.remove('d-none');
        resultsList.innerHTML = '<div class="list-group-item text-muted">Sonuç bulunamadı</div>';
        return;
    }

    resultsContainer.classList.remove('d-none');
    resultsList.innerHTML = results.map(item => `
        <button type="button" class="list-group-item list-group-item-action"
                onclick="selectItem('${item}')">
            📦 ${formatItemName(item)}
            <small class="text-muted ms-2">${item}</small>
        </button>
    `).join('');
}

/**
 * Item seçimi
 */
function selectItem(itemName) {
    document.getElementById('selectedItem').value = itemName;
    document.getElementById('selectedItemName').textContent = `📦 ${formatItemName(itemName)}`;
    document.getElementById('selectedItemDisplay').style.display = 'block';
    document.getElementById('itemSearchResults').classList.add('d-none');
    document.getElementById('itemSearch').value = formatItemName(itemName);
}

// --- UI Yardımcı Fonksiyonlar ---

/**
 * Hızlı kitleri oluşturur
 */
function renderQuickKits() {
    const container = document.getElementById('quickKits');
    if (!container) return;

    container.innerHTML = QUICK_KITS.map(kit => `
        <div class="col-6">
            <button type="button"
                    class="btn btn-outline-${kit.color} w-100"
                    onclick="giveQuickKit('${kit.name}')">
                ${kit.icon} ${kit.name}
            </button>
        </div>
    `).join('');
}

/**
 * Hızlı kit verir
 */
function giveQuickKit(kitName) {
    const player = document.getElementById('itemPlayerSelect').value;
    if (!player) {
        showNotification('Hata', 'Önce oyuncu seçin.', 'warning');
        return;
    }

    const kit = QUICK_KITS.find(k => k.name === kitName);
    if (!kit) return;

    kit.items.forEach(itemConfig => {
        connection.giveItem(player, itemConfig.item, itemConfig.amount || 1, {
            enchantments: itemConfig.enchantments
        });
    });

    showNotification('Kit Verildi', `${kitName} ${player}'e verildi.`, 'success');
}

/**
 * Mesaj şablonlarını oluşturur
 */
function renderMessageTemplates() {
    const container = document.getElementById('messageTemplates');
    if (!container) return;

    container.innerHTML = '';
    MESSAGE_TEMPLATES.forEach(template => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'list-group-item list-group-item-action';
        button.innerHTML = `<i class="bi bi-lightning me-2 text-warning"></i><small>${escapeHtml(template)}</small>`;
        button.addEventListener('click', () => useTemplate(template));
        container.appendChild(button);
    });
}

/**
 * Şablonu mesaj kutusuna ekler
 */
function useTemplate(template) {
    document.getElementById('messageText').value = template;
}

/**
 * Enchantment satırı ekler
 */
function addEnchantmentRow() {
    const container = document.getElementById('enchantmentsList');
    const row = document.createElement('div');
    row.className = 'enchant-row d-flex gap-2 mb-2';
    row.innerHTML = `
        <select class="form-select form-select-sm enchant-name">
            <option value="">Enchantment seç...</option>
            ${ENCHANTMENTS.map(e => `<option value="${e}">${formatItemName(e)}</option>`).join('')}
        </select>
        <select class="form-select form-select-sm enchant-level" style="width: 80px;">
            ${[1,2,3,4,5].map(l => `<option value="${l}">${l}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-sm btn-outline-danger"
                onclick="this.parentElement.remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;
    container.appendChild(row);
}

/**
 * Enchantment başlangıç kurulumu
 */
function setupEnchantments() {
    addEnchantmentRow();
}

/**
 * Son verilen itemlere ekler
 */
function addRecentItem(player, item, amount) {
    const list = document.getElementById('recentItems');
    if (!list) return;

    const emptyItem = list.querySelector('.text-muted.text-center');
    if (emptyItem) emptyItem.remove();

    const li = document.createElement('li');
    li.className = 'list-group-item small';
    li.innerHTML = `
        <i class="bi bi-box-seam me-2 text-success"></i>
        ${escapeHtml(player)}'e ${amount}x ${formatItemName(item)}
        <span class="float-end text-muted">${formatTime(Date.now())}</span>
    `;

    list.insertBefore(li, list.firstChild);
    while (list.children.length > 10) list.removeChild(list.lastChild);
}

/**
 * Gönderilen mesajlara ekler
 */
function addSentMessage(target, message) {
    const list = document.getElementById('sentMessages');
    if (!list) return;

    const emptyItem = list.querySelector('.text-muted.text-center');
    if (emptyItem) emptyItem.remove();

    const li = document.createElement('li');
    li.className = 'list-group-item small';
    li.innerHTML = `
        <div><strong>${escapeHtml(target)}</strong>: ${escapeHtml(message)}</div>
        <div class="text-muted">${formatTime(Date.now())}</div>
    `;

    list.insertBefore(li, list.firstChild);
    while (list.children.length > 20) list.removeChild(list.lastChild);
}

// --- Log Fonksiyonları ---

/**
 * Log girişi ekler
 */
function addLogEntry(level, message, timestamp) {
    const console = document.getElementById('logConsole');
    if (!console) return;

    const entry = document.createElement('div');
    entry.className = `log-entry log-${level.toLowerCase()}`;
    entry.setAttribute('data-level', level);
    entry.innerHTML = `
        <span class="log-time">[${formatTime(timestamp || Date.now())}]</span>
        <span class="log-level">[${escapeHtml(level)}]</span>
        <span class="log-message">${escapeHtml(message)}</span>
    `;

    console.appendChild(entry);

    // Maksimum 500 log satırı tut
    while (console.children.length > 500) {
        console.removeChild(console.firstChild);
    }

    // Otomatik kaydır
    if (document.getElementById('autoScroll')?.checked) {
        console.scrollTop = console.scrollHeight;
    }

    // Filtre uygula
    filterLogs();
}

/**
 * Logları filtreler
 */
function filterLogs() {
    const filter = document.getElementById('logFilter')?.value || 'all';
    const search = document.getElementById('logSearch')?.value?.toLowerCase() || '';

    document.querySelectorAll('.log-entry').forEach(entry => {
        const level = entry.getAttribute('data-level') || 'INFO';
        const text = entry.textContent.toLowerCase();
        const levelMatch = filter === 'all' || level === filter;
        const searchMatch = !search || text.includes(search);
        entry.style.display = levelMatch && searchMatch ? '' : 'none';
    });
}

/**
 * Logları dışa aktarır
 */
function exportLogs() {
    const entries = Array.from(document.querySelectorAll('.log-entry'));
    const text = entries.map(e => e.textContent.trim()).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcadmin-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- Durum ve Tema ---

/**
 * Bağlantı durumunu günceller
 */
function updateConnectionStatus(isConnected) {
    const dot = document.getElementById('connectionDot');
    const status = document.getElementById('connectionStatus');

    if (dot) dot.className = `status-dot ${isConnected ? 'connected' : 'disconnected'}`;
    if (status) status.textContent = isConnected ? 'Bağlı' : 'Bağlantı Kesildi';
}

/**
 * Uptime'ı günceller
 */
function updateUptime() {
    if (connection) {
        document.getElementById('stat-uptime').textContent = connection.getUptimeFormatted();
    }
}

/**
 * Tema değiştirir
 */
function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
}

/**
 * Temayı ayarlar
 */
function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    window.electronAPI.saveSettings({ theme });
}

/**
 * Ayarları kaydeder
 */
async function saveSettings() {
    const serverAddress = document.getElementById('settingsServerAddress').value;
    const rememberToken = document.getElementById('settingsRememberToken').checked;

    await window.electronAPI.saveSettings({ serverAddress, rememberToken });
    showNotification('Ayarlar', 'Ayarlar kaydedildi.', 'success');
}
