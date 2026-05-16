import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { CallsService, CallType } from './calls.service';
import { NotificationsService } from '../notifications/notifications.service';

interface InitiatePayload {
  calleeId: string;
  type: CallType;
  conversationId?: string;
  offer: RTCSessionDescriptionInit;
}

interface AnswerPayload {
  callId: string;
  answer: RTCSessionDescriptionInit;
}

interface IceCandidatePayload {
  callId: string;
  candidate: RTCIceCandidateInit;
}

interface CallActionPayload {
  callId: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/call',
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // userId → Set of socketIds (local tracking for disconnect cleanup)
  private readonly userSockets = new Map<string, Set<string>>();
  // callId → Set of userIds currently in that call room
  private readonly activeCallRooms = new Map<string, Set<string>>();

  constructor(
    private callsService: CallsService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) throw new Error('No token');

      const payload = this.jwtService.verify<{ sub: string; phone: string }>(token, {
        secret: process.env.JWT_SECRET,
      });

      client.data.userId = payload.sub;
      await client.join(`call-user:${payload.sub}`);

      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      client.emit('call:connected', { userId: payload.sub });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        // End any active call this user was in
        const activeCall = await this.callsService.getActiveCall(userId);
        if (activeCall) {
          const ended = await this.callsService.endCall(activeCall.id, userId);
          this.server
            .to(`call-room:${activeCall.id}`)
            .emit('call:ended', { callId: activeCall.id, by: userId, reason: 'disconnected', duration: ended.duration });
        }
      }
    }
  }

  // ─── Caller: initiate call ───────────────────────────────────────────────
  @SubscribeMessage('call:initiate')
  async handleInitiate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: InitiatePayload,
  ) {
    const callerId = client.data.userId as string;
    if (!callerId) throw new WsException('Unauthorized');

    // Check callee is not already in an active call
    const calleeActiveCall = await this.callsService.getActiveCall(data.calleeId);
    if (calleeActiveCall) {
      client.emit('call:busy', { calleeId: data.calleeId });
      return { success: false, reason: 'busy' };
    }

    const call = await this.callsService.createCall(
      callerId,
      data.calleeId,
      data.type,
      data.conversationId,
    );

    // Both parties join the call room
    await client.join(`call-room:${call.id}`);

    // Send incoming call event to callee (all their devices)
    this.server.to(`call-user:${data.calleeId}`).emit('call:incoming', {
      callId: call.id,
      caller: call.caller,
      type: call.type,
      offer: data.offer,
      conversationId: data.conversationId,
    });

    // Push notification for incoming call (when callee is offline)
    this.notificationsService
      .sendToUser(data.calleeId, {
        title: `${call.caller.displayName} đang gọi...`,
        body: data.type === 'video' ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến',
        data: { type: 'incoming_call', callId: call.id, callType: data.type },
      })
      .catch(() => null);

    // Auto-miss after 45 seconds if callee doesn't answer
    setTimeout(async () => {
      const current = await this.callsService.getCallById(call.id);
      if (current?.status === 'ringing') {
        await this.callsService.markMissed(call.id);
        this.server.to(`call-room:${call.id}`).emit('call:missed', { callId: call.id });
        this.server.to(`call-user:${data.calleeId}`).emit('call:missed', { callId: call.id });
      }
    }, 45_000);

    return { success: true, callId: call.id };
  }

  // ─── Callee: accept call ─────────────────────────────────────────────────
  @SubscribeMessage('call:accept')
  async handleAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AnswerPayload,
  ) {
    const calleeId = client.data.userId as string;
    if (!calleeId) throw new WsException('Unauthorized');

    const call = await this.callsService.acceptCall(data.callId, calleeId);

    await client.join(`call-room:${call.id}`);
    this.trackCallRoom(call.id, calleeId);

    // Send SDP answer back to caller
    this.server.to(`call-user:${call.callerId}`).emit('call:accepted', {
      callId: call.id,
      answer: data.answer,
      callee: call.callee,
    });

    return { success: true };
  }

  // ─── Callee: reject call ─────────────────────────────────────────────────
  @SubscribeMessage('call:reject')
  async handleReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CallActionPayload,
  ) {
    const calleeId = client.data.userId as string;
    if (!calleeId) throw new WsException('Unauthorized');

    await this.callsService.rejectCall(data.callId, calleeId);

    this.server.to(`call-room:${data.callId}`).emit('call:rejected', {
      callId: data.callId,
      by: calleeId,
    });

    return { success: true };
  }

  // ─── Either party: end call ───────────────────────────────────────────────
  @SubscribeMessage('call:end')
  async handleEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CallActionPayload,
  ) {
    const userId = client.data.userId as string;
    if (!userId) throw new WsException('Unauthorized');

    const ended = await this.callsService.endCall(data.callId, userId);

    this.server.to(`call-room:${data.callId}`).emit('call:ended', {
      callId: data.callId,
      by: userId,
      duration: ended.duration,
    });

    return { success: true, duration: ended.duration };
  }

  // ─── ICE candidate relay (both directions) ────────────────────────────────
  @SubscribeMessage('call:ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: IceCandidatePayload,
  ) {
    const userId = client.data.userId as string;
    if (!userId) throw new WsException('Unauthorized');

    // Relay to other participants in the call room (exclude sender)
    client.to(`call-room:${data.callId}`).emit('call:ice-candidate', {
      callId: data.callId,
      candidate: data.candidate,
      from: userId,
    });

    return { success: true };
  }

  // ─── Caller: cancel ringing call ─────────────────────────────────────────
  @SubscribeMessage('call:cancel')
  async handleCancel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CallActionPayload,
  ) {
    const callerId = client.data.userId as string;
    if (!callerId) throw new WsException('Unauthorized');

    await this.callsService.endCall(data.callId, callerId);

    this.server.to(`call-room:${data.callId}`).emit('call:cancelled', {
      callId: data.callId,
      by: callerId,
    });

    // Also notify callee directly in case they're not in call room yet
    const call = await this.callsService.getCallById(data.callId);
    if (call) {
      this.server.to(`call-user:${call.calleeId}`).emit('call:cancelled', {
        callId: data.callId,
        by: callerId,
      });
    }

    return { success: true };
  }

  private trackCallRoom(callId: string, userId: string) {
    if (!this.activeCallRooms.has(callId)) {
      this.activeCallRooms.set(callId, new Set());
    }
    this.activeCallRooms.get(callId)!.add(userId);
  }
}
