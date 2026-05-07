import {
  Controller, Get, Post, Body, Query, UseGuards, Req, ParseIntPipe
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LoggingService } from './logging.service';

@Controller('logs')
@UseGuards(AuthGuard('jwt'))
export class LoggingController {
  constructor(private loggingService: LoggingService) {}

  // 查询操作日志
  @Get('operations')
  queryOperations(
    @Query('operatorId') operatorId?: number,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.loggingService.queryLogs({
      operatorId: operatorId ? Number(operatorId) : undefined,
      module,
      action,
      startDate,
      endDate,
      keyword,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  // 查询安全告警日志
  @Get('security')
  querySecurityAlerts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('level') level?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.loggingService.querySecurityAlerts({
      startDate,
      endDate,
      level,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  // 清理过期日志（需超级管理员权限）
  @Post('cleanup')
  cleanupOldLogs(@Body() body: { retentionDays?: number }) {
    return this.loggingService.cleanupOldLogs(body.retentionDays || 365);
  }

  // 记录操作日志（内部使用）
  @Post('record')
  recordLog(
    @Body() data: {
      operatorId: number;
      module: string;
      action: string;
      targetType?: string;
      targetId?: number;
      detail?: string;
      ip?: string;
      userAgent?: string;
    },
  ) {
    return this.loggingService.logOperation(data);
  }
}