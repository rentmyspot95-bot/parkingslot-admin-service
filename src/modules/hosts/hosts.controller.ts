import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HostsService } from './hosts.service';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('hosts')
@ApiBearerAuth()
@Controller('admin')
export class HostsController {
  constructor(private readonly hosts: HostsService) {}

  @Get('hosts')
  @RequirePermissions('host.read')
  list(@Query() query: PaginationQueryDto, @Query('kycStatus') kycStatus?: string) {
    return this.hosts.list(query, kycStatus);
  }

  @Get('hosts/:id')
  @RequirePermissions('host.read')
  getOne(@Param('id') id: string) {
    return this.hosts.getOne(id);
  }

  @Post('hosts/:id/kyc/decision')
  @RequirePermissions('host.verify')
  decideKyc(@Param('id') id: string, @Body() body: { decision: string; reason?: string }) {
    return this.hosts.decideKyc(id, body);
  }

  @Patch('hosts/:id/status')
  @RequirePermissions('host.suspend')
  updateStatus(@Param('id') id: string, @Body() body: { status: string; reason: string }) {
    return this.hosts.updateStatus(id, body);
  }

  @Post('hosts/:id/flag')
  @RequirePermissions('host.suspend')
  flag(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.hosts.flag(id, body);
  }

  @Get('hosts/:id/approval-stats')
  @RequirePermissions('host.read')
  approvalStats(@Param('id') id: string) {
    return this.hosts.approvalStats(id);
  }
}
