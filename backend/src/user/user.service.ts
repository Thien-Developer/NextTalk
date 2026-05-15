import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PUBLIC_USER_SELECT = {
  id: true,
  displayName: true,
  avatarUrl: true,
  phone: true,
  bio: true,
  lastSeen: true,
  status: true,
};

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...PUBLIC_USER_SELECT, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...dto, updatedAt: new Date() },
      select: PUBLIC_USER_SELECT,
    });
  }

  async updateLastSeen(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSeen: new Date() },
    });
  }

  async searchByPhone(phone: string, currentUserId: string) {
    return this.prisma.user.findMany({
      where: {
        phone: { contains: phone },
        id: { not: currentUserId },
      },
      select: PUBLIC_USER_SELECT,
      take: 20,
    });
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'accepted' },
          { addresseeId: userId, status: 'accepted' },
        ],
      },
      include: {
        requester: { select: PUBLIC_USER_SELECT },
        addressee: { select: PUBLIC_USER_SELECT },
      },
    });

    return friendships.map((f) =>
      f.requesterId === userId ? f.addressee : f.requester,
    );
  }

  async getFriendRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'pending' },
      include: { requester: { select: PUBLIC_USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async sendFriendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new ConflictException('Cannot send friend request to yourself');
    }

    const addressee = await this.prisma.user.findUnique({
      where: { id: addresseeId },
    });
    if (!addressee) throw new NotFoundException('User not found');

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });
    if (existing) {
      throw new ConflictException('Friend request already exists');
    }

    return this.prisma.friendship.create({
      data: { requesterId, addresseeId, status: 'pending' },
    });
  }

  async respondFriendRequest(
    userId: string,
    requesterId: string,
    action: 'accept' | 'reject',
  ) {
    const friendship = await this.prisma.friendship.findUnique({
      where: {
        requesterId_addresseeId: { requesterId, addresseeId: userId },
      },
    });
    if (!friendship) throw new NotFoundException('Friend request not found');

    if (action === 'accept') {
      return this.prisma.friendship.update({
        where: {
          requesterId_addresseeId: { requesterId, addresseeId: userId },
        },
        data: { status: 'accepted' },
      });
    }

    return this.prisma.friendship.delete({
      where: {
        requesterId_addresseeId: { requesterId, addresseeId: userId },
      },
    });
  }

  async removeFriend(userId: string, friendId: string) {
    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
        status: 'accepted',
      },
    });
    return { message: 'Friend removed' };
  }
}
