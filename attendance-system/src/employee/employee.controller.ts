import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param,
  Query, UseGuards, Req, ParseIntPipe, HttpCode, HttpStatus
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmployeeService } from './employee.service';

@Controller('employee')
@UseGuards(AuthGuard('jwt'))
export class EmployeeController {
  constructor(private employeeService: EmployeeService) {}

  // 获取员工列表
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('department_id') departmentId?: string,
    @Query('keyword') keyword?: string,
    @Query('isActive') isActive?: string,
    @Query('employee_type') employeeType?: string,
  ) {
    return this.employeeService.findAll({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      departmentId: departmentId ? Number(departmentId) : undefined,
      keyword,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      employeeType,
    });
  }

  // 获取部门列表
  @Get('department')
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
  @Post()
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
    @Body() body: { roleId: number },
    @Req() req: any,
  ) {
    return this.employeeService.assignRole(id, body.roleId, req.user.id, req.user.role);
  }

  // 批量导入
  @Post('import')
  @HttpCode(HttpStatus.OK)
  batchImport(
    @Body() body: { employees: Array<any> },
    @Req() req: any,
  ) {
    return this.employeeService.batchImport(body.employees, req.user.id, req.user.role);
  }
}
