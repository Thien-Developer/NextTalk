import { io, Socket } from 'socket.io-client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://44.200.84.42:3000'
const CALL_WS_URL = process.env.NEXT_PUBLIC_CALL_WS_URL || 'http://44.200.84.42:3000/call'

let chatSocket: Socket | null = null
let callSocket: Socket | null = null

export function getChatSocket(token: string): Socket {
  if (chatSocket?.connected) return chatSocket

  chatSocket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })

  return chatSocket
}

export function getCallSocket(token: string): Socket {
  if (callSocket?.connected) return callSocket

  callSocket = io(CALL_WS_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
  })

  return callSocket
}

export function disconnectSockets() {
  chatSocket?.disconnect()
  callSocket?.disconnect()
  chatSocket = null
  callSocket = null
}

export { chatSocket, callSocket }
