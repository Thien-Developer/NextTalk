'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Phone, Video, Info, Loader2 } from 'lucide-react'
import { ConversationList } from '@/components/chat/ConversationList'
import { MessageItem } from '@/components/chat/MessageItem'
import { MessageInput } from '@/components/chat/MessageInput'
import { Avatar } from '@/components/ui/Avatar'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { useSocket } from '@/hooks/useSocket'
import { useMessages } from '@/hooks/useConversations'
import { useCall } from '@/contexts/CallContext'
import { chatApi } from '@/lib/api'
import toast from 'react-hot-toast'
import type { Message, Conversation } from '@/types'

function getOtherMember(conv: Conversation, myId: string) {
  return conv.members.find((m) => m.userId !== myId)
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const { conversations, messages, typingUsers, setActiveConversation, updateMessage } = useChatStore()
  const { sendMessage, sendTyping, sendReadReceipt } = useSocket()
  const { isLoading, loadMore } = useMessages(id)
  const { initiateCall } = useCall()

  const conv = conversations.find((c) => c.id === id)
  const msgs = messages[id] ?? []
  const typing = typingUsers[id] ?? []
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    setActiveConversation(id)
    sendReadReceipt(id)
    return () => setActiveConversation(null)
  }, [id, setActiveConversation, sendReadReceipt])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs.length])

  type SendPayload = { type: string; content?: string; mediaUrl?: string; mediaSize?: number; mediaMime?: string; replyToId?: string }
  const handleSend = useCallback((payload: SendPayload) => {
    sendMessage({ ...payload, conversationId: id })
  }, [id, sendMessage])

  const handleTyping = useCallback((isTyping: boolean) => {
    sendTyping(id, isTyping)
  }, [id, sendTyping])

  const handleRecall = async (msgId: string) => {
    try {
      await chatApi.recallMessage(msgId)
      updateMessage(msgId, { isDeleted: true, content: undefined })
      toast.success('Đã thu hồi tin nhắn')
    } catch { toast.error('Không thể thu hồi') }
  }

  const handleScrollTop = async () => {
    if (loadingMore || msgs.length === 0) return
    setLoadingMore(true)
    try { await loadMore(msgs[0].id) } finally { setLoadingMore(false) }
  }

  if (!conv) return (
    <>
      <ConversationList />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    </>
  )

  const isGroup = conv.type === 'group'
  const other = !isGroup ? getOtherMember(conv, user?.id ?? '') : null
  const name = isGroup ? (conv.name ?? 'Nhóm') : (other?.user.displayName ?? 'Unknown')
  const avatarSrc = isGroup ? conv.avatarUrl : other?.user.avatarUrl
  const isOnline = !isGroup && other?.user.lastSeen
    ? new Date(other.user.lastSeen).getTime() > Date.now() - 5 * 60_000
    : false

  return (
    <>
      <ConversationList />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-secondary flex-shrink-0">
          <Avatar src={avatarSrc} name={name} size="md" online={isGroup ? undefined : isOnline} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary truncate">{name}</h3>
            <p className="text-xs text-text-muted">
              {isGroup ? `${conv.members.length} thành viên` : isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {!isGroup && other && (
              <>
                <button
                  onClick={() => initiateCall(other.userId, 'audio', id)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-gold hover:bg-bg-hover transition-colors"
                  title="Gọi thoại"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => initiateCall(other.userId, 'video', id)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-gold hover:bg-bg-hover transition-colors"
                  title="Gọi video"
                >
                  <Video className="w-4 h-4" />
                </button>
              </>
            )}
            <button className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-gold hover:bg-bg-hover transition-colors">
              <Info className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1" onScroll={(e) => { if ((e.target as HTMLDivElement).scrollTop < 50) handleScrollTop() }}>
          {loadingMore && <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-gold" /></div>}
          {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>}
          {msgs.map((msg, idx) => {
            const isMe = msg.senderId === user?.id
            const prevMsg = msgs[idx - 1]
            const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId
            return (
              <MessageItem
                key={msg.id}
                message={msg}
                isMe={isMe}
                showAvatar={showAvatar}
                onReply={setReplyTo}
                onRecall={handleRecall}
              />
            )
          })}
          {/* Typing indicator */}
          {typing.filter((id) => id !== user?.id).length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1 px-3 py-2 bg-bg-tertiary rounded-2xl rounded-bl-sm">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <MessageInput
          conversationId={id}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          onSend={handleSend}
          onTyping={handleTyping}
        />
      </div>
    </>
  )
}
