import {
  Controller, Post, Get, Delete, Param,
  UseGuards, Req, UseInterceptors, UploadedFile, Body
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';

@Controller('storage')
@UseGuards(AuthGuard('jwt'))
export class StorageController {
  constructor(private storageService: StorageService) {}

  // 上传通用文件
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    return this.storageService.upload(file, folder);
  }

  // 上传头像
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.storageService.uploadAvatar(file, req.user.id);
  }

  // 上传打卡照片
  @Post('clock-photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadClockPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: 'CHECK_IN' | 'CHECK_OUT',
    @Req() req: any,
  ) {
    return this.storageService.uploadClockPhoto(file, req.user.id, type);
  }

  // 获取文件访问URL
  @Get('url/:filename')
  async getUrl(@Param('filename') filename: string) {
    const url = await this.storageService.getSignedUrl(decodeURIComponent(filename));
    return { url };
  }

  // 删除文件
  @Delete(':filename')
  async delete(@Param('filename') filename: string) {
    await this.storageService.delete(decodeURIComponent(filename));
    return { message: '删除成功' };
  }
}
