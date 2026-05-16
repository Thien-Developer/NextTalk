import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type UserRole = 'user' | 'admin' | 'superadmin';
export type UserStatus = 'active' | 'banned';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getOverviewStats() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000);
    const last7d = new Date(now.getTime() - 7 * 86_400_000);
    const last30d = new Date(now.getTime() - 30 * 86_400_000);

    const [
      totalUsers,
      activeUsers24h,
      newUsersToday,
      totalMessages,
      messagesLast24h,
      totalConversations,
      groupConversations,
      totalCalls,
      callsAccepted,
      totalStories,
      bannedUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { lastSeen: { gte: yesterday } } }),
      this.prisma.user.count({ where: { createdAt: { gte: yesterday } } }),
      this.prisma.message.count({ where: { isDeleted: false } }),
      this.prisma.message.count({ where: { isDeleted: false, createdAt: { gte: yesterday } } }),
      this.prisma.conversation.count(),
      this.prisma.conversation.count({ where: { type: 'group' } }),
      this.prisma.call.count(),
      this.prisma.call.count({ where: { status: 'ended' } }),
      this.prisma.story.count(),
      this.prisma.user.count({ where: { status: 'banned' } }),
    ]);

    const dailyNewUsers = await this.getDailyNewUsers(30);
    const dailyMessages = await this.getDailyMessages(7);

    return {
      users: { total: totalUsers, active24h: activeUsers24h, newToday: newUsersToday, banned: bannedUsers },
      messages: { total: totalMessages, last24h: messagesLast24h },
      conversations: { total: totalConversations, groups: groupConversations },
      calls: { total: totalCalls, accepted: callsAccepted, acceptRate: totalCalls ? Math.round((callsAccepted / totalCalls) * 100) : 0 },
      stories: { total: totalStories },
      charts: { dailyNewUsers, dailyMessages },
    };
  }

  private async getDailyNewUsers(days: number) {
    const rows = await this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt")::text AS date, COUNT(*)::bigint AS count
      FROM "User"
      WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;
    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }

  private async getDailyMessages(days: number) {
    const rows = await this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt")::text AS date, COUNT(*)::bigint AS count
      FROM "Message"
      WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
        AND "isDeleted" = false
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;
    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }

  // ─── User Management ──────────────────────────────────────────────────────

  async listUsers(opts: { search?: string; status?: string; role?: string; limit: number; offset: number }) {
    const where: any = {};
    if (opts.status) where.status = opts.status;
    if (opts.role) where.role = opts.role;
    if (opts.search) {
      where.OR = [
        { phone: { contains: opts.search } },
        { displayName: { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, phone: true, displayName: true, avatarUrl: true,
          role: true, status: true, lastSeen: true, createdAt: true,
          _count: { select: { sentMessages: true, callsMade: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: opts.limit,
        skip: opts.offset,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, limit: opts.limit, offset: opts.offset };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { sentMessages: true, callsMade: true, callsReceived: true, stories: true },
        },
        refreshTokens: { select: { createdAt: true, expiresAt: true }, orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserRole(targetId: string, role: UserRole, requesterId: string) {
    if (targetId === requesterId) throw new BadRequestException('Cannot change your own role');
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, phone: true, displayName: true, role: true, status: true },
    });
  }

  async updateUserStatus(targetId: string, status: UserStatus, requesterId: string) {
    if (targetId === requesterId) throw new BadRequestException('Cannot ban yourself');
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('User not found');

    if (status === 'banned') {
      // Invalidate all refresh tokens on ban
      await this.prisma.refreshToken.deleteMany({ where: { userId: targetId } });
    }

    return this.prisma.user.update({
      where: { id: targetId },
      data: { status },
      select: { id: true, phone: true, displayName: true, role: true, status: true },
    });
  }

  async deleteUser(targetId: string, requesterId: string) {
    if (targetId === requesterId) throw new BadRequestException('Cannot delete yourself');
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.delete({ where: { id: targetId } });
    return { message: 'User deleted', userId: targetId };
  }

  // ─── Conversation Management ──────────────────────────────────────────────

  async listConversations(opts: { type?: string; limit: number; offset: number }) {
    const where: any = {};
    if (opts.type) where.type = opts.type;

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          _count: { select: { members: true, messages: true } },
        },
        orderBy: { lastActivity: 'desc' },
        take: opts.limit,
        skip: opts.offset,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return { conversations, total, limit: opts.limit, offset: opts.offset };
  }

  async deleteConversation(conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');

    await this.prisma.conversation.delete({ where: { id: conversationId } });
    return { message: 'Conversation deleted', conversationId };
  }

  // ─── Call Management ──────────────────────────────────────────────────────

  async listCalls(opts: { status?: string; limit: number; offset: number }) {
    const where: any = {};
    if (opts.status) where.status = opts.status;

    const [calls, total] = await Promise.all([
      this.prisma.call.findMany({
        where,
        include: {
          caller: { select: { id: true, displayName: true, phone: true } },
          callee: { select: { id: true, displayName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: opts.limit,
        skip: opts.offset,
      }),
      this.prisma.call.count({ where }),
    ]);

    return { calls, total, limit: opts.limit, offset: opts.offset };
  }
}
