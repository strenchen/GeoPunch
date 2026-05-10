import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 差异化考勤打卡
  // ============================================================
  async clockIn(
    employeeId: number,
    type: 'CHECK_IN' | 'CHECK_OUT',
    location: { latitude: number; longitude: number; address?: string; photoUrl?: string },
    deviceId?: string,
    clientVersion?: string,
  ) {
    const checkTime = new Date();

    // 1. 获取员工信息和员工类型
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        role: true,
      },
    });

    if (!employee) throw new NotFoundException({ code: 10004, message: '员工不存在' });

    // 2. 根据员工类型分发不同打卡逻辑
    switch (employee.employeeType) {
      case 'LEADER':
        // 领导豁免：直接记录为 NORMAL，不校验地点
        return this.recordCheckIn(employeeId, type, location, deviceId, 'NORMAL');

      case 'SALES':
        // 销售：校验日打卡上限（默认1次）+ 可选拍照 + 不校验地点
        return this.salesCheckIn(employeeId, type, location, deviceId);

      case 'RD_ADMIN':
        // 研发行政：校验地点白名单 + 时段 + 误差范围
        return this.rdAdminCheckIn(employeeId, type, location, deviceId, checkTime);

      default:
        throw new BadRequestException({ code: 10001, message: '未知的员工类型' });
    }
  }

  // ============================================================
  // 研发行政打卡 - 严格校验
  // ============================================================
  private async rdAdminCheckIn(
    employeeId: number,
    type: 'CHECK_IN' | 'CHECK_OUT',
    location: { latitude: number; longitude: number; address?: string; photoUrl?: string },
    deviceId: string | undefined,
    checkTime: Date,
  ) {
    // 检查重复打卡（60秒内）
    const recentClock = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        type,
        checkTime: { gte: new Date(checkTime.getTime() - 60000) },
      },
    });
    if (recentClock) {
      throw new BadRequestException({ code: 10008, message: '请勿重复打卡' });
    }

    // 获取考勤规则
    const rule = await this.prisma.attendanceRule.findFirst({
      where: { ruleType: 'RD_ADMIN_CHECKIN', isActive: true },
    });

    // 获取考勤地点白名单
    const whitelists = await this.prisma.locationWhitelist.findMany({
      where: { isActive: true },
    });

    // 如果有部门级白名单也加入
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (employee?.departmentId) {
      const deptWhitelists = await this.prisma.locationWhitelist.findMany({
        where: { departmentId: employee.departmentId, isActive: true },
      });
      whitelists.push(...deptWhitelists);
    }

    // 校验 GPS 是否在白名单范围内
    let isInRange = false;
    let matchedLocation = '';
    for (const wl of whitelists) {
      const distance = this.calculateDistance(
        location.latitude, location.longitude,
        wl.latitude, wl.longitude,
      );
      if (distance <= wl.radiusMeters) {
        isInRange = true;
        matchedLocation = wl.name;
        break;
      }
    }

    if (!isInRange) {
      // 记录异常，不直接拒绝（可申请审批）
      await this.prisma.attendanceAbnormal.create({
        data: {
          employeeId,
          type: 'GPS_OUT_OF_RANGE',
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          deviceId,
          checkTime,
          status: 'PENDING',
        },
      });
      throw new BadRequestException({ code: 10001, message: `不在允许打卡范围内（${matchedLocation || '未知地点'}）` });
    }

    // 校验打卡时段（如果规则配置了时段）
    if (rule?.config) {
      const config = rule.config as any;
      const timeRule = type === 'CHECK_IN' ? config.checkin_times?.[0] : config.checkin_times?.[1];
      if (timeRule) {
        const nowTime = checkTime.toTimeString().slice(0, 5); // HH:MM
        if (nowTime < timeRule.start || nowTime > timeRule.end) {
          throw new BadRequestException({ 
            code: 10001, 
            message: `${type === 'CHECK_IN' ? '上班' : '下班'}打卡时间尚未开始（${timeRule.start}-${timeRule.end}）` 
          });
        }
      }
    }

    // 判断打卡状态（是否迟到/早退）
    const status = this.determineAttendStatus(type, checkTime, rule?.config);

    return this.recordCheckIn(employeeId, type, location, deviceId, status);
  }

  // ============================================================
  // 销售打卡 - 宽松规则
  // ============================================================
  private async salesCheckIn(
    employeeId: number,
    type: 'CHECK_IN' | 'CHECK_OUT',
    location: { latitude: number; longitude: number; address?: string; photoUrl?: string },
    deviceId: string | undefined,
  ) {
    const checkTime = new Date();

    // 检查重复打卡（60秒内）
    const recentClock = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        type,
        checkTime: { gte: new Date(checkTime.getTime() - 60000) },
      },
    });
    if (recentClock) {
      throw new BadRequestException({ code: 10008, message: '请勿重复打卡' });
    }

    // 获取考勤规则（销售规则）
    const rule = await this.prisma.attendanceRule.findFirst({
      where: { ruleType: 'SALES_CHECKIN', isActive: true },
    });

    // 校验日打卡上限
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);

    const todayClocks = await this.prisma.attendance.count({
      where: {
        employeeId,
        type,
        checkTime: { gte: today, lt: tomorrow },
      },
    });

    const dailyLimit = (rule?.config as any)?.daily_limit || 1;
    if (todayClocks >= dailyLimit) {
      throw new BadRequestException({ code: 10001, message: `今日${type === 'CHECK_IN' ? '上班' : '下班'}打卡已达上限（${dailyLimit}次）` });
    }

    // 销售不校验地点，但记录 GPS
    return this.recordCheckIn(employeeId, type, location, deviceId, 'NORMAL');
  }

  // ============================================================
  // 记录打卡（通用）
  // ============================================================
  private async recordCheckIn(
    employeeId: number,
    type: 'CHECK_IN' | 'CHECK_OUT',
    location: { latitude: number; longitude: number; address?: string; photoUrl?: string },
    deviceId: string | undefined,
    status: 'NORMAL' | 'LATE' | 'EARLY_LEAVE',
  ) {
    const checkTime = new Date();

    const record = await this.prisma.attendance.create({
      data: {
        employeeId,
        type,
        checkTime,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        deviceId,
        photoUrl: location.photoUrl,
        status,
      },
    });

    return { 
      code: 0, 
      message: type === 'CHECK_IN' 
        ? (status === 'LATE' ? '打卡成功（迟到）' : '上班打卡成功') 
        : (status === 'EARLY_LEAVE' ? '打卡成功（早退）' : '下班打卡成功'), 
      data: record 
    };
  }

  // ============================================================
  // 判断打卡状态（迟到/早退）
  // ============================================================
  private determineAttendStatus(
    type: 'CHECK_IN' | 'CHECK_OUT',
    checkTime: Date,
    ruleConfig: any,
  ): 'NORMAL' | 'LATE' | 'EARLY_LEAVE' {
    if (!ruleConfig) return 'NORMAL';

    const config = ruleConfig as any;
    const timeRule = type === 'CHECK_IN' ? config.checkin_times?.[0] : config.checkin_times?.[1];
    if (!timeRule) return 'NORMAL';

    const nowTime = checkTime.toTimeString().slice(0, 5);
    const lateThreshold = timeRule.late_threshold || '09:30';
    const earlyThreshold = timeRule.early_threshold || '18:00';

    if (type === 'CHECK_IN' && nowTime > lateThreshold) {
      return 'LATE';
    }
    if (type === 'CHECK_OUT' && nowTime < earlyThreshold) {
      return 'EARLY_LEAVE';
    }

    return 'NORMAL';
  }

  // ============================================================
  // 计算两点间距离（米）- Haversine 公式
  // ============================================================
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // 地球半径（米）
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // ============================================================
  // 查询打卡记录
  // ============================================================
  async getRecords(employeeId: number, params: { month?: number; year?: number; page?: number; pageSize?: number }) {
    const { month, year, page = 1, pageSize = 31 } = params;
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      where.checkTime = { gte: startDate, lte: endDate };
    }
    const records = await this.prisma.attendance.findMany({
      where, orderBy: { checkTime: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
    });
    return { code: 0, message: 'success', data: records };
  }

  // ============================================================
  // 获取今日打卡状态
  // ============================================================
  // Helper: get local date string in Asia/Shanghai (YYYY-MM-DD)
  private getLocalDateStr(date: Date = new Date()): string {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
  }

  async getTodayStatus(employeeId: number) {
    // Calculate Asia/Shanghai date boundaries
    const localDateStr = this.getLocalDateStr();
    const [year, month, day] = localDateStr.split('-').map(Number);
    // Asia/Shanghai 00:00 = UTC previous day 16:00
    const todayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const tomorrowStart = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));

    const records = await this.prisma.attendance.findMany({
      where: { employeeId, checkTime: { gte: todayStart, lt: tomorrowStart } },
      orderBy: { checkTime: 'asc' },
    });

    const checkIn = records.find(r => r.type === 'CHECK_IN');
    const checkOut = records.find(r => r.type === 'CHECK_OUT');

    return {
      code: 0, message: 'success',
      data: {
        date: localDateStr,
        checkIn: checkIn?.checkTime || null,
        checkOut: checkOut?.checkTime || null,
        isComplete: !!(checkIn && checkOut),
      },
    };
  }

  // ============================================================
  // 同步离线打卡
  // ============================================================
  async syncOfflineCheckin(employeeId: number, records: any[]) {
    const results = [];
    for (const r of records) {
      await this.prisma.attendance.create({
        data: {
          employeeId,
          type: r.type || 'CHECK_IN',
          checkTime: new Date(r.checkTime || r.date),
          latitude: r.latitude || 0,
          longitude: r.longitude || 0,
          address: r.address,
          deviceId: r.deviceId,
          status: 'NORMAL',
        },
      });
      results.push({ date: r.date, success: true });
    }
    return { code: 0, message: '同步成功', data: results };
  }

  // ============================================================
  // 获取考勤异常列表
  // ============================================================
  async getAbnormals(params: { page?: number; pageSize?: number; status?: string; startDate?: string; endDate?: string }) {
    const { page = 1, pageSize = 20, status, startDate, endDate } = params;
    const where: any = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    const records = await this.prisma.attendanceAbnormal.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
      include: { employee: { select: { name: true, employeeNumber: true } } },
    });
    return { code: 0, message: 'success', data: records };
  }

  // ============================================================
  // 处理异常记录
  // ============================================================
  async resolveAbnormal(id: number, resolution: 'APPROVED' | 'REJECTED', note?: string) {
    const abnormal = await this.prisma.attendanceAbnormal.findUnique({ where: { id } });
    if (!abnormal) {
      throw new NotFoundException({ code: 10004, message: '异常记录不存在' });
    }
    return {
      code: 0, message: 'success',
      data: await this.prisma.attendanceAbnormal.update({
        where: { id },
        data: { status: resolution, resolvedNote: note, resolvedAt: new Date() },
      }),
    };
  }

  // ============================================================
  // 获取请假余额
  // ============================================================
  async getLeaveBalance(employeeId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { hireDate: true },
    });
    if (!employee) {
      throw new NotFoundException({ code: 10004, message: '员工不存在' });
    }
    const yearsOfService = Math.floor(
      (Date.now() - new Date(employee.hireDate).getTime()) / (365 * 24 * 60 * 60 * 1000)
    );
    let annualLeaveDays = 5;
    if (yearsOfService >= 1 && yearsOfService < 3) annualLeaveDays = 10;
    else if (yearsOfService >= 3 && yearsOfService < 5) annualLeaveDays = 15;
    else if (yearsOfService >= 5) annualLeaveDays = 20;
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const usedAnnualLeave = await this.prisma.leaveRequest.count({
      where: { employeeId, type: 'ANNUAL', status: 'APPROVED', startDate: { gte: startOfYear } },
    });
    return {
      code: 0, message: 'success',
      data: {
        annualLeave: { total: annualLeaveDays, used: usedAnnualLeave, remaining: annualLeaveDays - usedAnnualLeave },
        sickLeave: { total: -1, used: 0, remaining: -1 },
        personalLeave: { total: -1, used: 0, remaining: -1 },
      },
    };
  }
}
