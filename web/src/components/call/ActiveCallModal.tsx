'use client'
import React from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone } from 'lucide-react'
import { useCallStore } from '@/stores/callStore'
import { useCall } from '@/contexts/CallContext'

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function ActiveCallModal() {
  const { status, callType, isMuted, isCameraOff, duration } = useCallStore()
  const { localVideoRef, remoteVideoRef, endCall, toggleMute, toggleCamera } = useCall()

  if (status !== 'calling' && status !== 'connected') return null

  return (
    <div className="fixed inset-0 z-50 bg-bg-primary flex flex-col">
      {/* Remote video / audio placeholder */}
      <div className="flex-1 relative bg-bg-secondary flex items-center justify-center">
        {callType === 'video' ? (
          <video
            ref={remoteVideoRef as React.RefObject<HTMLVideoElement>}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-bg-tertiary flex items-center justify-center">
              <Phone className="w-10 h-10 text-gold" />
            </div>
            <p className="text-text-muted text-sm">Cuộc gọi thoại</p>
          </div>
        )}

        {/* Status / duration */}
        <div className="absolute top-6 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none">
          <p className="text-white/70 text-sm">
            {status === 'calling' ? 'Đang gọi...' : formatDuration(duration)}
          </p>
        </div>

        {/* Local video PiP */}
        {callType === 'video' && (
          <div className="absolute bottom-4 right-4 w-32 h-44 rounded-xl overflow-hidden border-2 border-border shadow-lg">
            <video
              ref={localVideoRef as React.RefObject<HTMLVideoElement>}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-bg-secondary px-8 py-6 flex items-center justify-center gap-6">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-bg-tertiary text-text-primary hover:bg-bg-hover'}`}
          aria-label={isMuted ? 'Bật mic' : 'Tắt mic'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {callType === 'video' && (
          <button
            onClick={toggleCamera}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isCameraOff ? 'bg-red-500/20 text-red-400' : 'bg-bg-tertiary text-text-primary hover:bg-bg-hover'}`}
            aria-label={isCameraOff ? 'Bật camera' : 'Tắt camera'}
          >
            {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        <button
          onClick={endCall}
          className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
          aria-label="Kết thúc cuộc gọi"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  )
}
