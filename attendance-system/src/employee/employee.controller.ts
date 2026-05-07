import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param,
  Query, UseGuards, Req, ParseIntPipe, HttpCode, HttpStatus
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmployeeService } from './employee.service';

@Controller('employees')
@UseGuards(AuthGuard('jwt'))
export class EmployeeController {
  constructor(private employeeService: EmployeeService) {}

  // 获取员工列表 (GET)
  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('department') department?: string,
    @Query('keyword') keyword?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.employeeService.findAll({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      department,
      keyword,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // 获取员工列表 (POST) - 前端调用
  @Post()
  async findAllPost(@Body() body: any) {
    const { department_id, status, search } = body;
    return this.employeeService.findAll({
      department: department_id,
      keyword: search,
      isActive: status == 'active' ? true : status == 'inactive' ? false : undefined,
    });
  }

  // 获取部门列表
  @Get('departments')
  getDepartments() {
    return this.employeeService.getDepartments();
  }

  // 获取单个员工
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.employeeService.findOne(id, req.user.id, req.user.role);
  }

  // 创建员工
  @Post('create')
  create(@Body() data: any) {
    return this.employeeService.create(data);
  }

  // 更新员工
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.employeeService.update(id, data, req.user.id, req.user.role);
  }

  // 修改账号状态
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'active' | 'inactive' | 'left' },
    @Req() req: any,
  ) {
    return this.employeeService.updateStatus(id, body.status, req.user.id, req.user.role);
  }

  // 删除员工（软删除）
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.employeeService.remove(id, req.user.id, req.user.role);
  }

  // 修改密码
  @Post(':id/password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { oldPassword: string; newPassword: string },
    @Req() req: any,
  ) {
    return this.employeeService.changePassword(id, body.oldPassword, body.newPassword, req.user.id, req.user.role);
  }

  // 分配角色
  @Put(':id/role')
  assignRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role: string },
    @Req() req: any,
  ) {
    return this.employeeService.assignRole(id, body.role, req.user.id, req.user.role);
  }

  // 批量导入
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  batchImport(
    @Body() body: { employees: Array<any> },
    @Req() req: any,
  ) {
    return this.employeeService.batchImport(body.employees, req.user.id, req.user.role);
  }
}
