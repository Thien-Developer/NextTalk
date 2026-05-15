import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SpeedSmsService } from '../common/sms/speedsms.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
    private sms: SpeedSmsService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.set(`otp:${dto.phone}`, otp, 120);

    const sent = await this.sms.sendOtp(dto.phone, otp);
    if (!sent) throw new InternalServerErrorException('Failed to send OTP');

    return { message: 'OTP sent successfully', phone: dto.phone };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const storedOtp = await this.redis.get(`otp:${dto.phone}`);
    if (!storedOtp) {
      throw new BadRequestException('OTP expired or not found');
    }
    if (storedOtp !== dto.otp) {
      throw new UnauthorizedException('Invalid OTP');
    }
    await this.redis.del(`otp:${dto.phone}`);

    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone: dto.phone, displayName: dto.phone },
      });
    }

    return this.generateTokenPair(user.id, user.phone);
  }

  async refreshTokens(userId: string, phone: string, refreshToken: string) {
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
    return this.generateTokenPair(userId, phone);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return { message: 'Logged out successfully' };
  }

  private async generateTokenPair(userId: string, phone: string) {
    const payload = { sub: userId, phone };

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
