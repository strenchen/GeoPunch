import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async clockIn(
    employeeId: number,
    type: 'CHECK_IN' | 'CHECK_OUT',
    location: { latitude: number; longitude: number; address?: string },
    deviceId?: string,
    clientVersion?: string,
  ) {
    const checkTime = new Date();

    // Check for suspicious duplicate clocking
    const recentClock = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        type: type,
        checkTime: { gte: new Date(checkTime.getTime() - 60000) },
      },
    });
    if (recentClock) {
      throw new BadRequestException({ code: 10008, message: '请勿重复打卡' });
    }

    const record = await this.prisma.attendance.create({
      data: {
        employeeId,
        type,
        checkTime,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        deviceId,
        status: 'NORMAL',
      },
    });

    return { code: 0, message: type === 'CHECK_IN' ? '上班打卡成功' : '下班打卡成功', data: record };
  }

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

  async getTodayStatus(employeeId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);

    const records = await this.prisma.attendance.findMany({
      where: { employeeId, checkTime: { gte: today, lt: tomorrow } },
      orderBy: { checkTime: 'asc' },
    });

    const checkIn = records.find(r => r.type === 'CHECK_IN');
    const checkOut = records.find(r => r.type === 'CHECK_OUT');

    return {
      code: 0, message: 'success',
      data: {
        date: today.toISOString().split('T')[0],
        checkIn: checkIn?.checkTime || null,
        checkOut: checkOut?.checkTime || null,
        isComplete: !!(checkIn && checkOut),
      },
    };
  }

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

  async getAbnormals(params: { page?: number; pageSize?: number; department?: string; status?: string; startDate?: string; endDate?: string }) {
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
