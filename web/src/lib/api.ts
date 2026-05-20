import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://44.200.84.42:3000/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${refreshToken}` } },
          )
          localStorage.setItem('accessToken', data.accessToken)
          localStorage.setItem('refreshToken', data.refreshToken)
          original.headers.Authorization = `Bearer ${data.accessToken}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  },
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
}

// ── Users ────────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
    api.patch('/user/profile', data),
  searchByPhone: (phone: string) => api.get('/user/search', { params: { phone } }),
  getUserById: (id: string) => api.get(`/user/${id}`),
  getFriends: () => api.get('/user/friends'),
  getFriendRequests: () => api.get('/user/friend-requests'),
  sendFriendRequest: (addresseeId: string) => api.post('/user/friend-requests', { addresseeId }),
  respondFriendRequest: (requesterId: string, action: 'accept' | 'reject') =>
    api.patch(`/user/friend-requests/${requesterId}`, { action }),
}

// ── Conversations ────────────────────────────────────────────────────────────
export const chatApi = {
  getConversations: () => api.get('/conversations'),
  createConversation: (data: { type: 'direct' | 'group'; memberIds: string[]; name?: string }) =>
    api.post('/conversations', data),
  getConversation: (id: string) => api.get(`/conversations/${id}`),
  getMessages: (id: string, params?: { before?: string; limit?: number }) =>
    api.get(`/conversations/${id}/messages`, { params }),
  updateGroup: (id: string, data: { name?: string; avatarUrl?: string }) =>
    api.patch(`/conversations/${id}`, data),
  addMembers: (id: string, memberIds: string[]) =>
    api.post(`/conversations/${id}/members`, { memberIds }),
  removeMember: (id: string, userId: string) =>
    api.delete(`/conversations/${id}/members/${userId}`),
  updateMemberRole: (id: string, userId: string, role: 'admin' | 'member') =>
    api.patch(`/conversations/${id}/members/${userId}/role`, { role }),
  leaveGroup: (id: string) => api.delete(`/conversations/${id}/leave`),
  markAsRead: (id: string) => api.post(`/conversations/${id}/read`),
  reactToMessage: (messageId: string, emoji: string, conversationId: string) =>
    api.post(`/messages/${messageId}/reactions`, { emoji, conversationId }),
  recallMessage: (messageId: string) => api.delete(`/messages/${messageId}`),
}

// ── Upload ───────────────────────────────────────────────────────────────────
export const uploadApi = {
  uploadFile: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ url: string; size: number; mime: string }>('/upload', form)
  },
}
