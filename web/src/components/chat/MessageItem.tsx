'use client'
import { format } from 'date-fns'
import { clsx } from 'clsx'
import { CornerUpLeft, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { Message } from '@/types'

interface Props {
  message: Message
  isMe: boolean
  showAvatar: boolean
  onReply?: (msg: Message) => void
  onRecall?: (msgId: string) => void
}

export function MessageItem({ message, isMe, showAvatar, onReply, onRecall }: Props) {
  if (message.isDeleted) {
    return (
      <div className={clsx('flex items-end gap-2 group', isMe && 'flex-row-reverse')}>
        {showAvatar && !isMe ? <Avatar src={message.sender.avatarUrl} name={message.sender.displayName} size="xs" /> : <div className="w-6" />}
        <div className="px-3 py-2 rounded-2xl bg-bg-tertiary border border-border max-w-xs">
          <p className="text-xs text-text-muted italic">Tin nhắn đã bị thu hồi</p>
        </div>
      </div>
    )
  }

  const groupedReactions = message.reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className={clsx('flex items-end gap-2 group', isMe && 'flex-row-reverse')}>
      {/* Avatar */}
      {showAvatar && !isMe ? (
        <Avatar src={message.sender.avatarUrl} name={message.sender.displayName} size="xs" />
      ) : (
        <div className="w-6" />
      )}

      <div className={clsx('flex flex-col', isMe && 'items-end')}>
        {/* Sender name (group) */}
        {showAvatar && !isMe && (
          <span className="text-xs text-text-muted mb-1 ml-1">{message.sender.displayName}</span>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div className={clsx(
            'text-xs px-3 py-1.5 rounded-t-xl mb-0.5 border-l-2 border-gold bg-bg-tertiary',
            isMe ? 'text-right' : 'text-left'
          )}>
            <span className="text-gold font-medium">{message.replyTo.sender?.displayName}</span>
            <p className="text-text-muted truncate max-w-[180px]">{message.replyTo.content ?? `[${message.replyTo.type}]`}</p>
          </div>
        )}

        <div className="relative">
          {/* Bubble */}
          <div
            className={clsx(
              'relative max-w-xs lg:max-w-sm xl:max-w-md px-3 py-2 rounded-2xl',
              isMe
                ? 'bg-bubble-sent text-bubble-sent-text rounded-br-sm'
                : 'bg-bubble-received text-bubble-received-text rounded-bl-sm',
              message.replyTo && 'rounded-tl-none rounded-tr-none',
            )}
          >
            {message.type === 'text' && (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            )}
            {(message.type === 'image') && message.mediaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={message.mediaUrl} alt="media" className="rounded-lg max-w-full max-h-64 object-cover" />
            )}
            {message.type === 'file' && message.mediaUrl && (
              <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm underline">
                📎 Tệp đính kèm
              </a>
            )}
            <span className={clsx('text-xs mt-1 block', isMe ? 'text-bg-primary/50' : 'text-text-muted')}>
              {format(new Date(message.createdAt), 'HH:mm')}
            </span>
          </div>

          {/* Hover actions */}
          <div className={clsx(
            'absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
            isMe ? '-left-16' : '-right-16'
          )}>
            <button onClick={() => onReply?.(message)}
              className="w-7 h-7 rounded-full bg-bg-tertiary border border-border flex items-center justify-center text-text-muted hover:text-gold transition-colors">
              <CornerUpLeft className="w-3 h-3" />
            </button>
            {isMe && (
              <button onClick={() => onRecall?.(message.id)}
                className="w-7 h-7 rounded-full bg-bg-tertiary border border-border flex items-center justify-center text-text-muted hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex gap-1 mt-1">
            {Object.entries(groupedReactions).map(([emoji, count]) => (
              <span key={emoji} className="text-xs bg-bg-tertiary border border-border rounded-full px-1.5 py-0.5">
                {emoji} {count > 1 && count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
