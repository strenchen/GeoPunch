import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const departments = await this.prisma.department.findMany({
      orderBy: { id: 'asc' },
    });
    return { code: 0, message: 'success', data: departments };
  }

  async findOne(id: number) {
    const department = await this.prisma.department.findUnique({ where: { id } });
    if (!department) throw new NotFoundException({ code: 10004, message: '部门不存在' });
    return { code: 0, message: 'success', data: department };
  }

  async create(data: { name: string }) {
    const department = await this.prisma.department.create({ data: { name: data.name } });
    return { code: 0, message: 'success', data: department };
  }

  async update(id: number, data: { name?: string }) {
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 10004, message: '部门不存在' });
    const updated = await this.prisma.department.update({
      where: { id },
      data: { name: data.name ?? existing.name },
    });
    return { code: 0, message: 'success', data: updated };
  }

  async delete(id: number) {
    const department = await this.prisma.department.findUnique({ where: { id } });
    if (!department) throw new NotFoundException({ code: 10004, message: '部门不存在' });
    // 检查是否有员工关联（员工表用 department 字符串字段）
    await this.prisma.department.delete({ where: { id } });
    return { code: 0, message: 'success', data: null };
  }
}
