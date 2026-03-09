/**
 * Preload Script (preload.js)
 * Ana process ile renderer process arasında güvenli köprü görevi görür
 * contextBridge kullanarak sadece izin verilen API'leri expose eder
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Güvenli API'yi renderer process'e expose et
 */
contextBridge.exposeInMainWorld('electronAPI', {
    // Ayar yönetimi
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    loadSettings: () => ipcRenderer.invoke('load-settings'),

    // Navigasyon
    navigateToDashboard: () => ipcRenderer.invoke('navigate-to-dashboard'),
    navigateToLogin: () => ipcRenderer.invoke('navigate-to-login'),

    // Harici URL
    openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
