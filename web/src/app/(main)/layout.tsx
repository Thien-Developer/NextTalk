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
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login')
  }, [isAuthenticated, router])

  if (!isAuthenticated()) return null

  return (
    <div className="h-screen flex flex-col bg-bg-primary overflow-hidden">
      {/* Custom title bar for Electron on Windows */}
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
