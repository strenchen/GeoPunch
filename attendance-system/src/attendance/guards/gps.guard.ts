import { Injectable, BadRequestException } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * GPS 校验 Guard
 * 验证请求中包含有效的 GPS 坐标，防止伪造位置打卡
 */
@Injectable()
export class GpsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { latitude, longitude } = request.body;

    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException('缺少 GPS 坐标信息');
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new BadRequestException('GPS 坐标格式错误');
    }

    // 校验坐标范围（中国区域大致范围）
    if (latitude < 15 || latitude > 55 || longitude < 73 || longitude > 135) {
      throw new BadRequestException('GPS 坐标超出中国范围，请检查定位设置');
    }

    // 精度校验：坐标至少保留5位小数（约1米精度）
    const latStr = latitude.toString();
    const lonStr = longitude.toString();
    if (latStr.includes('.') && latStr.split('.')[1].length < 5) {
      throw new BadRequestException('GPS 精度不足，请开启高精度定位');
    }

    // 检查设备时间与服务器时间差异（防止篡改时间）
    // 此处留空，实际可通过 NTP 校验或设备时间戳对比

    return true;
  }
}
