import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  // 获取所有员工（分页）
  async findAll(params: {
    page?: number;
    pageSize?: number;
    departmentId?: number;
    keyword?: string;
    isActive?: boolean;
    employeeType?: string;
  }) {
    const { page = 1, pageSize = 20, departmentId, keyword, isActive, employeeType } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (isActive !== undefined) where.isActive = isActive;
    if (employeeType) where.employeeType = employeeType;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { employeeNumber: { contains: keyword } },
        { phone: { contains: keyword } },
      ];
    }

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: pageSize,
        select: {
          id: true,
          employeeNumber: true,
          name: true,
          phone: true,
          position: true,
          role: true,
          isActive: true,
          hireDate: true,
          createdAt: true,
          department: { select: { id: true, name: true } },
          employeeType: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      code: 0,
      message: 'success',
      data: {
        employees,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // 获取单个员工
  async findOne(id: number, requesterId: number, requesterRole: string) {
    if (requesterRole !== 'ADMIN' && requesterRole !== 'MANAGER' && requesterId !== id) {
      throw new ForbiddenException({ code: 10003, message: '无权查看他人信息' });
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        employeeNumber: true,
        name: true,
        phone: true,
        position: true,
        role: true,
        isActive: true,
        hireDate: true,
        createdAt: true,
        department: { select: { id: true, name: true } },
        employeeType: true,
      },
    });

    if (!employee) throw new NotFoundException({ code: 10004, message: '员工不存在' });
    
    return {
      code: 0,
      message: 'success',
      data: employee,
    };
  }

  // 创建员工
  async create(data: {
    employeeNumber: string;
    name: string;
    password: string;
    departmentId: number;
    position?: string;
    roleId: number;
    employeeType?: string;
    phone?: string;
    hireDate?: Date;
  }) {
    const existing = await this.prisma.employee.findUnique({
      where: { employeeNumber: data.employeeNumber },
    });

    if (existing) throw new BadRequestException({ code: 10005, message: '工号已存在' });

    // 验证部门存在
    const department = await this.prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!department) throw new BadRequestException({ code: 10004, message: '部门不存在' });

    // 验证角色存在
    const role = await this.prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role) throw new BadRequestException({ code: 10004, message: '角色不存在' });

    const passwordHash = await bcrypt.hash(data.password, 12);

    const employee = await this.prisma.employee.create({
      data: {
        employeeNumber: data.employeeNumber,
        name: data.name,
        passwordHash,
        departmentId: data.departmentId,
        position: data.position,
        roleId: data.roleId,
        employeeType: (data.employeeType as any) || 'RD_ADMIN',
        phone: data.phone,
        hireDate: data.hireDate || new Date(),
      },
      select: {
        id: true,
        employeeNumber: true,
        name: true,
        phone: true,
        position: true,
        role: { select: { id: true, name: true } },
        isActive: true,
        department: { select: { id: true, name: true } },
        employeeType: true,
      },
    });

    await this.logOperation(0, 'EMPLOYEE', 'CREATE', 'employee', employee.id, `创建员工: ${employee.name}`);

    return {
      code: 0,
      message: 'success',
      data: employee,
    };
  }

  // 更新员工
  async update(
    id: number, 
    data: Partial<{
      name: string;
      departmentId: number;
      position: string;
      roleId: number;
      employeeType: string;
      phone: string;
    }>,
    requesterId: number,
    requesterRole: string,
  ) {
    if (requesterRole !== 'ADMIN' && requesterRole !== 'MANAGER') {
      throw new ForbiddenException({ code: 10003, message: '无权修改员工信息' });
    }

    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException({ code: 10004, message: '员工不存在' });

    // ADMIN 角色才能修改 role 和 employeeType
    if (data.roleId && requesterRole !== 'ADMIN') {
      delete data.roleId;
    }
    if (data.employeeType && requesterRole !== 'ADMIN') {
      delete data.employeeType;
    }

    // 过滤不允许更新的字段
    delete (data as any).passwordHash;
    delete (data as any).hireDate;
    delete (data as any).employeeNumber;

    const updated = await this.prisma.employee.update({
      where: { id },
      data: data as any,
      select: {
        id: true,
        employeeNumber: true,
        name: true,
        phone: true,
        position: true,
        role: { select: { id: true, name: true } },
        isActive: true,
        department: { select: { id: true, name: true } },
        employeeType: true,
      },
    });

    await this.logOperation(requesterId, 'EMPLOYEE', 'UPDATE', 'employee', id, `更新员工: ${updated.name}`);

    return {
      code: 0,
      message: 'success',
      data: updated,
    };
  }

  // 修改账号状态（软删除/禁用）
  async updateStatus(
    id: number, 
    status: 'active' | 'inactive' | 'left',
    requesterId: number,
    requesterRole: string,
  ) {
    if (requesterRole !== 'ADMIN') {
      throw new ForbiddenException({ code: 10003, message: '只有超级管理员可以修改账号状态' });
    }

    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException({ code: 10004, message: '员工不存在' });

    const isActive = status !== 'inactive' && status !== 'left';
    
    const updated = await this.prisma.employee.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        employeeNumber: true,
        name: true,
        isActive: true,
      },
    });

    await this.logOperation(requesterId, 'EMPLOYEE', 'UPDATE_STATUS', 'employee', id, `修改账号状态: ${status}`);

    return {
      code: 0,
      message: 'success',
      data: updated,
    };
  }

  // 删除员工（软删除）
  async remove(id: number, requesterId: number, requesterRole: string) {
    if (requesterRole !== 'ADMIN' && requesterRole !== 'MANAGER') {
      throw new ForbiddenException({ code: 10003, message: '无权删除员工' });
    }

    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException({ code: 10004, message: '员工不存在' });

    await this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });

    await this.logOperation(requesterId, 'EMPLOYEE', 'DELETE', 'employee', id, `删除员工: ${employee.name}`);

    return { code: 0, message: '员工已禁用', data: null };
  }

  // 修改密码
  async changePassword(id: number, oldPassword: string, newPassword: string, requesterId: number, requesterRole: string) {
    if (requesterId !== id && requesterRole !== 'ADMIN') {
      throw new ForbiddenException({ code: 10003, message: '无权修改他人密码' });
    }

    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException({ code: 10004, message: '员工不存在' });

    if (requesterRole !== 'ADMIN') {
      const isValid = await bcrypt.compare(oldPassword, employee.passwordHash);
      if (!isValid) throw new BadRequestException({ code: 10001, message: '原密码错误' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.employee.update({
      where: { id },
      data: { passwordHash },
    });

    await this.logOperation(requesterId, 'EMPLOYEE', 'CHANGE_PASSWORD', 'employee', id, '修改密码');

    return { code: 0, message: '密码修改成功', data: null };
  }

  // 分配角色
  async assignRole(id: number, roleId: number, requesterId: number, requesterRole: string) {
    if (requesterRole !== 'ADMIN') {
      throw new ForbiddenException({ code: 10003, message: '只有超级管理员可以分配角色' });
    }

    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException({ code: 10004, message: '员工不存在' });

    const updated = await this.prisma.employee.update({
      where: { id },
      data: { roleId: roleId as any },
      select: { id: true, name: true, role: { select: { id: true, name: true } } },
    });

    await this.logOperation(requesterId, 'EMPLOYEE', 'ASSIGN_ROLE', 'employee', id, `分配角色: ${roleId}`);

    return {
      code: 0,
      message: 'success',
      data: updated,
    };
  }

  // 获取部门列表
  async getDepartments() {
    const departments = await this.prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
    return { 
      code: 0, 
      message: 'success', 
      data: departments.map(d => ({ id: d.id, name: d.name, parentId: d.parentId })) 
    };
  }

  // 批量导入员工
  async batchImport(
    employees: Array<{
      employeeNumber: string;
      name: string;
      password: string;
      departmentId: number;
      position?: string;
      roleId: number;
      employeeType?: string;
      phone?: string;
    }>,
    requesterId: number,
    requesterRole: string,
  ) {
    if (requesterRole !== 'ADMIN' && requesterRole !== 'MANAGER') {
      throw new ForbiddenException({ code: 10003, message: '无权批量导入' });
    }

    const results = [];
    for (const emp of employees) {
      try {
        const existing = await this.prisma.employee.findUnique({
          where: { employeeNumber: emp.employeeNumber },
        });

        if (existing) {
          results.push({ employeeNumber: emp.employeeNumber, success: false, reason: '工号已存在' });
          continue;
        }

        const passwordHash = await bcrypt.hash(emp.password, 12);
        const created = await this.prisma.employee.create({
          data: {
            employeeNumber: emp.employeeNumber,
            name: emp.name,
            passwordHash,
            departmentId: emp.departmentId,
            position: emp.position,
            roleId: emp.roleId,
            employeeType: (emp.employeeType as any) || 'RD_ADMIN',
            phone: emp.phone,
            hireDate: new Date(),
          },
          select: { id: true, employeeNumber: true, name: true },
        });

        results.push({ ...created, success: true });
      } catch (e) {
        results.push({ employeeNumber: emp.employeeNumber, success: false, reason: e.message });
      }
    }

    await this.logOperation(requesterId, 'EMPLOYEE', 'BATCH_IMPORT', 'employee', 0, `批量导入 ${employees.length} 名员工`);

    return {
      code: 0,
      message: '导入完成',
      data: {
        total: employees.length,
        successCount: results.filter(r => r.success).length,
        failCount: results.filter(r => !r.success).length,
        results,
      },
    };
  }

  private async logOperation(
    operatorId: number,
    module: string,
    action: string,
    targetType: string,
    targetId: number,
    detail: string,
  ) {
    await this.prisma.operationLog.create({
      data: { operatorId, module, action, targetType, targetId, detail },
    });
  }
}
