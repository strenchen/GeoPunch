import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from './config.service';

@Controller('config')
@UseGuards(AuthGuard('jwt'))
export class ConfigController {
  constructor(private configService: ConfigService) {}

  // 获取所有配置
  @Get()
  findAll() {
    return this.configService.findAll();
  }

  // 获取单个配置
  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.configService.findOne(key);
  }

  // 更新配置
  @Put(':key')
  update(
    @Param('key') key: string,
    @Body() body: { value: string; label?: string; type?: string },
  ) {
    return this.configService.update(key, body.value, body.label, body.type);
  }

  // 批量更新配置
  @Post('batch')
  batchUpdate(@Body() body: { configs: Array<{ key: string; value: string; label?: string }> }) {
    return this.configService.batchUpdate(body.configs);
  }

  // 删除配置
  @Delete(':key')
  remove(@Param('key') key: string) {
    return this.configService.remove(key);
  }

  // 获取考勤配置
  @Get('attendance/config')
  getAttendanceConfig() {
    return this.configService.getAttendanceConfig();
  }
}