import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Badge / unread count
  setBadgeCount: (count: number) => ipcRenderer.send('set-badge-count', count),

  // Native notification (fallback when app is in background)
  showNotification: (title: string, body: string, icon?: string) =>
    ipcRenderer.send('show-notification', { title, body, icon }),

  // App update
  onUpdateAvailable: (cb: () => void) =>
    ipcRenderer.on('update-available', cb),
  onUpdateDownloaded: (cb: () => void) =>
    ipcRenderer.on('update-downloaded', cb),
  installUpdate: () => ipcRenderer.send('install-update'),

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
})
