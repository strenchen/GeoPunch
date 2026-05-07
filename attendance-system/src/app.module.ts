import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { EmployeeModule } from './employee/employee.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ApprovalModule } from './approval/approval.module';
import { StatisticsModule } from './statistics/statistics.module';
import { StorageModule } from './storage/storage.module';
import { LoggingModule } from './logging/logging.module';
import { ConfigModule as SystemConfigModule } from './config/config.module';
import { ScheduleModule } from './schedule/schedule.module';
import { DepartmentModule } from './department/department.module';
import { HolidayModule } from './holiday/holiday.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 数据库
    PrismaModule,

    // Redis
    RedisModule,

    // JWT
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'attendance-secret-key-2024',
        signOptions: { expiresIn: '1h' }, // access token 1小时
      }),
      inject: [ConfigService],
    }),

    // 限流
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // 业务模块
    AuthModule,
    EmployeeModule,
    AttendanceModule,
    ApprovalModule,
    StatisticsModule,
    StorageModule,
    LoggingModule,
    SystemConfigModule,
    ScheduleModule,
    DepartmentModule,
    HolidayModule,
  ],
})
export class AppModule {}