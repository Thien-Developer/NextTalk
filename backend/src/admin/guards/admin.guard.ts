import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

export const ROLES_KEY = 'roles';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.authorization as string | undefined;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) throw new UnauthorizedException('No token provided');

    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true },
    });

    if (!user || user.status === 'banned') throw new UnauthorizedException('Account unavailable');

    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? ['admin', 'superadmin'];

    if (!required.includes(user.role)) {
      throw new ForbiddenException('Admin access required');
    }

    req.user = { id: user.id, role: user.role };
    return true;
  }
}
