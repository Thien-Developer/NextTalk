import { create } from 'zustand'
import type { IncomingCall } from '@/types'

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected'

interface CallState {
  status: CallStatus
  activeCallId: string | null
  incomingCall: IncomingCall | null
  isMuted: boolean
  isCameraOff: boolean
  callType: 'audio' | 'video'
  duration: number

  setStatus: (s: CallStatus) => void
  setActiveCallId: (id: string | null) => void
  setIncomingCall: (call: IncomingCall | null) => void
  toggleMute: () => void
  toggleCamera: () => void
  setCallType: (t: 'audio' | 'video') => void
  setDuration: (d: number) => void
  reset: () => void
}

export const useCallStore = create<CallState>((set) => ({
  status: 'idle',
  activeCallId: null,
  incomingCall: null,
  isMuted: false,
  isCameraOff: false,
  callType: 'audio',
  duration: 0,

  setStatus: (status) => set({ status }),
  setActiveCallId: (id) => set({ activeCallId: id }),
  setIncomingCall: (call) => set({ incomingCall: call }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleCamera: () => set((s) => ({ isCameraOff: !s.isCameraOff })),
  setCallType: (callType) => set({ callType }),
  setDuration: (duration) => set({ duration }),
  reset: () => set({ status: 'idle', activeCallId: null, incomingCall: null, isMuted: false, isCameraOff: false, duration: 0 }),
}))
