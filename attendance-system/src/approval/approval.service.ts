import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ApprovalService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ===== 请假申请 =====

  async createLeaveRequest(
    employeeId: number,
    data: {
      type: string;
      startDate: string;
      endDate: string;
      reason: string;
      attachments?: string[];
    },
  ) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
      throw new BadRequestException({ code: 10001, message: '结束日期不能早于开始日期' });
    }

    // 计算请假天数
    const durationDays = this.calculateDays(startDate, endDate);

    // 检查年假额度（如果请的是年假）
    if (data.type === 'ANNUAL') {
      const balance = await this.getAnnualLeaveBalance(employeeId);
      if (balance < durationDays) {
        throw new BadRequestException({ code: 10001, message: `年假余额不足，当前余额 ${balance} 天` });
      }
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true, role: true },
    });

    // 查找直接主管
    const approver = await this.prisma.employee.findFirst({
      where: {
        department: { name: employee.department?.name },
        role: { name: { in: ['MANAGER', 'ADMIN'] } },
        id: { not: employeeId },
      },
    });

    const request = await this.prisma.leaveRequest.create({
      data: {
        employeeId,
        type: data.type as any,
        startDate,
        endDate,
        reason: data.reason,
        attachments: data.attachments as any,
        status: 'PENDING' as const,
        approverId: approver?.id || null,
      },
      include: {
        employee: { select: { name: true, employeeNumber: true, department: true } },
      },
    });

    // 记录操作日志
    await this.logOperation(approver?.id || 0, 'LEAVE', 'CREATE', 'leave_request', request.id, `提交请假申请: ${data.type}`);

    return {
      code: 0,
      message: 'success',
      data: request,
    };
  }

  // 获取请假记录
  async getLeaveRequests(
    employeeId: number,
    params: { status?: string; page?: number; pageSize?: number },
  ) {
    const { status, page = 1, pageSize = 20 } = params;

    // 检查权限：普通员工只能查看自己的，管理员可以查看全部
    const isAdmin = await this.isAdmin(employeeId);

    const where: any = {};
    if (!isAdmin) {
      where.employeeId = employeeId;
    }
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: {
          employee: { select: { name: true, employeeNumber: true, department: true } },
          approver: { select: { name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return { 
      code: 0, 
      message: 'success',
      data: { requests, total, page, pageSize } 
    };
  }

  // 审批请假 - 支持二级审批（请假>3天）
  async approveLeave(
    requestId: number,
    approverId: number,
    decision: 'APPROVED' | 'REJECTED',
    comment?: string,
  ) {
    const request = await this.prisma.leaveRequest.findUnique({ 
      where: { id: requestId },
      include: { employee: { include: { department: true } } },
    });
    
    if (!request) throw new NotFoundException({ code: 10004, message: '请假申请不存在' });
    if (request.status !== 'PENDING') throw new BadRequestException({ code: 10005, message: '该申请已处理' });

    // 计算请假天数
    const durationDays = this.calculateDays(request.startDate, request.endDate);

    // 检查二级审批条件：请假天数 > 3天需要二级审批
    const needSecondApproval = durationDays > 3;
    
    // 如果是一级审批通过，需要检查是否需要二级审批
    if (decision === 'APPROVED' && needSecondApproval && !request.approverId) {
      // 查找二级审批人
      const secondApprover = await this.prisma.employee.findFirst({
        where: {
          department: { name: request.employee.department?.name },
          role: { name: 'ADMIN' },
          id: { not: approverId },
        },
      });

      if (secondApprover) {
        // 更新为二级审批人
        await this.prisma.leaveRequest.update({
          where: { id: requestId },
          data: { approverId: secondApprover.id },
        });

        return {
          code: 0,
          message: '已提交至二级审批',
          data: { requestId, status: 'PENDING', secondApprover: secondApprover.name },
        };
      }
    }

    // 执行最终审批
    await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: decision,
        approverId,
        approverComment: comment,
        decidedAt: new Date(),
      },
    });

    // 审批通过后更新打卡状态为请假
    if (decision === 'APPROVED') {
      await this.updateAttendanceForLeave(request.employeeId, request.startDate, request.endDate, request.type);
      
      // 如果是年假，扣减额度
      if (request.type === 'ANNUAL') {
        await this.deductAnnualLeave(request.employeeId, durationDays);
      }
    }

    // 记录操作日志
    try {
      await this.logOperation(approverId, 'LEAVE', decision, 'leave_request', requestId, comment || '');
    } catch (logErr) {
      console.error('日志记录失败:', logErr);
    }

    return {
      code: 0,
      message: decision === 'APPROVED' ? '请假已批准' : '请假已驳回',
      data: { requestId, status: decision },
    };
  }

  // 销假（请假撤销）
  async cancelLeave(requestId: number, employeeId: number, reason: string) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id: requestId } });
    
    if (!request) throw new NotFoundException({ code: 10004, message: '请假申请不存在' });
    if (request.employeeId !== employeeId) throw new ForbiddenException({ code: 10003, message: '无权取消他人申请' });
    if (request.status !== 'APPROVED') throw new BadRequestException({ code: 10005, message: '只能取消已批准的请假' });

    // 检查是否已开始请假
    const now = new Date();
    if (request.startDate <= now) {
      throw new BadRequestException({ code: 10001, message: '请假已开始，无法撤销' });
    }

    await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: 'PENDING' }, // 改为待审批状态，需要审批
    });

    // 恢复考勤状态
    await this.restoreAttendanceForLeave(request.employeeId, request.startDate, request.endDate);

    await this.logOperation(employeeId, 'LEAVE', 'CANCEL', 'leave_request', requestId, reason);

    return {
      code: 0,
      message: '销假申请已提交',
      data: { requestId },
    };
  }

  // ===== 补卡申请 =====

  async createMakeupRequest(
    employeeId: number,
    data: {
      date: string;
      type: 'CHECK_IN' | 'CHECK_OUT';
      reason: string;
      attachments?: string[];
    },
  ) {
    const date = new Date(data.date);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    // 检查是否在补卡窗口期内（默认3天）
    if (diffDays > 3) {
      throw new BadRequestException({ code: 10001, message: '只能补近3天内的打卡记录' });
    }

    // 检查当天是否有打卡记录
    const existing = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        type: data.type === 'CHECK_IN' ? 'CHECK_IN' : 'CHECK_OUT',
        checkTime: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
    });

    if (existing) {
      throw new BadRequestException({ code: 10005, message: '该日期已有打卡记录，无需补卡' });
    }

    // 检查当月补卡次数是否超限（默认3次）
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthMakeups = await this.prisma.makeupRequest.count({
      where: {
        employeeId,
        createdAt: { gte: startOfMonth },
        status: { not: 'REJECTED' },
      },
    });

    if (monthMakeups >= 3) {
      throw new BadRequestException({ code: 10001, message: '本月补卡次数已达上限（3次）' });
    }

    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, include: { department: true, role: true } });
    const approver = await this.prisma.employee.findFirst({
      where: { department: { name: employee.department?.name }, role: { name: { in: ['MANAGER', 'ADMIN'] } }, id: { not: employeeId } },
    });

    const request = await this.prisma.makeupRequest.create({
      data: {
        employeeId,
        date,
        type: data.type as any,
        reason: data.reason,
        attachments: data.attachments as any,
        status: 'PENDING' as const,
        approverId: approver?.id || null,
      },
      include: {
        employee: { select: { name: true, employeeNumber: true, department: true } },
      },
    });

    await this.logOperation(approver?.id || 0, 'MAKEUP', 'CREATE', 'makeup_request', request.id, `提交补卡申请: ${data.date}`);

    return {
      code: 0,
      message: 'success',
      data: request,
    };
  }

  // 获取补卡记录
  async getMakeupRequests(
    employeeId: number,
    params: { status?: string; page?: number; pageSize?: number },
  ) {
    const { status, page = 1, pageSize = 20 } = params;

    const isAdmin = await this.isAdmin(employeeId);
    const where: any = {};
    if (!isAdmin) where.employeeId = employeeId;
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      this.prisma.makeupRequest.findMany({
        where,
        include: {
          employee: { select: { name: true, employeeNumber: true, department: true } },
          approver: { select: { name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.makeupRequest.count({ where }),
    ]);

    return { 
      code: 0, 
      message: 'success',
      data: { requests, total, page, pageSize } 
    };
  }

  // 审批补卡
  async approveMakeup(
    requestId: number,
    approverId: number,
    decision: 'APPROVED' | 'REJECTED',
    comment?: string,
  ) {
    const request = await this.prisma.makeupRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException({ code: 10004, message: '补卡申请不存在' });
    if (request.status !== 'PENDING') throw new BadRequestException({ code: 10005, message: '该申请已处理' });

    // 如果通过，同步更新打卡记录
    if (decision === 'APPROVED') {
      // 检查是否已存在该时段的打卡记录
      const existing = await this.prisma.attendance.findFirst({
        where: {
          employeeId: request.employeeId,
          type: request.type,
          checkTime: {
            gte: new Date(request.date.getFullYear(), request.date.getMonth(), request.date.getDate()),
            lt: new Date(request.date.getFullYear(), request.date.getMonth(), request.date.getDate() + 1),
          },
        },
      });

      if (!existing) {
        await this.prisma.attendance.create({
          data: {
            employeeId: request.employeeId,
            type: request.type,
            checkTime: request.date,
            latitude: 0,
            longitude: 0,
            address: '补卡审批通过',
            status: 'MAKEUP',
          },
        });
      }
    }

    await this.prisma.makeupRequest.update({
      where: { id: requestId },
      data: {
        status: decision as any,
        approverId,
        approverComment: comment,
        decidedAt: new Date(),
      },
    });

    await this.logOperation(approverId, 'MAKEUP', decision, 'makeup_request', requestId, comment || '');

    return {
      code: 0,
      message: decision === 'APPROVED' ? '补卡已批准' : '补卡已驳回',
      data: { requestId, status: decision },
    };
  }

  // 待我审批列表（所有类型）
  async getPendingApprovals(approverId: number) {
    // 检查权限
    const canApprove = await this.hasApprovalPermission(approverId);
    if (!canApprove) {
      throw new ForbiddenException({ code: 10003, message: '您没有审批权限' });
    }

    const [leaveRequests, makeupRequests] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { approverId, status: 'PENDING' },
        include: {
          employee: { select: { name: true, employeeNumber: true, department: true, position: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.makeupRequest.findMany({
        where: { approverId, status: 'PENDING' },
        include: {
          employee: { select: { name: true, employeeNumber: true, department: true, position: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      code: 0,
      message: 'success',
      data: {
        leaveRequests,
        makeupRequests,
        total: leaveRequests.length + makeupRequests.length,
      },
    };
  }

  // ===== 私有辅助方法 =====

  private calculateDays(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }

  private async getAnnualLeaveBalance(employeeId: number): Promise<number> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { hireDate: true },
    });

    if (!employee) return 0;

    // 简化计算：入职满1年享5天，满3年享10天，满5年享15天
    const yearsOfService = Math.floor(
      (new Date().getTime() - employee.hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
    );

    let balance = 0;
    if (yearsOfService >= 5) balance = 15;
    else if (yearsOfService >= 3) balance = 10;
    else if (yearsOfService >= 1) balance = 5;
    else balance = 0;

    // 减去已使用的年假
    const used = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        type: 'ANNUAL',
        status: 'APPROVED',
      },
    });

    const usedDays = used.reduce((sum, r) => sum + this.calculateDays(r.startDate, r.endDate), 0);
    return Math.max(0, balance - usedDays);
  }

  private async deductAnnualLeave(employeeId: number, days: number) {
    // 这里应该更新 leave_balance 表，简化处理记录在 SystemConfig 中
    // 实际生产应该用专门的表来管理假期余额
    console.log(`[年假扣减] employeeId=${employeeId}, days=${days}`);
  }

  private async updateAttendanceForLeave(
    employeeId: number, 
    startDate: Date, 
    endDate: Date, 
    leaveType: string,
  ) {
    // 更新请假期间的考勤状态
    // 简化处理：跳过，实际应该更新对应日期的 attendance 记录
    console.log(`[请假联动] employeeId=${employeeId}, ${startDate.toISOString()} to ${endDate.toISOString()}, type=${leaveType}`);
  }

  private async restoreAttendanceForLeave(
    employeeId: number, 
    startDate: Date, 
    endDate: Date,
  ) {
    console.log(`[销假恢复] employeeId=${employeeId}, ${startDate.toISOString()} to ${endDate.toISOString()}`);
  }

  private async isAdmin(employeeId: number): Promise<boolean> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: true },
    });
    return employee?.role?.name === 'ADMIN' || employee?.role?.name === 'MANAGER';
  }

  private async hasApprovalPermission(employeeId: number): Promise<boolean> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: true },
    });
    return employee?.role?.name === 'ADMIN' || employee?.role?.name === 'MANAGER';
  }

  private async logOperation(
    operatorId: number,
    module: string,
    action: string,
    targetType: string,
    targetId: number,
    detail: string,
  ) {
    try {
      // 使用原始SQL避免Prisma客户端问题
      await this.prisma.$executeRaw`
        INSERT INTO operation_log (operator_id, module, action, target_type, target_id, detail, created_at)
        VALUES (${operatorId}, ${module}, ${action}, ${targetType}, ${targetId}, ${detail}, NOW())
      `;
    } catch (err) {
      console.error('日志记录失败:', err);
    }
  }
}