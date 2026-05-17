import {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  nativeImage,
  protocol,
  net,
  shell,
  session,
} from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import * as path from 'path'
import * as fs from 'fs'
import { pathToFileURL } from 'url'
import { createTray, updateTrayTooltip, destroyTray } from './tray'

// ─── Logging ───────────────────────────────────────────────────────────────
log.transports.file.level = 'info'
autoUpdater.logger = log

// ─── Constants ─────────────────────────────────────────────────────────────
const isDev = !app.isPackaged
const DEV_URL = 'http://localhost:3000'

// Static web root: built by `NEXT_BUILD_TARGET=electron pnpm build`
// electron-builder: resources/web/ | electron-packager: resources/out/ | dev: web/out/
function resolveWebRoot(): string {
  if (isDev) return path.join(__dirname, '../../web/out')
  const candidates = [
    path.join(process.resourcesPath, 'web'),  // electron-builder (from: '../web/out', to: 'web')
    path.join(process.resourcesPath, 'out'),  // electron-packager (extraResource basename)
  ]
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0]
}
const WEB_ROOT = resolveWebRoot()

let mainWindow: BrowserWindow | null = null
let isQuitting = false

// ─── Custom protocol: app:// ────────────────────────────────────────────────
// Must be called before app.whenReady()
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

/**
 * Resolves a URL pathname to a file on disk.
 * Handles:
 *   - Static assets (by file extension)
 *   - HTML pages with trailingSlash (index.html)
 *   - Dynamic route segments (falls back to first available subfolder)
 */
function resolveWebPath(pathname: string): string | null {
  const clean = decodeURIComponent(pathname).replace(/\?.*$/, '')

  // Static assets (JS, CSS, images, fonts, etc.)
  if (path.extname(clean) && clean !== '/') {
    const assetPath = path.join(WEB_ROOT, clean)
    return fs.existsSync(assetPath) ? assetPath : null
  }

  // HTML routes
  const segments = clean.split('/').filter(Boolean)
  let current = WEB_ROOT

  for (const segment of segments) {
    const direct = path.join(current, segment)
    if (fs.existsSync(direct) && fs.statSync(direct).isDirectory()) {
      current = direct
    } else {
      // Look for a dynamic segment placeholder (first available subfolder)
      try {
        const children = fs.readdirSync(current, { withFileTypes: true })
          .filter((e) => e.isDirectory() && !e.name.startsWith('_next'))
        const match = children.find((e) => e.name !== segment) ?? children[0]
        if (match) {
          current = path.join(current, match.name)
        } else {
          return null
        }
      } catch {
        return null
      }
    }
  }

  const indexHtml = path.join(current, 'index.html')
  return fs.existsSync(indexHtml) ? indexHtml : null
}

function registerProtocol(): void {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url)
    const filePath = resolveWebPath(pathname)

    if (filePath) {
      return net.fetch(pathToFileURL(filePath).href)
    }

    // Fallback: serve root index.html (Next.js will route client-side)
    const fallback = path.join(WEB_ROOT, 'index.html')
    if (fs.existsSync(fallback)) {
      return net.fetch(pathToFileURL(fallback).href)
    }

    return new Response('Not Found', { status: 404 })
  })
}

// ─── Window ────────────────────────────────────────────────────────────────
function createWindow(): BrowserWindow {
  const appIcon = nativeImage.createFromPath(path.join(__dirname, '../resources/icon.png'))

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: appIcon,
    backgroundColor: '#0A0A0A',
    // macOS: keep native traffic lights (hiddenInset), extend content under title bar
    // Windows/Linux: frameless — custom title bar rendered in the web app
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'darwin',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  })

  const startUrl = isDev ? DEV_URL : 'app://localhost/'
  win.loadURL(startUrl)

  win.once('ready-to-show', () => {
    win.show()
    if (isDev) win.webContents.openDevTools({ mode: 'detach' })
  })

  win.on('close', (e) => {
    if (process.platform !== 'darwin' && !isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })

  // Open external links in OS browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return win
}

// ─── Badge / overlay icon ──────────────────────────────────────────────────
let badgeOverlay: Electron.NativeImage | null = null

function setBadgeCount(count: number): void {
  if (process.platform === 'darwin') {
    app.setBadgeCount(count)
  } else if (process.platform === 'win32' && mainWindow) {
    if (count === 0) {
      mainWindow.setOverlayIcon(null, '')
    } else {
      if (!badgeOverlay) {
        const p = path.join(__dirname, '../resources/badge.png')
        if (fs.existsSync(p)) badgeOverlay = nativeImage.createFromPath(p)
      }
      if (badgeOverlay) mainWindow.setOverlayIcon(badgeOverlay, `${count} tin nhắn mới`)
    }
  }
  updateTrayTooltip(count)
}

// ─── Auto-updater ──────────────────────────────────────────────────────────
function setupAutoUpdater(): void {
  if (isDev) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('update-available', () => mainWindow?.webContents.send('update-available'))
  autoUpdater.on('update-downloaded', () => mainWindow?.webContents.send('update-downloaded'))
  autoUpdater.on('error', (err) => log.error('Updater error:', err))
  autoUpdater.checkForUpdatesAndNotify()
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 6 * 60 * 60 * 1000)
}

// ─── IPC ───────────────────────────────────────────────────────────────────
function registerIPC(): void {
  ipcMain.on('set-badge-count', (_, count: number) => setBadgeCount(count))

  ipcMain.on('show-notification', (_, { title, body }: { title: string; body: string }) => {
    if (!Notification.isSupported()) return
    const n = new Notification({
      title,
      body,
      icon: nativeImage.createFromPath(path.join(__dirname, '../resources/icon.png')),
    })
    n.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
    n.show()
  })

  ipcMain.on('install-update', () => autoUpdater.quitAndInstall())
  ipcMain.on('window-minimize', () => mainWindow?.minimize())
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window-close', () => mainWindow?.close())
}

// ─── CSP ───────────────────────────────────────────────────────────────────
function setupCSP(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self' app://localhost http://44.200.84.42:* https:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: http: https:",
            "media-src blob: http: https:",
            "connect-src 'self' http://44.200.84.42:* ws://44.200.84.42:* wss://44.200.84.42:*",
          ].join('; '),
        ],
      },
    })
  })
}

// ─── App lifecycle ─────────────────────────────────────────────────────────
app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    destroyTray()
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow()
  } else {
    mainWindow?.show()
  }
})

app.whenReady().then(() => {
  registerProtocol()
  setupCSP()
  mainWindow = createWindow()
  createTray(mainWindow)
  registerIPC()
  setupAutoUpdater()
  log.info(`NextTalk Desktop started [${isDev ? 'dev' : 'prod'}]`)
}).catch((err) => {
  log.error('Boot failed:', err)
  app.quit()
})
