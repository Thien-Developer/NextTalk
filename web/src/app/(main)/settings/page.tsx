'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Camera } from 'lucide-react'
import { userApi } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')

  const update = useMutation({
    mutationFn: () => userApi.updateProfile({ displayName, bio }),
    onSuccess: ({ data }) => { setUser({ ...user!, ...data }); toast.success('Đã cập nhật hồ sơ') },
    onError: () => toast.error('Cập nhật thất bại'),
  })

  return (
    <div className="flex-1 flex flex-col bg-bg-primary max-w-xl mx-auto w-full p-6">
      <h2 className="font-semibold text-text-primary text-lg mb-6">Hồ sơ cá nhân</h2>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <Avatar src={user?.avatarUrl} name={user?.displayName ?? ''} size="xl" />
          <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gold text-bg-primary flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <p className="text-text-muted text-xs mt-2">{user?.phone}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Tên hiển thị</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Giới thiệu</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
            className="input-field resize-none" placeholder="Viết gì đó về bản thân..." />
        </div>
        <button onClick={() => update.mutate()} disabled={update.isPending} className="btn-primary w-full">
          {update.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  )
}
