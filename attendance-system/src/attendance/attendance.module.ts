import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { GpsGuard } from './guards/gps.guard';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, GpsGuard],
  exports: [AttendanceService],
})
export class AttendanceModule {}
