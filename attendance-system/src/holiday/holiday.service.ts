import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HolidayService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const holidays = await this.prisma.holiday.findMany({
      orderBy: { date: 'asc' },
    });
    const data = holidays.map(h => ({
      id: h.id,
      date: h.date,
      name: h.name,
      is_workday: h.isWorkday,
      createdAt: h.createdAt,
    }));
    return { code: 0, message: 'success', data };
  }

  async create(data: { date: string; name: string; is_workday: boolean }) {
    const holiday = await this.prisma.holiday.upsert({
      where: { date: data.date },
      update: { name: data.name, isWorkday: data.is_workday },
      create: { date: data.date, name: data.name, isWorkday: data.is_workday },
    });
    return { code: 0, message: 'success', data: holiday };
  }

  async delete(id: number) {
    await this.prisma.holiday.delete({ where: { id } });
    return { code: 0, message: 'success', data: null };
  }
}
