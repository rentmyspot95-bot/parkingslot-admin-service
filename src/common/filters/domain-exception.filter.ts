import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Emits the error envelope the admin console expects:
 *   { "error": { "code", "message", "requestId" } }
 * (design doc §10). Differs intentionally from the other services' envelope so
 * the console's API client can read `error.code` / `error.requestId` directly.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        if (typeof b.code === 'string') code = b.code;
        if (typeof b.message === 'string') message = b.message;
        else if (Array.isArray(b.message)) message = b.message.join('; ');
        else if (typeof b.error === 'string') message = b.error;
      }
      if (code === 'INTERNAL_SERVER_ERROR') {
        code = exception.constructor.name
          .replace(/Exception$/i, '')
          .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
          .toUpperCase();
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} → ${status} ${code}`);
    }

    response.status(status).json({ error: { code, message, requestId } });
  }
}
