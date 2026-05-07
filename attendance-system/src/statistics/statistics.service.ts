import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  // 个人月度考勤统计
  async getPersonalStats(employeeId: number | null, year: number, month: number) {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // 如果没有指定 employeeId，使用当前登录用户（在 controller 中处理）
    const where: any = {
      checkTime: { gte: startDate, lte: endDate },
    };

    const records = await this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, employeeNumber: true, department: true, position: true },
        },
      },
      orderBy: [{ employeeId: 'asc' }, { checkTime: 'asc' }],
    });

    // 按员工分组统计
    const employeeMap: Record<number, any> = {};
    for (const record of records) {
      const eid = record.employeeId;
      if (!employeeMap[eid]) {
        employeeMap[eid] = {
          employee: record.employee,
          checkInCount: 0,
          checkOutCount: 0,
          normalDays: new Set<string>(),
          lateDays: 0,
          lateMinutes: 0,
          earlyLeaveDays: 0,
          earlyMinutes: 0,
          absentDays: 0,
          makeupDays: 0,
          overtimeMinutes: 0,
        };
      }

      const day = record.checkTime.toISOString().split('T')[0];
      if (record.type === 'CHECK_IN') {
        employeeMap[eid].checkInCount++;
        employeeMap[eid].normalDays.add(day);
      } else {
        employeeMap[eid].checkOutCount++;
      }

      if (record.status === 'LATE') {
        employeeMap[eid].lateDays++;
        // 估算迟到分钟数（简化处理，实际应根据配置计算）
        employeeMap[eid].lateMinutes += 30;
      }
      if (record.status === 'EARLY_LEAVE') {
        employeeMap[eid].earlyLeaveDays++;
        employeeMap[eid].earlyMinutes += 30;
      }
      if (record.status === 'MAKEUP') employeeMap[eid].makeupDays++;
    }

    // 计算工作日
    const totalWorkingDays = this.getWorkingDays(targetYear, targetMonth);
    const results = Object.values(employeeMap).map((emp: any) => {
      const workedDays = emp.normalDays.size;
      emp.workedDays = workedDays;
      emp.absentDays = Math.max(0, totalWorkingDays - workedDays - emp.makeupDays);
      emp.normalDays = emp.normalDays.size;
      emp.attendanceRate = totalWorkingDays > 0 ? ((emp.workedDays + emp.makeupDays) / totalWorkingDays * 100).toFixed(2) : '0.00';
      return emp;
    });

    return {
      code: 0,
      message: 'success',
      data: {
        year: targetYear,
        month: targetMonth,
        totalWorkingDays,
        employees: results,
      },
    };
  }

  // 部门考勤统计
  async getDepartmentStats(departmentId: number, year: number, month: number) {
    // 部门统计 - 通过 department name 过滤
    const employee = await this.prisma.employee.findFirst({
      where: { id: departmentId },
      select: { department: true },
    });

    if (!employee) {
      return { code: 0, message: 'success', data: { department: null, stats: {} } };
    }

    const stats = await this.getPersonalStats(null, year, month);
    const deptStats = (stats.data.employees as any[]).filter(
      (e: any) => e.employee.department === employee.department
    );

    // 部门汇总
    const summary = {
      department: employee.department,
      employeeCount: deptStats.length,
      totalWorkedDays: deptStats.reduce((s, e) => s + e.workedDays, 0),
      totalAbsentDays: deptStats.reduce((s, e) => s + e.absentDays, 0),
      totalLateDays: deptStats.reduce((s, e) => s + e.lateDays, 0),
      totalEarlyLeaveDays: deptStats.reduce((s, e) => s + e.earlyLeaveDays, 0),
      averageAttendanceRate: deptStats.length > 0 
        ? (deptStats.reduce((s, e) => s + parseFloat(e.attendanceRate || '0'), 0) / deptStats.length).toFixed(2)
        : '0.00',
    };

    return {
      code: 0,
      message: 'success',
      data: { summary, employees: deptStats },
    };
  }

  // 全局考勤统计
  async getCompanyStats(year: number, month: number) {
    const stats = await this.getPersonalStats(null, year, month);
    const employees = stats.data.employees as any[];

    // 按部门分组
    const deptMap: Record<string, any> = {};
    for (const emp of employees) {
      const dept = emp.employee.department;
      if (!deptMap[dept]) {
        deptMap[dept] = {
          department: dept,
          employeeCount: 0,
          totalWorkedDays: 0,
          totalAbsentDays: 0,
          totalLateDays: 0,
          avgAttendanceRate: 0,
        };
      }
      deptMap[dept].employeeCount++;
      deptMap[dept].totalWorkedDays += emp.workedDays;
      deptMap[dept].totalAbsentDays += emp.absentDays;
      deptMap[dept].totalLateDays += emp.lateDays;
    }

    // 计算各部门的平均出勤率
    const deptSummaries = Object.values(deptMap).map((d: any) => ({
      ...d,
      avgAttendanceRate: d.employeeCount > 0 
        ? (d.totalWorkedDays / (d.employeeCount * stats.data.totalWorkingDays) * 100).toFixed(2)
        : '0.00',
    }));

    // 全局汇总
    const totalEmployees = employees.length;
    const globalSummary = {
      totalEmployees,
      totalWorkedDays: employees.reduce((s, e) => s + e.workedDays, 0),
      totalAbsentDays: employees.reduce((s, e) => s + e.absentDays, 0),
      totalLateDays: employees.reduce((s, e) => s + e.lateDays, 0),
      totalEarlyLeaveDays: employees.reduce((s, e) => s + e.earlyLeaveDays, 0),
      overallAttendanceRate: totalEmployees > 0
        ? (employees.reduce((s, e) => s + parseFloat(e.attendanceRate || '0'), 0) / totalEmployees).toFixed(2)
        : '0.00',
    };

    return {
      code: 0,
      message: 'success',
      data: { globalSummary, departmentSummaries: deptSummaries, employees },
    };
  }

  // 月度考勤汇总
  async getMonthlySummary(params: {
    year: number;
    month: number;
    department?: string;
    employeeId?: number;
  }) {
    const { year, month, department, employeeId } = params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const where: any = {
      checkTime: { gte: startDate, lte: endDate },
    };
    if (employeeId) where.employeeId = employeeId;
    if (department) where.employee = { department };

    // 获取打卡记录
    const records = await this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, employeeNumber: true, department: true, position: true },
        },
      },
      orderBy: [{ employeeId: 'asc' }, { checkTime: 'asc' }],
    });

    // 按员工分组统计
    const employeeMap: Record<number, any> = {};
    for (const record of records) {
      const eid = record.employeeId;
      if (!employeeMap[eid]) {
        employeeMap[eid] = {
          employee: record.employee,
          checkInCount: 0,
          checkOutCount: 0,
          normalDays: new Set<string>(),
          lateDays: 0,
          earlyLeaveDays: 0,
          absentDays: 0,
          makeupDays: 0,
        };
      }

      const day = record.checkTime.toISOString().split('T')[0];
      if (record.type === 'CHECK_IN') {
        employeeMap[eid].checkInCount++;
        employeeMap[eid].normalDays.add(day);
      } else {
        employeeMap[eid].checkOutCount++;
      }

      if (record.status === 'LATE') employeeMap[eid].lateDays++;
      if (record.status === 'EARLY_LEAVE') employeeMap[eid].earlyLeaveDays++;
      if (record.status === 'MAKEUP') employeeMap[eid].makeupDays++;
    }

    // 计算缺勤天数（工作日）
    const totalWorkingDays = this.getWorkingDays(year, month);
    const results = Object.values(employeeMap).map((emp: any) => {
      const workedDays = emp.normalDays.size;
      emp.workedDays = workedDays;
      emp.absentDays = Math.max(0, totalWorkingDays - workedDays - emp.makeupDays);
      emp.normalDays = emp.normalDays.size;
      return emp;
    });

    // 计算部门汇总
    const deptSummary: Record<string, any> = {};
    for (const emp of results) {
      const dept = emp.employee.department;
      if (!deptSummary[dept]) {
        deptSummary[dept] = { department: dept, employeeCount: 0, totalWorkedDays: 0, totalAbsentDays: 0, lateDays: 0 };
      }
      deptSummary[dept].employeeCount++;
      deptSummary[dept].totalWorkedDays += emp.workedDays;
      deptSummary[dept].totalAbsentDays += emp.absentDays;
      deptSummary[dept].lateDays += emp.lateDays;
    }

    return {
      code: 0,
      message: 'success',
      data: {
        year,
        month,
        totalWorkingDays,
        employees: results,
        departmentSummary: Object.values(deptSummary),
      },
    };
  }

  // 导出月度Excel (使用 exceljs)
  async exportMonthlyExcel(params: { year: number; month: number; department?: string }, res: Response) {
    const summary = await this.getMonthlySummary(params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${params.year}年${params.month}月考勤汇总`);

    // 标题行
    sheet.columns = [
      { header: '工号', key: 'employeeNumber', width: 12 },
      { header: '姓名', key: 'name', width: 10 },
      { header: '部门', key: 'department', width: 15 },
      { header: '岗位', key: 'position', width: 12 },
      { header: '上班打卡次数', key: 'checkInCount', width: 15 },
      { header: '下班打卡次数', key: 'checkOutCount', width: 15 },
      { header: '正常打卡天数', key: 'normalDays', width: 15 },
      { header: '缺勤天数', key: 'absentDays', width: 12 },
      { header: '迟到天数', key: 'lateDays', width: 12 },
      { header: '早退天数', key: 'earlyLeaveDays', width: 12 },
      { header: '补卡天数', key: 'makeupDays', width: 12 },
      { header: '实际出勤天数', key: 'workedDays', width: 15 },
    ];

    // 样式
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // 数据行
    for (const emp of summary.data.employees) {
      const row = sheet.addRow({
        employeeNumber: emp.employee.employeeNumber,
        name: emp.employee.name,
        department: emp.employee.department,
        position: emp.employee.position || '-',
        checkInCount: emp.checkInCount,
        checkOutCount: emp.checkOutCount,
        normalDays: emp.normalDays,
        absentDays: emp.absentDays,
        lateDays: emp.lateDays,
        earlyLeaveDays: emp.earlyLeaveDays,
        makeupDays: emp.makeupDays,
        workedDays: emp.workedDays,
      });

      // 缺勤或迟到标红
      if (emp.absentDays > 0 || emp.lateDays > 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF2CC' },
        };
      }
    }

    // 合计行
    const totalRow = sheet.addRow({
      employeeNumber: '合计',
      name: `${summary.data.employees.length} 人`,
      department: '-',
      position: '-',
      checkInCount: summary.data.employees.reduce((s: number, e: any) => s + e.checkInCount, 0),
      checkOutCount: summary.data.employees.reduce((s: number, e: any) => s + e.checkOutCount, 0),
      normalDays: summary.data.employees.reduce((s: number, e: any) => s + e.normalDays, 0),
      absentDays: summary.data.employees.reduce((s: number, e: any) => s + e.absentDays, 0),
      lateDays: summary.data.employees.reduce((s: number, e: any) => s + e.lateDays, 0),
      earlyLeaveDays: summary.data.employees.reduce((s: number, e: any) => s + e.earlyLeaveDays, 0),
      makeupDays: summary.data.employees.reduce((s: number, e: any) => s + e.makeupDays, 0),
      workedDays: summary.data.employees.reduce((s: number, e: any) => s + e.workedDays, 0),
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="考勤统计_${params.year}_${params.month}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // 考勤异常趋势
  async getAbnormalTrend(startDate: string, endDate: string, department?: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const where: any = {
      checkTime: { gte: start, lte: end },
      status: { in: ['PENDING', 'APPROVED', 'REJECTED'] },
    };

    const abnormals = await this.prisma.attendanceAbnormal.findMany({
      where,
      include: {
        employee: { select: { department: true } },
      },
      orderBy: { checkTime: 'asc' },
    });

    // 按天统计
    const dayMap: Record<string, any> = {};
    for (const ab of abnormals) {
      const day = ab.checkTime.toISOString().split('T')[0];
      if (!dayMap[day]) {
        dayMap[day] = { date: day, gpsOutOfRange: 0, suspicious: 0, repeatClock: 0, total: 0 };
      }
      dayMap[day][ab.type as string]++;
      dayMap[day].total++;
    }

    return {
      code: 0,
      message: 'success',
      data: {
        trend: Object.values(dayMap),
        total: abnormals.length,
      },
    };
  }

  // 工作日计算（排除周末）
  private getWorkingDays(year: number, month: number): number {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
    }
    return workingDays;
  }
}