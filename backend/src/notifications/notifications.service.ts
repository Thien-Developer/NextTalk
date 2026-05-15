import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private fcmEnabled = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase credentials not set — push notifications disabled');
      return;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    }

    this.fcmEnabled = true;
    this.logger.log('Firebase Admin initialized');
  }

  async registerToken(userId: string, fcmToken: string): Promise<void> {
    await this.prisma.fcmToken.upsert({
      where: { token: fcmToken },
      update: { userId, updatedAt: new Date() },
      create: { userId, token: fcmToken },
    });
  }

  async removeToken(fcmToken: string): Promise<void> {
    await this.prisma.fcmToken.deleteMany({ where: { token: fcmToken } });
  }

  async sendToUser(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<void> {
    if (!this.fcmEnabled) return;

    const tokens = await this.prisma.fcmToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (!tokens.length) return;

    const tokenValues = tokens.map((t) => t.token);

    try {
      const result = await admin.messaging().sendEachForMulticast({
        tokens: tokenValues,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        android: { priority: 'high' },
        apns: { payload: { aps: { contentAvailable: true, sound: 'default' } } },
      });

      const failed = result.responses.filter((r) => !r.success);
      if (failed.length) {
        const invalidTokens: string[] = [];
        result.responses.forEach((r, i) => {
          if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokenValues[i]);
          }
        });
        if (invalidTokens.length) {
          await this.prisma.fcmToken.deleteMany({ where: { token: { in: invalidTokens } } });
        }
      }
    } catch (err) {
      this.logger.error(`FCM send failed: ${err.message}`);
    }
  }

  async sendNewMessageNotification(
    senderId: string,
    receiverIds: string[],
    conversationId: string,
    messagePreview: string,
    senderName: string,
  ): Promise<void> {
    const targets = receiverIds.filter((id) => id !== senderId);
    await Promise.all(
      targets.map((userId) =>
        this.sendToUser(userId, {
          title: senderName,
          body: messagePreview.length > 100 ? messagePreview.slice(0, 97) + '...' : messagePreview,
          data: { type: 'new_message', conversationId },
        }),
      ),
    );
  }
}
