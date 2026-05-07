import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET') || 'attendance-photos';
  }

  async onModuleInit() {
    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'localhost',
      port: parseInt(this.configService.get<string>('MINIO_PORT') || '9000'),
      useSSL: false,
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
    });

    // 确保 bucket 存在
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        console.log(`✅ MinIO bucket '${this.bucket}' created`);
      }
    } catch (err: any) {
      console.log(`⚠️ MinIO 初始化: ${err.message}`);
    }
  }

  // 上传文件
  async upload(
    file: Express.Multer.File,
    folder: string = 'general',
  ): Promise<{ url: string; filename: string }> {
    const filename = `${folder}/${Date.now()}-${file.originalname}`;
    await this.client.putObject(this.bucket, filename, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const url = `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.bucket}/${filename}`;
    return { url, filename };
  }

  // 上传员工头像
  async uploadAvatar(
    file: Express.Multer.File,
    employeeId: number,
  ): Promise<{ url: string }> {
    const ext = file.originalname.split('.').pop();
    const filename = `avatar/${employeeId}.${ext}`;
    await this.client.putObject(this.bucket, filename, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const url = `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.bucket}/${filename}`;
    return { url };
  }

  // 上传考勤打卡照片
  async uploadClockPhoto(
    file: Express.Multer.File,
    employeeId: number,
    type: 'CHECK_IN' | 'CHECK_OUT',
  ): Promise<{ url: string }> {
    const date = new Date().toISOString().split('T')[0];
    const filename = `clock/${date}/${employeeId}-${type}-${Date.now()}.jpg`;
    await this.client.putObject(this.bucket, filename, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const url = `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.bucket}/${filename}`;
    return { url };
  }

  // 获取文件临时访问URL（presigned）
  async getSignedUrl(filename: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, filename, expirySeconds);
  }

  // 删除文件
  async delete(filename: string): Promise<void> {
    await this.client.removeObject(this.bucket, filename);
  }

  // 批量删除
  async deleteMany(filenames: string[]): Promise<void> {
    await Promise.all(filenames.map(f => this.client.removeObject(this.bucket, f)));
  }
}
