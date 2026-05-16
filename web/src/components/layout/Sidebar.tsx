'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { MessageSquare, Phone, Users, Settings, LogOut } from 'lucide-react'
import { clsx } from 'clsx'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/lib/api'
import { disconnectSockets } from '@/lib/socket'
import toast from 'react-hot-toast'

const navItems = [
  { href: '/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/calls', icon: Phone, label: 'Calls' },
  { href: '/contacts', icon: Users, label: 'Contacts' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, refreshToken, logout } = useAuthStore()

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {}
    disconnectSockets()
    logout()
    router.replace('/login')
    toast.success('Đã đăng xuất')
  }

  return (
    <aside className="w-16 flex flex-col items-center py-4 gap-2 bg-bg-secondary border-r border-border flex-shrink-0">
      {/* Logo */}
      <Link href="/chat" className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center mb-3 flex-shrink-0">
        <span className="text-lg font-black text-bg-primary">N</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-150',
              pathname.startsWith(href)
                ? 'bg-gold/20 text-gold'
                : 'text-text-muted hover:bg-bg-hover hover:text-text-primary',
            )}
          >
            <Icon className="w-5 h-5" />
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        <Link href="/settings" title="Settings"
          className={clsx('w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-150',
            pathname.startsWith('/settings') ? 'bg-gold/20 text-gold' : 'text-text-muted hover:bg-bg-hover hover:text-text-primary'
          )}>
          <Settings className="w-5 h-5" />
        </Link>

        <button onClick={handleLogout} title="Đăng xuất"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors duration-150">
          <LogOut className="w-5 h-5" />
        </button>

        {user && (
          <Link href="/settings/profile">
            <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
          </Link>
        )}
      </div>
    </aside>
  )
}
