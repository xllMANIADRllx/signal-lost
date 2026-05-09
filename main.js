const { app, BrowserWindow, globalShortcut, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const log = require('electron-log')

autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
  win.setMenuBarVisibility(false)

  globalShortcut.register('F11', () => {
    win.setFullScreen(!win.isFullScreen())
  })

  win.webContents.on('did-finish-load', () => {
    // Send platform and version to renderer
    win.webContents.send('app-version', app.getVersion())
    win.webContents.send('app-platform', process.platform)

    if (!app.isPackaged) {
      setTimeout(() => win.webContents.send('update-status', null), 500)
      return
    }

    if (process.platform !== 'darwin') {
      autoUpdater.checkForUpdatesAndNotify()
    }
    // Mac: renderer handles its own update check via fetch
  })

  // Windows auto-updater events
  autoUpdater.on('checking-for-update', () => {
    win.webContents.send('update-status', 'CHECKING FOR UPDATES...')
  })
  autoUpdater.on('update-available', () => {
    win.webContents.send('update-status', 'UPDATE FOUND — DOWNLOADING...')
  })
  autoUpdater.on('update-not-available', () => {
    win.webContents.send('update-status', null)
  })
  autoUpdater.on('download-progress', (progressObj) => {
    win.webContents.send('update-status', `DOWNLOADING UPDATE — ${Math.floor(progressObj.percent)}%`)
  })
  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update-status', 'UPDATE READY — INSTALLING ON CLOSE')
    setTimeout(() => autoUpdater.quitAndInstall(true, true), 3000)
  })
  autoUpdater.on('error', () => {
    win.webContents.send('update-status', null)
  })

  const { ipcMain } = require('electron')
  ipcMain.on('open-releases', () => {
    shell.openExternal('https://github.com/xllMANIADRllx/signal-lost/releases/latest')
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
