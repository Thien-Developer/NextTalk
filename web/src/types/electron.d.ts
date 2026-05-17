export {}

declare global {
  interface Window {
    electronAPI?: {
      platform: string
      minimize: () => void
      maximize: () => void
      close: () => void
      setBadgeCount: (count: number) => void
      showNotification: (title: string, body: string, icon?: string) => void
      onUpdateAvailable: (cb: () => void) => void
      onUpdateDownloaded: (cb: () => void) => void
      installUpdate: () => void
    }
  }
}
