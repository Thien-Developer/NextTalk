export interface User {
  id: string
  phone: string
  displayName: string
  avatarUrl?: string
  bio?: string
  role: 'user' | 'admin' | 'superadmin'
  status: 'active' | 'banned'
  lastSeen?: string
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file'
  content?: string
  mediaUrl?: string
  mediaSize?: number
  mediaMime?: string
  replyToId?: string
  isDeleted: boolean
  deletedAt?: string
  createdAt: string
  sender: Pick<User, 'id' | 'displayName' | 'avatarUrl' | 'phone'>
  replyTo?: Pick<Message, 'id' | 'content' | 'type' | 'senderId' | 'sender'>
  reactions: MessageReaction[]
}

export interface MessageReaction {
  emoji: string
  userId: string
  user: Pick<User, 'id' | 'displayName'>
}

export interface ConversationMember {
  userId: string
  role: 'admin' | 'member'
  lastReadSeq: string
  isMuted: boolean
  isPinned: boolean
  joinedAt: string
  user: Pick<User, 'id' | 'displayName' | 'avatarUrl' | 'lastSeen'>
}

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  name?: string
  avatarUrl?: string
  lastActivity: string
  createdAt: string
  members: ConversationMember[]
  lastMessage?: Pick<Message, 'id' | 'type' | 'content' | 'senderId' | 'createdAt'>
  unreadCount?: number
  myMembership?: {
    lastReadSeq: string
    isMuted: boolean
    isPinned: boolean
    role: 'admin' | 'member'
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface Call {
  id: string
  callerId: string
  calleeId: string
  type: 'audio' | 'video'
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed' | 'busy'
  startedAt?: string
  endedAt?: string
  duration?: number
  createdAt: string
  caller: Pick<User, 'id' | 'displayName' | 'avatarUrl'>
  callee: Pick<User, 'id' | 'displayName' | 'avatarUrl'>
}

export interface IncomingCall {
  callId: string
  caller: Pick<User, 'id' | 'displayName' | 'avatarUrl'>
  type: 'audio' | 'video'
  offer: RTCSessionDescriptionInit
  conversationId?: string
}
