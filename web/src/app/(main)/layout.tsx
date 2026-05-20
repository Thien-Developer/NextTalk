'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { IncomingCallModal } from '@/components/call/IncomingCallModal'
import { ActiveCallModal } from '@/components/call/ActiveCallModal'
import { TitleBar } from '@/components/electron/TitleBar'
import { CallProvider } from '@/contexts/CallContext'
import { useAuthStore } from '@/stores/authStore'
import { useSocket } from '@/hooks/useSocket'
import { useConversations } from '@/hooks/useConversations'

function SocketInitializer() {
  useSocket()
  useConversations()
  return null
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, _hasHydrated } = useAuthStore()

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated()) router.replace('/login')
  }, [_hasHydrated, isAuthenticated, router])

  // Show loading skeleton while Zustand rehydrates from localStorage
  if (!_hasHydrated) {
    return (
      <div className="h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated()) return null

  return (
    <div className="h-screen flex flex-col bg-bg-primary overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <SocketInitializer />
        <IncomingCallModal />
        <ActiveCallModal />
        <Sidebar />
        <main className="flex-1 flex min-w-0">{children}</main>
      </div>
    </div>
  )
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <CallProvider>
      <LayoutInner>{children}</LayoutInner>
    </CallProvider>
  )
}
