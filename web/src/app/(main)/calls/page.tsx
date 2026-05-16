'use client'
import { useQuery } from '@tanstack/react-query'
import { Phone, PhoneIncoming, PhoneMissed, PhoneOff, Video } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { clsx } from 'clsx'
import api from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/authStore'
import type { Call } from '@/types'

const statusIcon = {
  ended: Phone,
  accepted: Phone,
  rejected: PhoneOff,
  missed: PhoneMissed,
  busy: PhoneOff,
  ringing: PhoneIncoming,
}

const statusColor = {
  ended: 'text-text-secondary',
  accepted: 'text-status-online',
  rejected: 'text-red-400',
  missed: 'text-red-400',
  busy: 'text-text-muted',
  ringing: 'text-gold',
}

const statusLabel = {
  ended: 'Đã kết thúc',
  accepted: 'Đã kết nối',
  rejected: 'Bị từ chối',
  missed: 'Nhỡ',
  busy: 'Bận',
  ringing: 'Đang đổ chuông',
}

function formatDuration(seconds?: number) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60), s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function CallsPage() {
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: async () => {
      const res = await api.get('/calls/history')
      return res.data as Call[]
    },
  })

  return (
    <div className="flex-1 flex flex-col bg-bg-primary">
      <header className="px-6 py-4 border-b border-border bg-bg-secondary">
        <h2 className="font-semibold text-text-primary">Lịch sử cuộc gọi</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary animate-pulse">
                <div className="w-10 h-10 rounded-full bg-bg-tertiary" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-bg-tertiary rounded w-1/3" />
                  <div className="h-2 bg-bg-tertiary rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {data?.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted gap-2">
            <Phone className="w-8 h-8" />
            <p>Chưa có cuộc gọi nào</p>
          </div>
        )}

        <div className="space-y-1">
          {data?.map((call) => {
            const isMe = call.callerId === user?.id
            const other = isMe ? call.callee : call.caller
            const Icon = statusIcon[call.status] ?? Phone
            return (
              <div key={call.id} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-bg-hover transition-colors cursor-pointer">
                <Avatar src={other.avatarUrl} name={other.displayName} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{other.displayName}</span>
                    {call.type === 'video' && <Video className="w-3 h-3 text-text-muted" />}
                  </div>
                  <div className={clsx('flex items-center gap-1 text-xs mt-0.5', statusColor[call.status])}>
                    <Icon className="w-3 h-3" />
                    <span>{isMe ? 'Gọi đi' : 'Gọi đến'} · {statusLabel[call.status]}</span>
                    {call.duration && <span>· {formatDuration(call.duration)}</span>}
                  </div>
                </div>
                <span className="text-xs text-text-muted">
                  {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true, locale: vi })}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
