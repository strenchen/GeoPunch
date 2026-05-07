import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScheduleService } from './schedule.service';

@Controller('schedules')
@UseGuards(AuthGuard('jwt'))
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  async list(
    @Query('employee_id') employee_id?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string
  ) {
    return {
      code: 0,
      message: 'success',
      data: await this.scheduleService.list({
        employee_id: employee_id ? parseInt(employee_id) : undefined,
        start_date,
        end_date
      })
    };
  }

  @Post()
  async create(@Body() data: any) {
    return {
      code: 0,
      message: 'success',
      data: await this.scheduleService.create(data)
    };
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return {
      code: 0,
      message: 'success',
      data: await this.scheduleService.update(id, data)
    };
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.scheduleService.delete(id);
    return { code: 0, message: 'success' };
  }

  @Post('apply-shift')
  async applyShift(@Body() data: any) {
    return {
      code: 0,
      message: 'success',
      data: await this.scheduleService.applyShift(data)
    };
  }
}
