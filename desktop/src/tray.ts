import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import * as path from 'path'

let tray: Tray | null = null

export function createTray(win: BrowserWindow): Tray {
  const iconPath = path.join(__dirname, '../resources/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)

  // macOS: use template image (black/white) for menu bar
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true)
  }

  tray = new Tray(icon)
  tray.setToolTip('NextTalk')

  const menu = Menu.buildFromTemplate([
    {
      label: 'Mở NextTalk',
      click: () => {
        win.show()
        win.focus()
      },
    },
    { type: 'separator' },
    {
      label: 'Thoát',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(menu)

  tray.on('click', () => {
    if (win.isVisible()) {
      if (win.isMinimized()) win.restore()
      win.focus()
    } else {
      win.show()
    }
  })

  tray.on('double-click', () => {
    win.show()
    win.focus()
  })

  return tray
}

export function updateTrayTooltip(count: number): void {
  if (!tray) return
  tray.setToolTip(count > 0 ? `NextTalk (${count} tin nhắn mới)` : 'NextTalk')
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
