import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 10000; // 默认系统错误
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      
      if (typeof errorResponse === 'object' && errorResponse !== null) {
        // 如果已经是标准格式 { code, message, data }
        if ('code' in errorResponse) {
          const err = errorResponse as any;
          response.status(status).json({
            code: err.code || status,
            message: err.message || message,
            data: err.data || null,
          });
          return;
        }
        // 否则是普通错误对象
        if ('message' in errorResponse) {
          const msg = errorResponse.message as string | string[];
          message = Array.isArray(msg) 
            ? msg.join(', ') 
            : msg;
        }
      } else {
        message = String(exception.message);
      }
    } else if (exception instanceof Error) {
      message = (exception as Error).message || '未知错误';
    }

    // 根据 HTTP 状态码映射业务错误码
    if (status === HttpStatus.BAD_REQUEST) code = 10001;
    else if (status === HttpStatus.UNAUTHORIZED) code = 10002;
    else if (status === HttpStatus.FORBIDDEN) code = 10003;
    else if (status === HttpStatus.NOT_FOUND) code = 10004;
    else if (status === HttpStatus.CONFLICT) code = 10005;

    response.status(status).json({
      code,
      message,
      data: null,
    });
  }
}