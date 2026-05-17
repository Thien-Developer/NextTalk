'use client'
import { ConversationList } from '@/components/chat/ConversationList'
import { MessageSquare } from 'lucide-react'

export default function ChatPage() {
  return (
    <>
      <ConversationList />
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary gap-5 select-none">
        <div className="w-20 h-20 rounded-3xl bg-gold/10 border border-gold/20 flex items-center justify-center">
          <MessageSquare className="w-9 h-9 text-gold" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-semibold text-text-primary">Chào mừng đến NextTalk</h3>
          <p className="text-sm text-text-muted max-w-xs leading-relaxed">
            Chọn cuộc trò chuyện bên trái hoặc tìm kiếm bạn bè để bắt đầu nhắn tin.
          </p>
        </div>
        <div className="flex items-center gap-6 text-xs text-text-muted mt-2">
          {(['💬 Nhắn tin', '📞 Gọi thoại', '🎥 Video call', '📎 Chia sẻ file'] as const).map((item) => {
            const [emoji, ...rest] = item.split(' ')
            return (
              <div key={item} className="flex flex-col items-center gap-1.5">
                <div className="w-9 h-9 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-base">{emoji}</div>
                <span>{rest.join(' ')}</span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
