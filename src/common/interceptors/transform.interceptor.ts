import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function isPaginated(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    'data' in value &&
    'total' in value &&
    'page' in value
  );
}

/**
 * Wraps controller results in the `{ data }` envelope the console expects.
 * Already-paginated results ({ data, page, limit, total }) pass through unchanged.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value) => {
        if (value === undefined || value === null) return { data: null };
        if (isPaginated(value)) return value;
        return { data: value };
      }),
    );
  }
}
