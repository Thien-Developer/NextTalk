'use client'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { chatApi } from '@/lib/api'
import { useChatStore } from '@/stores/chatStore'

export function useConversations() {
  const { setConversations } = useChatStore()

  const query = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await chatApi.getConversations()
      return res.data
    },
  })

  useEffect(() => {
    if (query.data) setConversations(query.data)
  }, [query.data, setConversations])

  return query
}

export function useMessages(conversationId: string | null) {
  const { setMessages, prependMessages } = useChatStore()

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const res = await chatApi.getMessages(conversationId!, { limit: 50 })
      return res.data as import('@/types').Message[]
    },
    enabled: !!conversationId,
  })

  useEffect(() => {
    if (query.data && conversationId) setMessages(conversationId, query.data)
  }, [query.data, conversationId, setMessages])

  const loadMore = async (before: string) => {
    if (!conversationId) return
    const res = await chatApi.getMessages(conversationId, { before, limit: 50 })
    prependMessages(conversationId, res.data as import('@/types').Message[])
  }

  return { ...query, loadMore }
}
