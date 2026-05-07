import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

@Injectable()
export class LoggingService {
  constructor(private prisma: PrismaService) {}

  // 记录操作日志
  async logOperation(params: {
    operatorId: number;
    module: string;
    action: string;
    targetType?: string;
    targetId?: number;
    detail?: string;
    ip?: string;
    userAgent?: string;
    level?: LogLevel;
  }) {
    return this.prisma.operationLog.create({
      data: {
        operatorId: params.operatorId,
        module: params.module,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        detail: params.detail,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });
  }

  // 查询操作日志
  async queryLogs(params: {
    operatorId?: number;
    module?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { operatorId, module, action, startDate, endDate, keyword, page = 1, pageSize = 20 } = params;

    const where: any = {};
    if (operatorId) where.operatorId = operatorId;
    if (module) where.module = module;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (keyword) {
      where.OR = [
        { detail: { contains: keyword } },
        { module: { contains: keyword } },
        { action: { contains: keyword } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.operationLog.count({ where }),
    ]);

    return {
      code: 0,
      message: 'success',
      data: { logs, total, page, pageSize },
    };
  }

  // 查询安全告警日志
  async querySecurityAlerts(params: {
    startDate?: string;
    endDate?: string;
    level?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { startDate, endDate, level, page = 1, pageSize = 20 } = params;

    // 简化处理：操作日志中包含安全相关关键词的视为安全告警
    const where: any = {
      module: 'SECURITY',
    };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.operationLog.count({ where }),
    ]);

    return {
      code: 0,
      message: 'success',
      data: { logs, total, page, pageSize },
    };
  }

  // 清理过期日志（保留至少1年）
  async cleanupOldLogs(retentionDays = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.operationLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return {
      code: 0,
      message: 'success',
      data: { deletedCount: result.count },
    };
  }
}