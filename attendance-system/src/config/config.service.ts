import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConfigService {
  constructor(private prisma: PrismaService) {}

  // 获取所有配置
  async findAll() {
    const configs = await this.prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });
    return { code: 0, message: 'success', data: configs };
  }

  // 获取单个配置
  async findOne(key: string) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    if (!config) throw new NotFoundException({ code: 10004, message: '配置不存在' });
    return { code: 0, message: 'success', data: config };
  }

  // 更新配置
  async update(key: string, value: string, label?: string, type?: string) {
    const existing = await this.prisma.systemConfig.findUnique({ where: { key } });
    
    if (!existing) {
      // 新建配置
      const config = await this.prisma.systemConfig.create({
        data: {
          key,
          value,
          label: label || key,
          type: (type as any) || 'STRING',
        },
      });
      return { code: 0, message: 'success', data: config };
    }

    // 更新配置
    const config = await this.prisma.systemConfig.update({
      where: { key },
      data: { value, ...(label && { label }) },
    });
    return { code: 0, message: 'success', data: config };
  }

  // 批量更新配置
  async batchUpdate(configs: Array<{ key: string; value: string; label?: string }>) {
    const results = [];
    for (const c of configs) {
      const existing = await this.prisma.systemConfig.findUnique({ where: { key: c.key } });
      if (existing) {
        const updated = await this.prisma.systemConfig.update({
          where: { key: c.key },
          data: { value: c.value },
        });
        results.push(updated);
      } else {
        const created = await this.prisma.systemConfig.create({
          data: { key: c.key, value: c.value, label: c.label || c.key, type: 'STRING' as any },
        });
        results.push(created);
      }
    }
    return { code: 0, message: 'success', data: results };
  }

  // 删除配置
  async remove(key: string) {
    const existing = await this.prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException({ code: 10004, message: '配置不存在' });

    // 不允许删除系统关键配置
    const protectedKeys = ['attendance_check_in_start', 'attendance_check_in_end', 
      'attendance_check_out_start', 'attendance_check_out_end', 'attendance_late_grace_minutes'];
    if (protectedKeys.includes(key)) {
      throw new BadRequestException({ code: 10001, message: '禁止删除系统关键配置' });
    }

    await this.prisma.systemConfig.delete({ where: { key } });
    return { code: 0, message: '配置已删除', data: null };
  }

  // 获取考勤相关配置
  async getAttendanceConfig() {
    const configs = await this.prisma.systemConfig.findMany({
      where: { key: { startsWith: 'attendance_' } },
    });
    
    const configMap: Record<string, string> = {};
    configs.forEach(c => { configMap[c.key] = c.value; });
    
    return {
      code: 0,
      message: 'success',
      data: {
        checkInStart: configMap['attendance_check_in_start'] || '07:00',
        checkInEnd: configMap['attendance_check_in_end'] || '09:00',
        checkOutStart: configMap['attendance_check_out_start'] || '17:00',
        checkOutEnd: configMap['attendance_check_out_end'] || '23:59',
        lateGraceMinutes: parseInt(configMap['attendance_late_grace_minutes'] || '3'),
        locationRadius: parseInt(configMap['attendance_location_radius'] || '200'),
      },
    };
  }
}