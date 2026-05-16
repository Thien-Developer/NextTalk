'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Search, Plus, Users } from 'lucide-react'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
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

function getLastMessageText(conv: Conversation, myId: string) {
  const msg = conv.lastMessage
  if (!msg) return 'Bắt đầu cuộc trò chuyện'
  const isMe = msg.senderId === myId
  const prefix = isMe ? 'Bạn: ' : ''
  if (msg.type !== 'text') return `${prefix}[${msg.type}]`
  return `${prefix}${msg.content ?? ''}`
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

  return (
    <div className="w-72 flex flex-col bg-bg-secondary border-r border-border flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-text-primary">Tin nhắn</h2>
          <button className="w-8 h-8 rounded-lg bg-bg-hover flex items-center justify-center text-text-secondary hover:text-gold transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-tertiary rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-gold/30"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted gap-2">
            <Users className="w-8 h-8" />
            <p className="text-sm">Chưa có cuộc trò chuyện</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const name = getConvName(conv, user?.id ?? '')
            const avatarSrc = getConvAvatar(conv, user?.id ?? '')
            const lastMsg = getLastMessageText(conv, user?.id ?? '')
            const isActive = conv.id === activeId
            const time = conv.lastMessage
              ? formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false, locale: vi })
              : ''

            return (
              <button
                key={conv.id}
                onClick={() => router.push(`/chat/${conv.id}`)}
                className={clsx(
                  'sidebar-item w-full text-left mx-2 my-0.5',
                  isActive && 'active',
                )}
              >
                <Avatar src={avatarSrc} name={name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={clsx('font-medium text-sm truncate', isActive ? 'text-gold' : 'text-text-primary')}>
                      {name}
                    </span>
                    {time && <span className="text-xs text-text-muted flex-shrink-0">{time}</span>}
                  </div>
                  <p className="text-xs text-text-muted truncate mt-0.5">{lastMsg}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
