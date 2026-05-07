import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  async list(params: {
    employee_id?: number;
    start_date?: string;
    end_date?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { employee_id, start_date, end_date, page = 1, pageSize = 50 } = params;
    const where: any = {};
    if (employee_id) where.employeeId = employee_id;
    if (start_date || end_date) {
      where.scheduleDate = {};
      if (start_date) where.scheduleDate.gte = new Date(start_date);
      if (end_date) where.scheduleDate.lte = new Date(end_date);
    }
    const schedules = await this.prisma.schedule.findMany({
      where, orderBy: { scheduleDate: 'asc' },
      skip: (page - 1) * pageSize, take: pageSize,
      include: { employee: { select: { id: true, name: true, employeeNumber: true, department: true } } },
    });
    return { schedules, total: schedules.length, page, pageSize };
  }

  async create(data: { employee_id?: number; employeeId?: number; schedule_date?: string; scheduleDate?: string; shift_type?: string; shiftType?: string; start_time?: string; startTime?: string; end_time?: string; endTime?: string }) {
    const employeeId = data.employee_id || data.employeeId;
    const scheduleDate = data.schedule_date || data.scheduleDate;
    if (!employeeId || !scheduleDate) {
      throw new BadRequestException({ code: 10001, message: '参数错误' });
    }
    const schedule = await this.prisma.schedule.create({
      data: {
        employeeId,
        scheduleDate: new Date(scheduleDate),
        shiftType: data.shift_type || data.shiftType || 'FULL',
        startTime: data.start_time || data.startTime || '09:00',
        endTime: data.end_time || data.endTime || '18:00',
      },
      include: { employee: { select: { id: true, name: true, employeeNumber: true } } },
    });
    return schedule;
  }

  async update(id: number, data: { shift_type?: string; shiftType?: string; start_time?: string; startTime?: string; end_time?: string; endTime?: string; status?: string }) {
    const updateData: any = {};
    if (data.shift_type || data.shiftType) updateData.shiftType = data.shift_type || data.shiftType;
    if (data.start_time || data.startTime) updateData.startTime = data.start_time || data.startTime;
    if (data.end_time || data.endTime) updateData.endTime = data.end_time || data.endTime;
    if (data.status) updateData.status = data.status;
    
    const schedule = await this.prisma.schedule.update({
      where: { id },
      data: updateData,
    });
    return schedule;
  }

  async delete(id: number) {
    await this.prisma.schedule.delete({ where: { id } });
  }

  async applyShift(data: { employee_id: number; original_date: string; target_date: string; reason?: string }) {
    if (!data.employee_id || !data.original_date || !data.target_date) {
      throw new BadRequestException({ code: 10001, message: '参数错误' });
    }
    const shiftChange = await this.prisma.shiftChange.create({
      data: {
        employeeId: data.employee_id,
        originalDate: new Date(data.original_date),
        targetDate: new Date(data.target_date),
        reason: data.reason,
        status: 'PENDING',
      },
      include: { employee: { select: { id: true, name: true, employeeNumber: true } } },
    });
    return shiftChange;
  }
}
