import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddMembersDto } from './dto/add-members.dto';

const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  senderId: true,
  type: true,
  content: true,
  mediaUrl: true,
  mediaSize: true,
  mediaMime: true,
  replyToId: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  sender: {
    select: { id: true, displayName: true, avatarUrl: true, phone: true },
  },
  replyTo: {
    select: {
      id: true,
      content: true,
      type: true,
      senderId: true,
      sender: {
        select: { id: true, displayName: true },
      },
    },
  },
  reactions: {
    select: {
      emoji: true,
      userId: true,
      user: { select: { id: true, displayName: true } },
    },
  },
};

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, displayName: true, avatarUrl: true, lastSeen: true },
                },
              },
            },
            messages: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                type: true,
                content: true,
                senderId: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { conversation: { lastActivity: 'desc' } },
    });

    return memberships.map((m) => ({
      ...m.conversation,
      myMembership: {
        lastReadSeq: m.lastReadSeq,
        isMuted: m.isMuted,
        isPinned: m.isPinned,
        role: m.role,
      },
      lastMessage: m.conversation.messages[0] ?? null,
    }));
  }

  async createConversation(userId: string, dto: CreateConversationDto) {
    const allMemberIds = [...new Set([userId, ...dto.memberIds])];

    if (dto.type === 'direct') {
      if (allMemberIds.length !== 2) {
        throw new ForbiddenException('Direct conversation must have exactly 2 members');
      }
      const existing = await this.findDirectConversation(allMemberIds[0], allMemberIds[1]);
      if (existing) return existing;
    }

    return this.prisma.conversation.create({
      data: {
        type: dto.type,
        name: dto.name,
        avatarUrl: dto.avatarUrl,
        members: {
          create: allMemberIds.map((id) => ({
            userId: id,
            role: id === userId ? 'admin' : 'member',
          })),
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this conversation');

    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, displayName: true, avatarUrl: true, lastSeen: true, phone: true },
            },
          },
        },
      },
    });
  }

  async getMessages(userId: string, conversationId: string, query: GetMessagesDto) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this conversation');

    const limit = query.limit ?? 50;

    const where: any = { conversationId };
    if (query.before) {
      const pivot = await this.prisma.message.findUnique({ where: { id: query.before } });
      if (pivot) where.createdAt = { lt: pivot.createdAt };
    } else if (query.after) {
      const pivot = await this.prisma.message.findUnique({ where: { id: query.after } });
      if (pivot) where.createdAt = { gt: pivot.createdAt };
    }

    const messages = await this.prisma.message.findMany({
      where,
      select: MESSAGE_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }

  async sendMessage(userId: string, dto: SendMessageDto) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: dto.conversationId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this conversation');

    if (dto.replyToId) {
      const replyTo = await this.prisma.message.findUnique({
        where: { id: dto.replyToId },
      });
      if (!replyTo || replyTo.conversationId !== dto.conversationId) {
        throw new NotFoundException('Reply target message not found');
      }
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: dto.conversationId,
          senderId: userId,
          type: dto.type,
          content: dto.content,
          mediaUrl: dto.mediaUrl,
          mediaSize: dto.mediaSize,
          mediaMime: dto.mediaMime,
          replyToId: dto.replyToId,
        },
        select: MESSAGE_SELECT,
      }),
      this.prisma.conversation.update({
        where: { id: dto.conversationId },
        data: { lastActivity: new Date() },
      }),
    ]);

    return message;
  }

  async recallMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) {
      throw new ForbiddenException('Can only recall your own messages');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, deletedAt: new Date(), content: null },
      select: { id: true, conversationId: true, isDeleted: true, deletedAt: true },
    });
  }

  async reactToMessage(userId: string, messageId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { reactions: { where: { userId } } },
    });
    if (!message) throw new NotFoundException('Message not found');

    const existing = message.reactions[0];
    if (existing) {
      if (existing.emoji === emoji) {
        await this.prisma.messageReaction.delete({
          where: { messageId_userId: { messageId, userId } },
        });
        return { messageId, userId, emoji: null, action: 'removed' };
      }
      await this.prisma.messageReaction.update({
        where: { messageId_userId: { messageId, userId } },
        data: { emoji },
      });
    } else {
      await this.prisma.messageReaction.create({
        data: { messageId, userId, emoji },
      });
    }

    const allReactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
      select: {
        emoji: true,
        userId: true,
        user: { select: { id: true, displayName: true } },
      },
    });

    return { messageId, reactions: allReactions };
  }

  async markAsRead(userId: string, conversationId: string) {
    const now = BigInt(Date.now());
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadSeq: now },
    });
    return { conversationId, readAt: new Date() };
  }

  async getUserConversationIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    return memberships.map((m) => m.conversationId);
  }

  async getConversationMemberIds(conversationId: string): Promise<string[]> {
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async updateGroup(userId: string, conversationId: string, dto: UpdateGroupDto) {
    await this.requireAdmin(userId, conversationId);
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv || conv.type !== 'group') throw new BadRequestException('Not a group conversation');

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { ...(dto.name && { name: dto.name }), ...(dto.avatarUrl && { avatarUrl: dto.avatarUrl }) },
      include: { members: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } } },
    });
  }

  async addMembers(userId: string, conversationId: string, dto: AddMembersDto) {
    await this.requireAdmin(userId, conversationId);
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv || conv.type !== 'group') throw new BadRequestException('Not a group conversation');

    const existing = await this.prisma.conversationMember.findMany({
      where: { conversationId, userId: { in: dto.memberIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((m) => m.userId));
    const newIds = dto.memberIds.filter((id) => !existingIds.has(id));

    if (newIds.length > 0) {
      await this.prisma.conversationMember.createMany({
        data: newIds.map((uid) => ({ conversationId, userId: uid, role: 'member' })),
      });
    }

    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } } },
    });
  }

  async removeMember(userId: string, conversationId: string, targetUserId: string) {
    await this.requireAdmin(userId, conversationId);
    if (userId === targetUserId) throw new BadRequestException('Use leave group to remove yourself');

    const target = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found in this group');

    await this.prisma.conversationMember.delete({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
    });
    return { conversationId, removedUserId: targetUserId };
  }

  async updateMemberRole(userId: string, conversationId: string, targetUserId: string, role: 'admin' | 'member') {
    await this.requireAdmin(userId, conversationId);
    if (userId === targetUserId) throw new BadRequestException('Cannot change your own role');

    const target = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found in this group');

    return this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
      data: { role },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  }

  async leaveGroup(userId: string, conversationId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this conversation');

    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv || conv.type !== 'group') throw new BadRequestException('Can only leave group conversations');

    if (member.role === 'admin') {
      const otherAdmin = await this.prisma.conversationMember.findFirst({
        where: { conversationId, userId: { not: userId }, role: 'admin' },
      });
      if (!otherAdmin) {
        const nextMember = await this.prisma.conversationMember.findFirst({
          where: { conversationId, userId: { not: userId } },
          orderBy: { joinedAt: 'asc' },
        });
        if (nextMember) {
          await this.prisma.conversationMember.update({
            where: { conversationId_userId: { conversationId, userId: nextMember.userId } },
            data: { role: 'admin' },
          });
        }
      }
    }

    await this.prisma.conversationMember.delete({
      where: { conversationId_userId: { conversationId, userId } },
    });
    return { conversationId, message: 'Left group successfully' };
  }

  private async requireAdmin(userId: string, conversationId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this conversation');
    if (member.role !== 'admin') throw new ForbiddenException('Only admins can perform this action');
  }

  private async findDirectConversation(userId1: string, userId2: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        type: 'direct',
        members: { every: { userId: { in: [userId1, userId2] } } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    return conversations.find((c) => c.members.length === 2) ?? null;
  }
}
