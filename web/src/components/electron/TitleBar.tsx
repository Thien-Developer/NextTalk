'use client'
import { useState, useEffect } from 'react'
import { Minus, Square, X } from 'lucide-react'

export function TitleBar() {
  const [isElectron, setIsElectron] = useState(false)
  const [isWin, setIsWin] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (api) {
      setIsElectron(true)
      setIsWin(api.platform === 'win32')
    }
  }, [])

  if (!isElectron || !isWin) return null

  const minimize = () => window.electronAPI?.minimize()
  const maximize = () => window.electronAPI?.maximize()
  const close = () => window.electronAPI?.close()

  return (
    <div
      className="flex items-center justify-between h-9 bg-bg-secondary border-b border-border select-none flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Logo + app name */}
      <div className="flex items-center gap-2 px-4">
        <div className="w-5 h-5 rounded bg-gold flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-black text-bg-primary leading-none">N</span>
        </div>
        <span className="text-xs font-semibold text-text-primary">NextTalk</span>
      </div>

      {/* Window controls — must be no-drag */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={minimize}
          className="w-11 h-full flex items-center justify-center text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors"
          aria-label="Thu nhỏ"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={maximize}
          className="w-11 h-full flex items-center justify-center text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors"
          aria-label="Phóng to"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={close}
          className="w-11 h-full flex items-center justify-center text-text-muted hover:bg-red-500 hover:text-white transition-colors"
          aria-label="Đóng"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// Invisible spacer so content doesn't render under the title bar area on Mac
export function TitleBarSpacer() {
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    if (window.electronAPI?.platform === 'darwin') setIsMac(true)
  }, [])
  if (!isMac) return null
  return <div className="h-7 flex-shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
}
