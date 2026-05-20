import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

interface GoogleUserData {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async findOrCreateGoogleUser(data: GoogleUserData) {
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: data.googleId }, { email: data.email }],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          googleId: data.googleId,
          email: data.email,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
        },
      });
    } else if (!user.googleId) {
      // Link Google account to existing email user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: data.googleId,
          avatarUrl: user.avatarUrl ?? data.avatarUrl,
        },
      });
    }

    return user;
  }

  async googleLogin(user: { id: string; email: string | null }) {
    return this.generateTokenPair(user.id, user.email ?? '');
  }

  async refreshTokens(userId: string, email: string, refreshToken: string) {
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        token: refreshToken,
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.generateTokenPair(userId, email);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return { message: 'Logged out successfully' };
  }

  private async generateTokenPair(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '30d',
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { userId, token: refreshToken, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
