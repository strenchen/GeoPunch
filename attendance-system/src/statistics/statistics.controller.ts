import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatisticsService } from './statistics.service';
import { Response } from 'express';

@Controller('statistics')
@UseGuards(AuthGuard('jwt'))
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  // 个人月度考勤统计
  @Get('personal')
  getPersonalStats(
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.statisticsService.getPersonalStats(null, year, month);
  }

  // 部门考勤统计
  @Get('department/:id')
  getDepartmentStats(
    @Param('id') id: string,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.statisticsService.getDepartmentStats(Number(id), year, month);
  }

  // 全局考勤统计（仅超级管理员）
  @Get('company')
  getCompanyStats(
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.statisticsService.getCompanyStats(year, month);
  }

  // 月度考勤汇总
  @Get('monthly')
  getMonthlySummary(
    @Query('year') year: number,
    @Query('month') month: number,
    @Query('department') department?: string,
    @Query('employeeId') employeeId?: number,
  ) {
    return this.statisticsService.getMonthlySummary({ year, month, department, employeeId: employeeId ? Number(employeeId) : undefined });
  }

  // 导出月度Excel (流式响应)
  @Get('export')
  async exportMonthlyExcel(
    @Query('year') year: number,
    @Query('month') month: number,
    @Query('department') department: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="考勤统计_${year}_${month}.xlsx"`);
    await this.statisticsService.exportMonthlyExcel({ year, month, department }, res);
  }

  // 考勤异常趋势
  @Get('trend')
  getAbnormalTrend(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('department') department?: string,
  ) {
    return this.statisticsService.getAbnormalTrend(startDate, endDate, department);
  }
}