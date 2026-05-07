import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService implements OnModuleInit {
  private basePath: string;
  private host: string;
  private port: number;

  constructor(private configService: ConfigService) {
    this.basePath = this.configService.get<string>('UPLOAD_BASE_PATH') || '/root/.openclaw/workspaces/coordinator/GeoPunch-project/uploads';
    this.host = this.configService.get<string>('APP_HOST') || 'localhost';
    this.port = parseInt(this.configService.get<string>('APP_PORT') || '3000');
  }

  async onModuleInit() {
    // 确保上传目录存在
    const dirs = ['avatar', 'clock', 'general'];
    for (const dir of dirs) {
      const fullPath = path.join(this.basePath, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ 创建上传目录: ${fullPath}`);
      }
    }
    console.log(`✅ 本地存储初始化完成: ${this.basePath}`);
  }

  private getUrl(filename: string): string {
    return `http://${this.host}:${this.port}/uploads/${filename}`;
  }

  // 上传文件
  async upload(
    file: Express.Multer.File,
    folder: string = 'general',
  ): Promise<{ url: string; filename: string }> {
    const filename = `${folder}/${Date.now()}-${file.originalname}`;
    const fullPath = path.join(this.basePath, filename);
    
    // 确保目录存在
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, file.buffer);
    const url = this.getUrl(filename);
    return { url, filename };
  }

  // 上传员工头像
  async uploadAvatar(
    file: Express.Multer.File,
    employeeId: number,
  ): Promise<{ url: string }> {
    const ext = file.originalname.split('.').pop();
    const filename = `avatar/${employeeId}.${ext}`;
    const fullPath = path.join(this.basePath, filename);
    
    fs.writeFileSync(fullPath, file.buffer);
    const url = this.getUrl(filename);
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
    const fullPath = path.join(this.basePath, filename);
    
    // 确保目录存在
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, file.buffer);
    const url = this.getUrl(filename);
    return { url };
  }

  // 获取文件访问URL（直接返回公开URL）
  async getSignedUrl(filename: string, expirySeconds = 3600): Promise<string> {
    return this.getUrl(filename);
  }

  // 删除文件
  async delete(filename: string): Promise<void> {
    const fullPath = path.join(this.basePath, filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  // 批量删除
  async deleteMany(filenames: string[]): Promise<void> {
    for (const filename of filenames) {
      await this.delete(filename);
    }
  }
}
