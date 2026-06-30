import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { hasPermission, type Permission } from '../permissions';
import type { AuthenticatedAdmin } from '../auth.types';
import {
  ForbiddenDomainException,
  UnauthorizedDomainException,
} from '../../common/errors/domain.exception';

/** Enforces @RequirePermissions — the admin must hold at least one listed permission. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as AuthenticatedAdmin | undefined;
    if (!user) throw new UnauthorizedDomainException();

    const granted = new Set(user.permissions);
    const ok = required.some((p) => hasPermission(granted, p));
    if (!ok) {
      throw new ForbiddenDomainException(`Missing permission: ${required.join(' or ')}`);
    }
    return true;
  }
}
