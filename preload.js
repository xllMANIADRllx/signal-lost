const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  onAppVersion: (callback) => ipcRenderer.on('app-version', (_event, version) => callback(version)),
  onAppPlatform: (callback) => ipcRenderer.on('app-platform', (_event, platform) => callback(platform)),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, message) => callback(message)),
  onMacUpdateAvailable: (callback) => ipcRenderer.on('mac-update-available', (_event, version) => callback(version)),
  openReleases:    () => ipcRenderer.send('open-releases'),
  setFullscreen:   (flag)  => ipcRenderer.send('set-fullscreen', flag),
  setBrightness:   (value) => ipcRenderer.send('set-brightness', value),
})
