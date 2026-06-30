import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';

/** Assigns a request id (honours an inbound X-Request-Id) and echoes it on the response. */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { requestId?: string }>();
    const res = http.getResponse<Response>();
    const inbound = req.header('x-request-id');
    const requestId = inbound && inbound.trim() ? inbound.trim() : `req_${randomUUID()}`;
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    return next.handle();
  }
}
