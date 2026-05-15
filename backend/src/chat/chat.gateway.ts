import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { UserService } from '../user/user.service';
import { NotificationsService } from '../notifications/notifications.service';

interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}

interface ReadReceiptPayload {
  conversationId: string;
}

interface ReactPayload {
  messageId: string;
  conversationId: string;
  emoji: string;
}

interface RecallPayload {
  messageId: string;
  conversationId: string;
}

interface SendMessagePayload {
  conversationId: string;
  type: string;
  content?: string;
  mediaUrl?: string;
  mediaSize?: number;
  mediaMime?: string;
  replyToId?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly localSockets = new Map<string, Set<string>>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private userService: UserService,
    private notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server): void {
    const pubClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
    const subClient = pubClient.duplicate();
    server.adapter(createAdapter(pubClient, subClient));
  }

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
      client.data.phone = payload.phone;

      await client.join(`user:${payload.sub}`);

      if (!this.localSockets.has(payload.sub)) {
        this.localSockets.set(payload.sub, new Set());
      }
      this.localSockets.get(payload.sub)!.add(client.id);

      const conversationIds = await this.chatService.getUserConversationIds(payload.sub);
      for (const convId of conversationIds) {
        await client.join(`conv:${convId}`);
      }

      client.emit('connected', { userId: payload.sub });
    } catch {
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    const sockets = this.localSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.localSockets.delete(userId);
        await this.userService.updateLastSeen(userId);
      }
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessagePayload,
  ) {
    const userId = client.data.userId as string;
    if (!userId) throw new WsException('Unauthorized');

    try {
      const message = await this.chatService.sendMessage(userId, {
        conversationId: data.conversationId,
        type: data.type,
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaSize: data.mediaSize,
        mediaMime: data.mediaMime,
        replyToId: data.replyToId,
      });

      this.server.to(`conv:${data.conversationId}`).emit('new_message', message);

      // Push notification to offline members
      const memberIds = await this.chatService.getConversationMemberIds(data.conversationId);
      const senderName = message.sender?.displayName ?? 'Someone';
      const preview = data.type === 'text' ? (data.content ?? '') : `[${data.type}]`;
      this.notificationsService
        .sendNewMessageNotification(userId, memberIds, data.conversationId, preview, senderName)
        .catch(() => null);

      return { success: true, data: message };
    } catch (err) {
      throw new WsException((err as Error).message);
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingPayload,
  ) {
    const userId = client.data.userId as string;
    if (!userId) return;

    client.to(`conv:${data.conversationId}`).emit('typing', {
      userId,
      conversationId: data.conversationId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('read_receipt')
  async handleReadReceipt(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ReadReceiptPayload,
  ) {
    const userId = client.data.userId as string;
    if (!userId) return;

    await this.chatService.markAsRead(userId, data.conversationId);

    client.to(`conv:${data.conversationId}`).emit('message_read', {
      userId,
      conversationId: data.conversationId,
      readAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage('react_message')
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ReactPayload,
  ) {
    const userId = client.data.userId as string;
    if (!userId) throw new WsException('Unauthorized');

    try {
      const result = await this.chatService.reactToMessage(userId, data.messageId, data.emoji);
      this.server.to(`conv:${data.conversationId}`).emit('message_reaction', result);
      return { success: true };
    } catch (err) {
      throw new WsException((err as Error).message);
    }
  }

  @SubscribeMessage('recall_message')
  async handleRecall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RecallPayload,
  ) {
    const userId = client.data.userId as string;
    if (!userId) throw new WsException('Unauthorized');

    try {
      const result = await this.chatService.recallMessage(userId, data.messageId);
      this.server.to(`conv:${data.conversationId}`).emit('message_recalled', result);
      return { success: true };
    } catch (err) {
      throw new WsException((err as Error).message);
    }
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  async joinConversationRoom(userId: string, conversationId: string) {
    await this.server.in(`user:${userId}`).socketsJoin(`conv:${conversationId}`);
  }
}
