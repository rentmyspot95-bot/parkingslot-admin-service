import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import type { AuthenticatedAdmin } from './auth.types';

@ApiTags('me')
@ApiBearerAuth()
@Controller('admin')
export class MeController {
  constructor(private readonly auth: AuthService) {}

  /** GET /api/v1/admin/me — current admin + freshly resolved permissions. */
  @Get('me')
  me(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.auth.me(admin.id);
  }
}
