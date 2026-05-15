import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';

const STORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) {}

  async createStory(userId: string, dto: CreateStoryDto) {
    const expiresAt = new Date(Date.now() + STORY_TTL_MS);

    return this.prisma.story.create({
      data: {
        userId,
        mediaUrl: dto.mediaUrl,
        type: dto.type,
        caption: dto.caption,
        expiresAt,
      },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  /**
   * Returns stories from the current user's friends + their own stories,
   * grouped by author. Each story carries an `isViewed` flag.
   */
  async getStoryFeed(userId: string) {
    const now = new Date();

    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'accepted' },
          { addresseeId: userId, status: 'accepted' },
        ],
      },
      select: { requesterId: true, addresseeId: true },
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );

    const stories = await this.prisma.story.findMany({
      where: {
        userId: { in: [userId, ...friendIds] },
        expiresAt: { gt: now },
      },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        views: {
          where: { userId },
          select: { viewedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group stories by author
    const grouped = new Map<string, { user: object; stories: object[] }>();
    for (const story of stories) {
      if (!grouped.has(story.userId)) {
        grouped.set(story.userId, { user: story.user, stories: [] });
      }
      grouped.get(story.userId)!.stories.push({
        id: story.id,
        mediaUrl: story.mediaUrl,
        type: story.type,
        caption: story.caption,
        expiresAt: story.expiresAt,
        createdAt: story.createdAt,
        isViewed: story.views.length > 0,
      });
    }

    // Own stories first, then friends ordered by most-recent story
    const result = Array.from(grouped.entries()).map(([id, data]) => ({
      ...data,
      isOwnStory: id === userId,
    }));
    result.sort((a) => (a.isOwnStory ? -1 : 1));

    return result;
  }

  /** Get current user's own active stories with viewer counts */
  async getMyStories(userId: string) {
    return this.prisma.story.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      include: {
        views: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { viewedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteStory(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');
    if (story.userId !== userId) throw new ForbiddenException('Not your story');

    await this.prisma.story.delete({ where: { id: storyId } });
    return { message: 'Story deleted' };
  }

  /** Record that a user viewed a story (idempotent, own stories skipped) */
  async viewStory(viewerId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.expiresAt < new Date()) {
      throw new NotFoundException('Story not found or expired');
    }
    if (story.userId === viewerId) return { viewed: true };

    await this.prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId: viewerId } },
      create: { storyId, userId: viewerId },
      update: { viewedAt: new Date() },
    });

    return { viewed: true };
  }

  /** Get viewers list for one of the current user's stories */
  async getStoryViewers(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');
    if (story.userId !== userId) throw new ForbiddenException('Not your story');

    return this.prisma.storyView.findMany({
      where: { storyId },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { viewedAt: 'desc' },
    });
  }
}
