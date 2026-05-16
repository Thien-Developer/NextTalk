import { create } from 'zustand'
import type { Conversation, Message } from '@/types'

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<string, Message[]>
  typingUsers: Record<string, string[]>

  setConversations: (convs: Conversation[]) => void
  upsertConversation: (conv: Conversation) => void
  setActiveConversation: (id: string | null) => void
  setMessages: (convId: string, msgs: Message[]) => void
  prependMessages: (convId: string, msgs: Message[]) => void
  addMessage: (msg: Message) => void
  updateMessage: (msgId: string, data: Partial<Message>) => void
  setTyping: (convId: string, userId: string, isTyping: boolean) => void
  updateLastMessage: (convId: string, msg: Conversation['lastMessage']) => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},

  setConversations: (conversations) => set({ conversations }),

  upsertConversation: (conv) =>
    set((s) => {
      const idx = s.conversations.findIndex((c) => c.id === conv.id)
      const next = [...s.conversations]
      if (idx >= 0) next[idx] = conv
      else next.unshift(conv)
      return { conversations: next }
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (convId, msgs) =>
    set((s) => ({ messages: { ...s.messages, [convId]: msgs } })),

  prependMessages: (convId, msgs) =>
    set((s) => ({
      messages: { ...s.messages, [convId]: [...msgs, ...(s.messages[convId] ?? [])] },
    })),

  addMessage: (msg) =>
    set((s) => {
      const existing = s.messages[msg.conversationId] ?? []
      if (existing.some((m) => m.id === msg.id)) return s
      return {
        messages: { ...s.messages, [msg.conversationId]: [...existing, msg] },
        conversations: s.conversations.map((c) =>
          c.id === msg.conversationId
            ? { ...c, lastMessage: msg, lastActivity: msg.createdAt }
            : c,
        ),
      }
    }),

  updateMessage: (msgId, data) =>
    set((s) => {
      const next = { ...s.messages }
      for (const convId in next) {
        const idx = next[convId].findIndex((m) => m.id === msgId)
        if (idx >= 0) {
          next[convId] = [...next[convId]]
          next[convId][idx] = { ...next[convId][idx], ...data }
          break
        }
      }
      return { messages: next }
    }),

  setTyping: (convId, userId, isTyping) =>
    set((s) => {
      const current = s.typingUsers[convId] ?? []
      const next = isTyping
        ? Array.from(new Set([...current, userId]))
        : current.filter((id) => id !== userId)
      return { typingUsers: { ...s.typingUsers, [convId]: next } }
    }),

  updateLastMessage: (convId, msg) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, lastMessage: msg } : c,
      ),
    })),
}))
