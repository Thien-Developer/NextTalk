import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed' | 'busy';
export type CallType = 'audio' | 'video';

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService) {}

  async createCall(callerId: string, calleeId: string, type: CallType, conversationId?: string) {
    // Mark any previous ringing calls from same caller as missed
    await this.prisma.call.updateMany({
      where: { callerId, status: 'ringing' },
      data: { status: 'missed', endedAt: new Date() },
    });

    return this.prisma.call.create({
      data: { callerId, calleeId, type, conversationId, status: 'ringing' },
      include: {
        caller: { select: { id: true, displayName: true, avatarUrl: true } },
        callee: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async getActiveCall(userId: string) {
    return this.prisma.call.findFirst({
      where: {
        OR: [{ callerId: userId }, { calleeId: userId }],
        status: { in: ['ringing', 'accepted'] },
      },
    });
  }

  async acceptCall(callId: string, calleeId: string) {
    const call = await this.findAndValidate(callId, calleeId, 'calleeId');
    if (call.status !== 'ringing') throw new ForbiddenException('Call is not ringing');

    return this.prisma.call.update({
      where: { id: callId },
      data: { status: 'accepted', startedAt: new Date() },
      include: {
        caller: { select: { id: true, displayName: true, avatarUrl: true } },
        callee: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async rejectCall(callId: string, calleeId: string) {
    const call = await this.findAndValidate(callId, calleeId, 'calleeId');
    if (call.status !== 'ringing') throw new ForbiddenException('Call is not ringing');

    return this.prisma.call.update({
      where: { id: callId },
      data: { status: 'rejected', endedAt: new Date() },
    });
  }

  async endCall(callId: string, userId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException('Call not found');
    if (call.callerId !== userId && call.calleeId !== userId) {
      throw new ForbiddenException('Not a participant of this call');
    }

    const endedAt = new Date();
    const duration =
      call.startedAt && call.status === 'accepted'
        ? Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000)
        : null;

    return this.prisma.call.update({
      where: { id: callId },
      data: { status: 'ended', endedAt, duration },
    });
  }

  async markBusy(callId: string) {
    return this.prisma.call.update({
      where: { id: callId },
      data: { status: 'busy', endedAt: new Date() },
    });
  }

  async markMissed(callId: string) {
    return this.prisma.call.update({
      where: { id: callId },
      data: { status: 'missed', endedAt: new Date() },
    });
  }

  async getCallHistory(userId: string, limit = 20, offset = 0) {
    return this.prisma.call.findMany({
      where: {
        OR: [{ callerId: userId }, { calleeId: userId }],
        status: { not: 'ringing' },
      },
      include: {
        caller: { select: { id: true, displayName: true, avatarUrl: true } },
        callee: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getCallById(callId: string) {
    return this.prisma.call.findUnique({
      where: { id: callId },
      include: {
        caller: { select: { id: true, displayName: true, avatarUrl: true } },
        callee: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  private async findAndValidate(callId: string, userId: string, field: 'callerId' | 'calleeId') {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException('Call not found');
    if (call[field] !== userId) throw new ForbiddenException('Not authorized for this call');
    return call;
  }
}
