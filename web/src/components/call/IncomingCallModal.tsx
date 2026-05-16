'use client'
import { Phone, PhoneOff, Video } from 'lucide-react'
import { useCallStore } from '@/stores/callStore'
import { useCall } from '@/contexts/CallContext'
import { Avatar } from '@/components/ui/Avatar'

export function IncomingCallModal() {
  const { incomingCall } = useCallStore()
  const { acceptCall, rejectCall } = useCall()

  if (!incomingCall) return null

  const { caller, type } = incomingCall

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-secondary rounded-2xl p-8 flex flex-col items-center gap-6 shadow-2xl w-80">
        <div className="relative">
          <Avatar src={caller.avatarUrl} name={caller.displayName} size="xl" />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gold flex items-center justify-center">
            {type === 'video' ? <Video className="w-3 h-3 text-bg-primary" /> : <Phone className="w-3 h-3 text-bg-primary" />}
          </span>
        </div>

        <div className="text-center">
          <h3 className="font-semibold text-text-primary text-lg">{caller.displayName}</h3>
          <p className="text-sm text-text-muted mt-1">
            {type === 'video' ? 'Cuộc gọi video đến...' : 'Cuộc gọi thoại đến...'}
          </p>
        </div>

        <div className="flex gap-8">
          <button
            onClick={rejectCall}
            className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
            aria-label="Từ chối"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={acceptCall}
            className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
            aria-label="Chấp nhận"
          >
            <Phone className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
