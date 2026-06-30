import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from './audit.service';
import type { AuthenticatedAdmin } from '../auth/auth.types';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Audit-first: after any successful mutation by an authenticated admin, write an
 * AuditLog row (actor, action, target, reason, requestId). Reads are not audited
 * (exports audit themselves explicitly).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<
      Request & { user?: AuthenticatedAdmin; requestId?: string }
    >();

    if (!MUTATING.has(req.method)) return next.handle();

    return next.handle().pipe(
      tap(() => {
        const user = req.user;
        if (!user) return; // public mutations (login/refresh) aren't audited
        const { action, targetType, targetId } = deriveTarget(req);
        const body = (req.body ?? {}) as Record<string, unknown>;
        void this.audit.record({
          actorAdminId: user.id,
          actorName: user.name,
          action,
          targetType,
          targetId,
          reason: typeof body.reason === 'string' ? body.reason : null,
          metadata: { method: req.method, path: req.path },
          ip: req.ip ?? null,
          requestId: req.requestId ?? null,
        });
      }),
    );
  }
}

/** Derive (action, targetType, targetId) from the admin route, e.g.
 *  POST /api/v1/admin/payments/pay_1/refund → payment.refund, payment, pay_1 */
function deriveTarget(req: Request): {
  action: string;
  targetType: string;
  targetId: string | null;
} {
  const segs = req.path.split('/').filter(Boolean);
  const adminIdx = segs.indexOf('admin');
  const rest = adminIdx >= 0 ? segs.slice(adminIdx + 1) : segs;
  const resource = rest[0] ?? 'unknown';
  const targetType = resource.replace(/s$/, '');
  const params = req.params as Record<string, string> | undefined;
  const id = params?.id ?? (rest[1] && !rest[1].includes(':') ? rest[1] : null);
  const verb = rest.length > 2 ? rest[rest.length - 1] : req.method.toLowerCase();
  return { action: `${targetType}.${verb}`, targetType, targetId: id ?? null };
}
