'use client'
import { useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { getChatSocket } from '@/lib/socket'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import type { Message } from '@/types'

export function useSocket() {
  const { accessToken } = useAuthStore()
  const { addMessage, updateMessage, setTyping } = useChatStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const socket = getChatSocket(accessToken)
    socketRef.current = socket

    socket.on('new_message', (msg: Message) => addMessage(msg))

    socket.on('message_recalled', ({ id, isDeleted, deletedAt }: { id: string; isDeleted: boolean; deletedAt: string }) =>
      updateMessage(id, { isDeleted, deletedAt, content: undefined }),
    )

    socket.on('typing', ({ userId, conversationId, isTyping }: { userId: string; conversationId: string; isTyping: boolean }) =>
      setTyping(conversationId, userId, isTyping),
    )

    socket.on('message_reaction', ({ messageId, reactions }: { messageId: string; reactions: Message['reactions'] }) =>
      updateMessage(messageId, { reactions }),
    )

    return () => {
      socket.off('new_message')
      socket.off('message_recalled')
      socket.off('typing')
      socket.off('message_reaction')
    }
  }, [accessToken, addMessage, updateMessage, setTyping])

  const sendMessage = (payload: {
    conversationId: string
    type: string
    content?: string
    mediaUrl?: string
    mediaSize?: number
    mediaMime?: string
    replyToId?: string
  }) => {
    socketRef.current?.emit('send_message', payload)
  }

  const sendTyping = (conversationId: string, isTyping: boolean) => {
    socketRef.current?.emit('typing', { conversationId, isTyping })
  }

  const sendReadReceipt = (conversationId: string) => {
    socketRef.current?.emit('read_receipt', { conversationId })
  }

  return { socket: socketRef.current, sendMessage, sendTyping, sendReadReceipt }
}
