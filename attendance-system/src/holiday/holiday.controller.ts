import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HolidayService } from './holiday.service';

@Controller('config/attendance')
@UseGuards(AuthGuard('jwt'))
export class HolidayController {
  constructor(private holidayService: HolidayService) {}

  @Get('config')
  getConfig() {
    return this.holidayService.getAll();
  }

  @Post('config')
  create(@Body() data: { date: string; name: string; is_workday: boolean }) {
    return this.holidayService.create(data);
  }

  @Delete('config')
  delete(@Body() body: { id: number }) {
    return this.holidayService.delete(body.id);
  }
}
