'use client'
import { useState, useRef, useCallback } from 'react'
import { Send, Paperclip, X } from 'lucide-react'
import { clsx } from 'clsx'
import { uploadApi } from '@/lib/api'
import toast from 'react-hot-toast'
import type { Message } from '@/types'

interface Props {
  conversationId?: string
  replyTo?: Message | null
  onClearReply?: () => void
  onSend: (payload: { type: string; content?: string; mediaUrl?: string; mediaSize?: number; mediaMime?: string; replyToId?: string }) => void
  onTyping: (isTyping: boolean) => void
}

export function MessageInput({ replyTo, onClearReply, onSend, onTyping }: Props) {
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const typingTimer = useRef<ReturnType<typeof setTimeout>>()
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    onTyping(true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => onTyping(false), 1500)

    // Auto-resize
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }
  }

  const handleSend = useCallback(() => {
    const content = text.trim()
    if (!content) return
    onSend({ type: 'text', content, replyToId: replyTo?.id })
    setText('')
    onClearReply?.()
    onTyping(false)
    clearTimeout(typingTimer.current)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [text, replyTo, onSend, onClearReply, onTyping])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { data } = await uploadApi.uploadFile(file)
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file'
      onSend({ type, mediaUrl: data.url, mediaSize: data.size, mediaMime: data.mime, replyToId: replyTo?.id })
      onClearReply?.()
    } catch {
      toast.error('Upload thất bại')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="border-t border-border bg-bg-secondary p-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-bg-tertiary border-l-2 border-gold">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-gold">{replyTo.sender.displayName}</span>
            <p className="text-xs text-text-muted truncate">{replyTo.content ?? `[${replyTo.type}]`}</p>
          </div>
          <button onClick={onClearReply} className="text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input type="file" ref={fileRef} onChange={handleFile} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-gold hover:bg-bg-hover transition-colors flex-shrink-0"
        >
          {uploading ? <span className="animate-spin w-4 h-4 border-2 border-text-muted border-t-gold rounded-full" /> : <Paperclip className="w-5 h-5" />}
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          rows={1}
          className="flex-1 bg-bg-tertiary rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-gold/30 max-h-[120px] overflow-y-auto"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className={clsx(
            'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
            text.trim() ? 'bg-gold text-bg-primary hover:bg-gold-light' : 'bg-bg-hover text-text-muted cursor-not-allowed',
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
