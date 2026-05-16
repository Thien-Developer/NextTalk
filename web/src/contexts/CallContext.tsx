'use client'
import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { getCallSocket } from '@/lib/socket'
import { useAuthStore } from '@/stores/authStore'
import { useCallStore } from '@/stores/callStore'
import type { IncomingCall } from '@/types'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

interface CallContextValue {
  localVideoRef: React.RefObject<HTMLVideoElement | null>
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>
  initiateCall: (calleeId: string, type: 'audio' | 'video', conversationId?: string) => Promise<void>
  acceptCall: () => Promise<void>
  rejectCall: () => void
  endCall: () => void
  toggleMute: () => void
  toggleCamera: () => void
}

const CallContext = createContext<CallContextValue | null>(null)

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be used within CallProvider')
  return ctx
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuthStore()
  const store = useCallStore()

  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const callIdRef = useRef<string | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const getSocket = useCallback(() => {
    if (!accessToken) return null
    return getCallSocket(accessToken)
  }, [accessToken])

  const cleanup = useCallback(() => {
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null }
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    peerRef.current?.close()
    peerRef.current = null
    callIdRef.current = null
    pendingCandidatesRef.current = []
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    store.reset()
  }, [store])

  const startDurationTimer = useCallback(() => {
    let elapsed = 0
    durationTimerRef.current = setInterval(() => {
      elapsed += 1
      store.setDuration(elapsed)
    }, 1000)
  }, [store])

  const buildPeer = useCallback(() => {
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) =>
        peer.addTrack(t, localStreamRef.current!),
      )
    }

    peer.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]
    }

    peer.onicecandidate = (e) => {
      if (!e.candidate) return
      if (callIdRef.current) {
        getSocket()?.emit('call:ice-candidate', { callId: callIdRef.current, candidate: e.candidate })
      } else {
        pendingCandidatesRef.current.push(e.candidate)
      }
    }

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        store.setStatus('connected')
        startDurationTimer()
      }
      if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
        cleanup()
      }
    }

    return peer
  }, [getSocket, store, startDurationTimer, cleanup])

  const getMedia = async (type: 'audio' | 'video') =>
    navigator.mediaDevices.getUserMedia(
      type === 'video' ? { audio: true, video: true } : { audio: true, video: false },
    )

  const initiateCall = useCallback(async (
    calleeId: string,
    type: 'audio' | 'video',
    conversationId?: string,
  ) => {
    try {
      const stream = await getMedia(type)
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const peer = buildPeer()
      peerRef.current = peer

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)

      store.setCallType(type)
      store.setStatus('calling')

      getSocket()?.emit('call:initiate', { calleeId, type, offer, conversationId })
    } catch {
      cleanup()
    }
  }, [buildPeer, getSocket, store, cleanup])

  const acceptCall = useCallback(async () => {
    const incoming = store.incomingCall
    if (!incoming) return
    try {
      const stream = await getMedia(incoming.type)
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      callIdRef.current = incoming.callId
      const peer = buildPeer()
      peerRef.current = peer

      await peer.setRemoteDescription(incoming.offer)
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)

      store.setActiveCallId(incoming.callId)
      store.setStatus('connected')
      store.setIncomingCall(null)
      startDurationTimer()

      getSocket()?.emit('call:accept', { callId: incoming.callId, answer })
    } catch {
      cleanup()
    }
  }, [buildPeer, getSocket, store, startDurationTimer, cleanup])

  const rejectCall = useCallback(() => {
    const incoming = store.incomingCall
    if (!incoming) return
    getSocket()?.emit('call:reject', { callId: incoming.callId })
    store.setIncomingCall(null)
    store.setStatus('idle')
  }, [getSocket, store])

  const endCall = useCallback(() => {
    if (callIdRef.current) getSocket()?.emit('call:end', { callId: callIdRef.current })
    cleanup()
  }, [getSocket, cleanup])

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; store.toggleMute() }
  }, [store])

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (track) { track.enabled = !track.enabled; store.toggleCamera() }
  }, [store])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socket.on('call:created', ({ callId }: { callId: string }) => {
      callIdRef.current = callId
      store.setActiveCallId(callId)
      pendingCandidatesRef.current.forEach((c) =>
        socket.emit('call:ice-candidate', { callId, candidate: c }),
      )
      pendingCandidatesRef.current = []
    })

    socket.on('call:incoming', (data: IncomingCall) => {
      store.setIncomingCall(data)
      store.setStatus('ringing')
    })

    socket.on('call:accepted', async ({ callId, answer }: { callId: string; answer: RTCSessionDescriptionInit }) => {
      store.setActiveCallId(callId)
      if (peerRef.current) await peerRef.current.setRemoteDescription(answer)
    })

    socket.on('call:rejected', () => cleanup())
    socket.on('call:ended', () => cleanup())
    socket.on('call:cancelled', () => { store.setIncomingCall(null); store.setStatus('idle') })

    socket.on('call:ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (peerRef.current?.remoteDescription) {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      }
    })

    return () => {
      socket.off('call:created')
      socket.off('call:incoming')
      socket.off('call:accepted')
      socket.off('call:rejected')
      socket.off('call:ended')
      socket.off('call:cancelled')
      socket.off('call:ice-candidate')
    }
  }, [getSocket, store, cleanup])

  return (
    <CallContext.Provider value={{ localVideoRef, remoteVideoRef, initiateCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera }}>
      {children}
    </CallContext.Provider>
  )
}
