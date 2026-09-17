import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Response } from 'express';
import { toLibraryHttpException } from '../../../library';

@Catch()
export class AdminImportExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (this.isPayloadTooLarge(exception)) {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: 413,
        error: 'Payload Too Large',
        message: 'File size exceeds 5 MB limit',
        code: 'FILE_TOO_LARGE',
      });
      return;
    }

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    const httpException = toLibraryHttpException(exception);
    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private isPayloadTooLarge(exception: unknown): boolean {
    if (exception instanceof PayloadTooLargeException) {
      return true;
    }
    const err = exception as { code?: string; message?: string };
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return true;
    }
    const msg = typeof err?.message === 'string' ? err.message : '';
    return msg.includes('File too large') || msg.includes('LIMIT_FILE_SIZE');
  }
}
