import { ConversationList } from '@/components/chat/ConversationList'
import { MessageSquare } from 'lucide-react'

export default function ChatPage() {
  return (
    <>
      <ConversationList />
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="text-center text-text-muted space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-bg-tertiary flex items-center justify-center mx-auto">
            <MessageSquare className="w-8 h-8 text-text-muted" />
          </div>
          <p className="font-medium text-text-secondary">Chọn một cuộc trò chuyện</p>
          <p className="text-sm">Hoặc bắt đầu cuộc trò chuyện mới</p>
        </div>
      </div>
    </>
  )
}
