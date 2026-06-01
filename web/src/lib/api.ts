import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://44.200.84.42:3000'

const api = axios.create({
  baseURL: BASE_URL,
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
            `${BASE_URL}/api/auth/refresh`,
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
  logout: (refreshToken: string) => api.post('/api/auth/logout', { refreshToken }),
}

// ── Users ────────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile: () => api.get('/api/users/me'),
  updateProfile: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
    api.patch('/api/users/me', data),
  searchUsers: (q: string) => api.get('/api/users/search', { params: { q } }),
  getUserById: (id: string) => api.get(`/api/users/${id}`),
  getFriends: () => api.get('/api/users/friends'),
  getFriendRequests: () => api.get('/api/users/friend-requests'),
  sendFriendRequest: (addresseeId: string) =>
    api.post(`/api/users/${addresseeId}/friend-request`),
  respondFriendRequest: (requesterId: string, action: 'accept' | 'reject') =>
    api.patch(`/api/users/${requesterId}/friend-request/${action}`),
}

// ── Conversations ────────────────────────────────────────────────────────────
export const chatApi = {
  getConversations: () => api.get('/api/conversations'),
  createConversation: (data: { type: 'direct' | 'group'; memberIds: string[]; name?: string }) =>
    api.post('/api/conversations', data),
  getConversation: (id: string) => api.get(`/api/conversations/${id}`),
  getMessages: (id: string, params?: { before?: string; limit?: number }) =>
    api.get(`/api/conversations/${id}/messages`, { params }),
  updateGroup: (id: string, data: { name?: string; avatarUrl?: string }) =>
    api.patch(`/api/conversations/${id}`, data),
  addMembers: (id: string, memberIds: string[]) =>
    api.post(`/api/conversations/${id}/members`, { memberIds }),
  removeMember: (id: string, userId: string) =>
    api.delete(`/api/conversations/${id}/members/${userId}`),
  updateMemberRole: (id: string, userId: string, role: 'admin' | 'member') =>
    api.patch(`/api/conversations/${id}/members/${userId}/role`, { role }),
  leaveGroup: (id: string) => api.delete(`/api/conversations/${id}/leave`),
  markAsRead: (id: string) => api.post(`/api/conversations/${id}/read`),
  reactToMessage: (messageId: string, emoji: string, conversationId: string) =>
    api.post(`/api/messages/${messageId}/reactions`, { emoji, conversationId }),
  recallMessage: (messageId: string) => api.delete(`/api/messages/${messageId}`),
}

// ── Upload ───────────────────────────────────────────────────────────────────
export const uploadApi = {
  uploadFile: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ url: string; size: number; mime: string }>('/api/upload', form)
  },
}
