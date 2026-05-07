import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局管道 - 参数校验
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS 配置
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://8.133.202.164:8888',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // 允许没有 origin 的请求（如 Postman/curl）
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`), false);
      }
    },
    credentials: true,
  });

  // API 前缀 (nginx 已剥离 /api/v1 前缀)
  app.setGlobalPrefix('api/v1');

  // 上传文件静态访问
  const uploadsPath = process.env.UPLOAD_BASE_PATH || '/root/.openclaw/workspaces/coordinator/GeoPunch-project/uploads';
  app.use('/uploads', require('express').static(uploadsPath));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Attendance System running on http://localhost:${port}/api/v1`);
}

bootstrap();