import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}

  // 登录
  async login(dto: LoginDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: dto.employeeNumber },
      include: {
        department: { select: { id: true, name: true } },
        role: { select: { id: true, name: true } },
      },
    });

    if (!employee) {
      throw new UnauthorizedException({ code: 10002, message: '工号或密码错误' });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, employee.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({ code: 10002, message: '工号或密码错误' });
    }

    if (!employee.isActive) {
      throw new UnauthorizedException({ code: 10002, message: '账号已被禁用' });
    }

    const jti = uuidv4();
    const refreshJti = uuidv4();

    const payload = { 
      sub: employee.id, 
      employeeNumber: employee.employeeNumber, 
      role: employee.role.name,
      jti,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = uuidv4();

    await this.redis.set(
      `refresh:${refreshToken}`, 
      JSON.stringify({ employeeId: employee.id, jti: refreshJti }), 
      60 * 60 * 24 * 7
    );

    await this.redis.set(`session:${employee.id}:${jti}`, accessToken, 60 * 60 * 24);

    return {
      code: 0,
      message: 'success',
      data: {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        employee: {
          id: employee.id,
          employeeNumber: employee.employeeNumber,
          name: employee.name,
          role: employee.role.name,
          department: employee.department.name,
          employeeType: employee.employeeType,
        },
      },
    };
  }

  // 刷新 token
  async refresh(refreshToken: string) {
    const stored = await this.redis.get(`refresh:${refreshToken}`);
    if (!stored) {
      throw new UnauthorizedException({ code: 10002, message: 'Refresh token 无效或已过期' });
    }

    const tokenData = JSON.parse(stored);
    const employeeId = tokenData.employeeId;

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        role: { select: { name: true } },
      },
    });

    if (!employee || !employee.isActive) {
      throw new UnauthorizedException({ code: 10002, message: '账号无效或已禁用' });
    }

    await this.redis.del(`refresh:${refreshToken}`);

    const jti = uuidv4();
    const newRefreshJti = uuidv4();
    const payload = { 
      sub: employee.id, 
      employeeNumber: employee.employeeNumber, 
      role: employee.role.name,
      jti,
    };
    const newAccessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const newRefreshToken = uuidv4();

    await this.redis.set(
      `refresh:${newRefreshToken}`, 
      JSON.stringify({ employeeId: employee.id, jti: newRefreshJti }), 
      60 * 60 * 24 * 7
    );
    await this.redis.set(`session:${employee.id}:${jti}`, newAccessToken, 60 * 60 * 24);

    return {
      code: 0,
      message: 'success',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600,
      },
    };
  }

  // 注册
  async register(dto: RegisterDto) {
    const existing = await this.prisma.employee.findUnique({
      where: { employeeNumber: dto.employeeNumber },
    });

    if (existing) {
      throw new BadRequestException({ code: 10005, message: '该工号已注册' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const employee = await this.prisma.employee.create({
      data: {
        employeeNumber: dto.employeeNumber,
        name: dto.name,
        passwordHash,
        departmentId: dto.departmentId || 1,
        position: dto.position,
        roleId: dto.roleId || 3,
        employeeType: (dto.employeeType as any) || 'RD_ADMIN',
        phone: dto.phone,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
      },
      select: {
        id: true,
        employeeNumber: true,
        name: true,
        role: { select: { name: true } },
      },
    });

    return {
      code: 0,
      message: 'success',
      data: {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        name: employee.name,
        role: employee.role.name,
      },
    };
  }

  // 忘记密码 - 发送重置码
  async forgotPassword(employeeNumber: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber },
    });

    if (!employee) {
      return { code: 0, message: '如果账号存在，重置链接已发送', data: null };
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.set(`pwd:reset:${employeeNumber}`, resetCode, 300);

    console.log(`[密码重置码] ${employeeNumber}: ${resetCode}`);

    return { code: 0, message: '如果账号存在，重置码已发送', data: null };
  }

  // 重置密码
  async resetPassword(employeeNumber: string, resetCode: string, newPassword: string) {
    const storedCode = await this.redis.get(`pwd:reset:${employeeNumber}`);

    if (!storedCode || storedCode !== resetCode) {
      throw new BadRequestException({ code: 10001, message: '重置码无效或已过期' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.employee.update({
      where: { employeeNumber },
      data: { passwordHash },
    });

    await this.redis.del(`pwd:reset:${employeeNumber}`);
    
    await this.redis.set(`blacklist:employee:${employeeNumber}`, '1', 60 * 60 * 24);

    return { code: 0, message: '密码重置成功', data: null };
  }

  // 登出
  async logout(employeeId: number, accessToken: string, refreshToken: string) {
    await this.redis.set(`blacklist:refresh:${refreshToken}`, '1', 60 * 60 * 24 * 7);
    
    try {
      const decoded = this.jwtService.verify(accessToken);
      if (decoded.jti) {
        await this.redis.set(`blacklist:token:${decoded.jti}`, '1', 3600);
      }
    } catch (e) {
      // token 已过期
    }
    
    await this.redis.del(`refresh:${refreshToken}`);
    
    return { code: 0, message: '登出成功', data: null };
  }

  // 检查 token 是否在黑名单
  async isTokenBlacklisted(jti: string, refreshToken?: string): Promise<boolean> {
    if (refreshToken) {
      const isRefreshBlacklisted = await this.redis.get(`blacklist:refresh:${refreshToken}`);
      if (isRefreshBlacklisted) return true;
    }
    if (jti) {
      const isJtiBlacklisted = await this.redis.get(`blacklist:token:${jti}`);
      if (isJtiBlacklisted) return true;
    }
    return false;
  }
}
