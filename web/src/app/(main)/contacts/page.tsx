'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, UserPlus, Check, X, MessageSquare } from 'lucide-react'
import { userApi } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import toast from 'react-hot-toast'
import type { User } from '@/types'

type PublicUser = Pick<User, 'id' | 'displayName' | 'avatarUrl' | 'phone'>

export default function ContactsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: friends } = useQuery({ queryKey: ['friends'], queryFn: async () => (await userApi.getFriends()).data })
  const { data: requests } = useQuery({ queryKey: ['friend-requests'], queryFn: async () => (await userApi.getFriendRequests()).data })
  const { data: searchResults } = useQuery({
    queryKey: ['search-users', search],
    queryFn: async () => (await userApi.searchByPhone(search)).data,
    enabled: search.length >= 3,
  })

  const sendReq = useMutation({
    mutationFn: (id: string) => userApi.sendFriendRequest(id),
    onSuccess: () => { toast.success('Đã gửi lời mời kết bạn'); qc.invalidateQueries({ queryKey: ['friends'] }) },
    onError: () => toast.error('Không thể gửi lời mời'),
  })

  const respond = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'reject' }) => userApi.respondFriendRequest(id, action),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['friends', 'friend-requests'] }); toast.success('Đã xử lý') },
  })

  return (
    <div className="flex-1 flex flex-col bg-bg-primary">
      <header className="px-6 py-4 border-b border-border bg-bg-secondary">
        <h2 className="font-semibold text-text-primary mb-3">Danh bạ</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo số điện thoại (≥3 ký tự)"
            className="input-field pl-9 text-sm" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Search results */}
        {search.length >= 3 && searchResults && (
          <section>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Kết quả tìm kiếm</h3>
            {searchResults.map((u: PublicUser) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-bg-hover">
                <Avatar src={u.avatarUrl} name={u.displayName} size="md" />
                <div className="flex-1"><p className="font-medium text-text-primary">{u.displayName}</p><p className="text-xs text-text-muted">{u.phone}</p></div>
                <button onClick={() => sendReq.mutate(u.id)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                  <UserPlus className="w-3 h-3" /> Kết bạn
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Pending requests */}
        {requests?.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Lời mời kết bạn ({requests.length})</h3>
            {requests.map((req: { requesterId: string; requester: PublicUser }) => (
              <div key={req.requesterId} className="flex items-center gap-3 p-3 rounded-xl hover:bg-bg-hover">
                <Avatar src={req.requester.avatarUrl} name={req.requester.displayName} size="md" />
                <div className="flex-1"><p className="font-medium text-text-primary">{req.requester.displayName}</p><p className="text-xs text-text-muted">{req.requester.phone}</p></div>
                <div className="flex gap-2">
                  <button onClick={() => respond.mutate({ id: req.requesterId, action: 'accept' })} className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center hover:bg-gold/30"><Check className="w-4 h-4" /></button>
                  <button onClick={() => respond.mutate({ id: req.requesterId, action: 'reject' })} className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Friends */}
        <section>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Bạn bè ({friends?.length ?? 0})</h3>
          {friends?.map((f: PublicUser) => (
            <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-bg-hover">
              <Avatar src={f.avatarUrl} name={f.displayName} size="md" />
              <div className="flex-1"><p className="font-medium text-text-primary">{f.displayName}</p><p className="text-xs text-text-muted">{f.phone}</p></div>
              <button className="w-8 h-8 rounded-lg bg-bg-hover flex items-center justify-center text-text-muted hover:text-gold"><MessageSquare className="w-4 h-4" /></button>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
