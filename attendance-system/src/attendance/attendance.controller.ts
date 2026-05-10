import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
@UseGuards(AuthGuard('jwt'))
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock')
  clock(
    @Body() body: { type: 'CHECK_IN' | 'CHECK_OUT'; latitude: number; longitude: number; address?: string; deviceId?: string; clientVersion?: string },
    @Req() req: any,
  ) {
    return this.attendanceService.clockIn(
      req.user.id,
      body.type,
      { latitude: body.latitude, longitude: body.longitude, address: body.address },
      body.deviceId,
      body.clientVersion,
    );
  }

  @Get('records')
  getRecords(@Query('employeeId') employeeId?: string, @Query('month') month?: string) {
    return this.attendanceService.getRecords(
      employeeId ? parseInt(employeeId) : undefined,
      { month: month ? parseInt(month) : undefined },
    );
  }

  @Get('status/today')
  getTodayStatus(@Req() req: any) {
    return this.attendanceService.getTodayStatus(req.user.id);
  }

  @Post('sync')
  syncAttendance(@Body() body: any[], @Req() req: any) {
    return this.attendanceService.syncOfflineCheckin(req.user.id, body);
  }

  @Get('abnormals')
  getAbnormals(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('department') department?: string,
  ) {
    return this.attendanceService.getAbnormals({
      status,
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
  }

  @Put('abnormals/:id/resolve')
  resolveAbnormal(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { resolution: 'APPROVED' | 'REJECTED'; note?: string },
  ) {
    return this.attendanceService.resolveAbnormal(id, body.resolution, body.note);
  }

  @Delete(':id')
  deleteRecord(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.attendanceService.deleteRecord(id, req.user.id);
  }

  @Get('leave-balance/:employeeId')
  getLeaveBalance(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.attendanceService.getLeaveBalance(employeeId);
  }
}
