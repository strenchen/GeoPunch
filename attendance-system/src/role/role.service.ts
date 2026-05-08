import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { employees: true } } },
    });
    return { code: 0, message: 'success', data: roles };
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!role) throw new NotFoundException({ code: 10004, message: '角色不存在' });
    return { code: 0, message: 'success', data: role };
  }

  async create(data: { name: string; permissions?: any }) {
    const existing = await this.prisma.role.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictException({ code: 10005, message: '角色名已存在' });

    const role = await this.prisma.role.create({
      data: {
        name: data.name,
        permissions: data.permissions || { view: true },
      },
    });
    return { code: 0, message: 'success', data: role };
  }

  async update(id: number, data: { name?: string; permissions?: any }) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 10004, message: '角色不存在' });

    if (data.name && data.name !== existing.name) {
      const duplicate = await this.prisma.role.findUnique({ where: { name: data.name } });
      if (duplicate) throw new ConflictException({ code: 10005, message: '角色名已存在' });
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        permissions: data.permissions ?? existing.permissions,
      },
    });
    return { code: 0, message: 'success', data: updated };
  }

  async delete(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException({ code: 10004, message: '角色不存在' });

    // 检查是否有员工关联
    const employeeCount = await this.prisma.employee.count({ where: { roleId: id } });
    if (employeeCount > 0) {
      throw new ConflictException({ code: 10006, message: `该角色下有 ${employeeCount} 名员工，无法删除` });
    }

    await this.prisma.role.delete({ where: { id } });
    return { code: 0, message: 'success', data: null };
  }
}