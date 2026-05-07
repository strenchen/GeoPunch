import { Controller, Get, Param, Query, Res, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
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
    @Req() req: any,
    @Query('year', new DefaultValuePipe(new Date().getFullYear())) year: number,
    @Query('month', new DefaultValuePipe(new Date().getMonth() + 1)) month: number,
  ) {
    // 如果请求带上了 employeeId 参数且是管理员，返回指定员工的统计
    // 否则返回当前登录用户的统计
    return this.statisticsService.getPersonalStats(req.user.id, year, month);
  }

  // 部门考勤统计
  @Get('department/:id')
  getDepartmentStats(
    @Param('id') id: string,
    @Query('year', new DefaultValuePipe(new Date().getFullYear())) year: number,
    @Query('month', new DefaultValuePipe(new Date().getMonth() + 1)) month: number,
  ) {
    return this.statisticsService.getDepartmentStats(Number(id), year, month);
  }

  // 全局考勤统计（仅超级管理员）
  @Get('company')
  getCompanyStats(
    @Query('year', new DefaultValuePipe(new Date().getFullYear())) year: number,
    @Query('month', new DefaultValuePipe(new Date().getMonth() + 1)) month: number,
  ) {
    return this.statisticsService.getCompanyStats(year, month);
  }

  // 月度考勤汇总
  @Get('monthly')
  getMonthlySummary(
    @Query('year', new DefaultValuePipe(new Date().getFullYear())) year: number,
    @Query('month', new DefaultValuePipe(new Date().getMonth() + 1)) month: number,
    @Query('department') department?: string,
    @Query('employeeId') employeeId?: number,
  ) {
    return this.statisticsService.getMonthlySummary({ year, month, department, employeeId: employeeId ? Number(employeeId) : undefined });
  }

  // 导出月度Excel (流式响应)
  @Get('export')
  async exportMonthlyExcel(
    @Query('year', new DefaultValuePipe(new Date().getFullYear())) year: number,
    @Query('month', new DefaultValuePipe(new Date().getMonth() + 1)) month: number,
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
    @Query('startDate', new DefaultValuePipe(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])) startDate: string,
    @Query('endDate', new DefaultValuePipe(new Date().toISOString().split('T')[0])) endDate: string,
    @Query('department') department?: string,
  ) {
    return this.statisticsService.getAbnormalTrend(startDate, endDate, department);
  }
}