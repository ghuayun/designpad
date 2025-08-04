const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
console.log('[preload] Preload script initialized');
contextBridge.exposeInMainWorld('electronAPI', {
    // Menu events
    onMenuNew: (callback) => ipcRenderer.on('menu-new', callback),
    onMenuOpen: (callback) => ipcRenderer.on('menu-open', callback),
    onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
    onMenuSaveAs: (callback) => ipcRenderer.on('menu-save-as', callback),
    onMenuExportPng: (callback) => ipcRenderer.on('menu-export-png', callback),
    onMenuUndo: (callback) => ipcRenderer.on('menu-undo', callback),
    onMenuRedo: (callback) => ipcRenderer.on('menu-redo', callback),
    onMenuClear: (callback) => ipcRenderer.on('menu-clear', callback),

    // File operations
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    saveFile: (filePath, data) => ipcRenderer.invoke('save-file', filePath, data),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

    // Remove all listeners for a specific channel
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
