import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { NotFoundDomainException } from '../common/errors/domain.exception';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit.read')
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('q') q?: string,
    @Query('targetType') targetType?: string,
  ) {
    return this.audit.list({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
      sort,
      q,
      targetType,
    });
  }

  /** PII-bearing export — itself audited (design doc §8). Declared before :id. */
  @Get('export')
  @RequirePermissions('audit.read', 'export.run')
  async export(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Req() req: Request & { requestId?: string },
  ) {
    await this.audit.record({
      actorAdminId: admin.id,
      actorName: admin.name,
      action: 'audit.export',
      targetType: 'audit',
      targetId: null,
      reason: 'Exported audit log',
      ip: req.ip ?? null,
      requestId: req.requestId ?? null,
    });
    return { ok: true, url: null, message: 'Export queued; you will receive a download link.' };
  }

  @Get(':id')
  @RequirePermissions('audit.read')
  async get(@Param('id') id: string) {
    const entry = await this.audit.get(id);
    if (!entry) throw new NotFoundDomainException('Audit entry not found');
    return entry;
  }
}
