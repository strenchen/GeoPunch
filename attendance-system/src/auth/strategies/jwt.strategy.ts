import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface JwtPayload {
  sub: number;
  employeeNumber: string;
  role: string;
  jti: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'attendance-secret-key-2024',
    });
  }

  async validate(payload: JwtPayload) {
    // 检查 token jti 是否在黑名单
    const isBlacklisted = await this.redis.get(`blacklist:token:${payload.jti}`);
    if (isBlacklisted) {
      throw new UnauthorizedException({ code: 10002, message: 'Token已被撤销' });
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: payload.sub },
    });

    if (!employee || !employee.isActive) {
      throw new UnauthorizedException({ code: 10002, message: '账号无效或已禁用' });
    }

    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      name: employee.name,
      role: employee.role,
      department: employee.department,
      jti: payload.jti,
    };
  }
}