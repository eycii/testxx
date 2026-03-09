/**
 * Electron Ana Process (main.js)
 * Uygulama penceresini yönetir ve güvenlik ayarlarını yapar
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Kalıcı depolama
const store = new Store({
    name: 'mcadmin-config',
    defaults: {
        windowBounds: { width: 1200, height: 800 },
        serverAddress: '127.0.0.1:8080',
        rememberToken: false,
        theme: 'dark'
    }
});

let mainWindow;

/**
 * Ana pencereyi oluşturur
 */
function createWindow() {
    const { width, height } = store.get('windowBounds');

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        minWidth: 900,
        minHeight: 600,
        title: 'Minecraft Admin Panel',
        icon: path.join(__dirname, 'assets', 'icons', 'icon.png'),
        webPreferences: {
            // Güvenlik: preload script'i kullan
            preload: path.join(__dirname, 'preload.js'),
            // Güvenlik: Node.js'i renderer'da devre dışı bırak
            nodeIntegration: false,
            // Güvenlik: Context isolation'ı etkinleştir
            contextIsolation: true,
            // Güvenlik: Remote module'ü devre dışı bırak
            enableRemoteModule: false,
            // Güvenlik: Web security'yi etkinleştir
            webSecurity: true
        },
        // Modern görünüm için çerçeve özelleştirme
        frame: true,
        backgroundColor: '#1a1a2e'
    });

    // Login sayfasını yükle
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // Pencere boyutunu kaydet
    mainWindow.on('resize', () => {
        const { width, height } = mainWindow.getBounds();
        store.set('windowBounds', { width, height });
    });

    // Development modunda DevTools aç
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// --- IPC Mesaj İşleyicileri ---

/**
 * Ayarları kaydet
 */
ipcMain.handle('save-settings', (event, settings) => {
    try {
        store.set('serverAddress', settings.serverAddress);
        store.set('rememberToken', settings.rememberToken);
        store.set('theme', settings.theme || 'dark');
        if (settings.rememberToken && settings.token) {
            store.set('savedToken', settings.token);
        } else {
            store.delete('savedToken');
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * Kaydedilmiş ayarları yükle
 */
ipcMain.handle('load-settings', () => {
    return {
        serverAddress: store.get('serverAddress', '127.0.0.1:8080'),
        rememberToken: store.get('rememberToken', false),
        savedToken: store.get('rememberToken', false) ? store.get('savedToken', '') : '',
        theme: store.get('theme', 'dark')
    };
});

/**
 * Dashboard sayfasına yönlendir
 */
ipcMain.handle('navigate-to-dashboard', () => {
    if (mainWindow) {
        mainWindow.loadFile(path.join(__dirname, 'renderer', 'dashboard.html'));
    }
    return { success: true };
});

/**
 * Login sayfasına yönlendir
 */
ipcMain.handle('navigate-to-login', () => {
    if (mainWindow) {
        mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    }
    return { success: true };
});

/**
 * Harici URL'yi varsayılan tarayıcıda aç
 */
ipcMain.handle('open-external', (event, url) => {
    // Güvenlik: sadece http/https URL'lerine izin ver
    if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
        return { success: true };
    }
    return { success: false, error: 'Geçersiz URL' };
});

// --- Uygulama Olayları ---

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Güvenlik: Yeni pencere açılmasını engelle
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, url) => {
        event.preventDefault();
        // Sadece harici bağlantılar tarayıcıda açılır
        if (url.startsWith('http://') || url.startsWith('https://')) {
            shell.openExternal(url);
        }
    });
});
