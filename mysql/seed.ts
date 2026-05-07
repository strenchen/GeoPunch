import { PrismaClient, Role, ConfigType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 创建管理员账号
  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.employee.upsert({
    where: { employeeNumber: 'ADMIN001' },
    update: {},
    create: {
      employeeNumber: 'ADMIN001',
      name: '系统管理员',
      passwordHash: adminPassword,
      department: '行政部',
      position: '系统管理员',
      role: Role.ADMIN,
      hireDate: new Date('2020-01-01'),
    },
  });

  // 创建测试员工
  const empPassword = await bcrypt.hash('emp123456', 12);
  await prisma.employee.upsert({
    where: { employeeNumber: 'EMP001' },
    update: {},
    create: {
      employeeNumber: 'EMP001',
      name: '张三',
      passwordHash: empPassword,
      department: '技术部',
      position: '高级工程师',
      role: Role.EMPLOYEE,
      hireDate: new Date('2022-03-15'),
    },
  });

  await prisma.employee.upsert({
    where: { employeeNumber: 'EMP002' },
    update: {},
    create: {
      employeeNumber: 'EMP002',
      name: '李四',
      passwordHash: empPassword,
      department: '技术部',
      position: '技术经理',
      role: Role.MANAGER,
      hireDate: new Date('2021-06-01'),
    },
  });

  // 添加考勤地点白名单
  await prisma.locationWhitelist.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: '总部办公室',
      department: '技术部',
      latitude: 31.2304,
      longitude: 121.4737,
      radiusMeters: 300,
      isActive: true,
    },
  });

  // 添加系统配置
  const configs = [
    { key: 'ATTENDANCE_WORK_START', value: '09:00', type: ConfigType.STRING, label: '上班时间' },
    { key: 'ATTENDANCE_WORK_END', value: '18:00', type: ConfigType.STRING, label: '下班时间' },
    { key: 'ATTENDANCE_LATE_THRESHOLD_MINUTES', value: '30', type: ConfigType.NUMBER, label: '迟到阈值（分钟）' },
    { key: 'ATTENDANCE_GPS_RADIUS_DEFAULT', value: '200', type: ConfigType.NUMBER, label: '默认打卡半径（米）' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }

  console.log('✅ Seed 完成');
  console.log('  管理员: ADMIN001 / admin123');
  console.log('  测试员工: EMP001 / emp123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
