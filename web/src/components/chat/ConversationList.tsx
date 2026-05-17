'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Search, Plus, Users, VolumeX, Pin } from 'lucide-react'
import { clsx } from 'clsx'
import { format, isToday, isYesterday, isThisYear } from 'date-fns'
import { Avatar } from '@/components/ui/Avatar'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import type { Conversation } from '@/types'

function getConvName(conv: Conversation, myId: string) {
  if (conv.type === 'group') return conv.name ?? 'Nhóm'
  const other = conv.members.find((m) => m.userId !== myId)
  return other?.user.displayName ?? 'Unknown'
}

function getConvAvatar(conv: Conversation, myId: string) {
  if (conv.type === 'group') return conv.avatarUrl ?? null
  const other = conv.members.find((m) => m.userId !== myId)
  return other?.user.avatarUrl ?? null
}

function getOtherMemberOnline(conv: Conversation, myId: string): boolean {
  if (conv.type === 'group') return false
  const other = conv.members.find((m) => m.userId !== myId)
  if (!other?.user.lastSeen) return false
  return new Date(other.user.lastSeen).getTime() > Date.now() - 5 * 60_000
}

function getLastMessageText(conv: Conversation, myId: string) {
  const msg = conv.lastMessage
  if (!msg) return 'Bắt đầu cuộc trò chuyện'
  const isMe = msg.senderId === myId
  const prefix = isMe ? 'Bạn: ' : ''
  const typeLabels: Record<string, string> = { image: 'Hình ảnh', video: 'Video', audio: 'Âm thanh', file: 'Tệp đính kèm' }
  if (msg.type !== 'text') return `${prefix}${typeLabels[msg.type] ?? '[file]'}`
  return `${prefix}${msg.content ?? ''}`
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Hôm qua'
  if (isThisYear(d)) return format(d, 'dd/MM')
  return format(d, 'dd/MM/yy')
}

export function ConversationList() {
  const router = useRouter()
  const params = useParams()
  const activeId = params?.id as string | undefined
  const { conversations } = useChatStore()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')

  const filtered = conversations.filter((c) =>
    getConvName(c, user?.id ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  // Sort: pinned first, then by lastActivity
  const sorted = [...filtered].sort((a, b) => {
    const aPinned = a.myMembership?.isPinned ? 1 : 0
    const bPinned = b.myMembership?.isPinned ? 1 : 0
    if (aPinned !== bPinned) return bPinned - aPinned
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  })

  return (
    <div className="w-[300px] flex flex-col bg-bg-secondary border-r border-border flex-shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-text-primary text-[15px]">Tin nhắn</h2>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-hover hover:text-gold transition-colors"
            title="Tạo nhóm hoặc thêm bạn"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-tertiary rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-gold/30 transition"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-muted gap-3">
            <div className="w-14 h-14 rounded-2xl bg-bg-tertiary flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Chưa có cuộc trò chuyện</p>
              <p className="text-xs text-text-muted/70 mt-1">Thêm bạn bè để bắt đầu chat</p>
            </div>
          </div>
        ) : (
          sorted.map((conv) => {
            const name = getConvName(conv, user?.id ?? '')
            const avatarSrc = getConvAvatar(conv, user?.id ?? '')
            const lastMsg = getLastMessageText(conv, user?.id ?? '')
            const isActive = conv.id === activeId
            const time = conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ''
            const unread = conv.unreadCount ?? 0
            const isMuted = conv.myMembership?.isMuted ?? false
            const isPinned = conv.myMembership?.isPinned ?? false
            const isOnline = getOtherMemberOnline(conv, user?.id ?? '')

            return (
              <button
                key={conv.id}
                onClick={() => router.push(`/chat/${conv.id}`)}
                className={clsx(
                  'w-full text-left flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl transition-colors duration-100',
                  isActive
                    ? 'bg-gold/10 border border-gold/15'
                    : 'hover:bg-bg-hover border border-transparent',
                )}
                style={{ width: 'calc(100% - 8px)' }}
              >
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={avatarSrc}
                    name={name}
                    size="md"
                    online={conv.type === 'direct' ? isOnline : undefined}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isPinned && <Pin className="w-2.5 h-2.5 text-gold flex-shrink-0" />}
                      <span className={clsx(
                        'text-[13px] font-medium truncate',
                        isActive ? 'text-gold' : unread > 0 ? 'text-text-primary font-semibold' : 'text-text-primary',
                      )}>
                        {name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isMuted && <VolumeX className="w-2.5 h-2.5 text-text-muted" />}
                      {time && <span className={clsx('text-[11px]', unread > 0 ? 'text-gold' : 'text-text-muted')}>{time}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className={clsx(
                      'text-xs truncate',
                      unread > 0 ? 'text-text-secondary font-medium' : 'text-text-muted',
                    )}>
                      {lastMsg}
                    </p>
                    {unread > 0 && !isMuted && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-gold text-bg-primary text-[10px] font-bold flex items-center justify-center px-1">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                    {unread > 0 && isMuted && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-text-muted" />
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
