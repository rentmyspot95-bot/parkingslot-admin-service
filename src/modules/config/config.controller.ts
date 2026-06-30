import { Body, Controller, Get, Param, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigManagementService } from './config.service';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import type { AuthenticatedAdmin } from '../../auth/auth.types';

@ApiTags('config')
@ApiBearerAuth()
@Controller('admin')
export class ConfigController {
  constructor(private readonly config: ConfigManagementService) {}

  @Get('config')
  @RequirePermissions('config.read')
  getConfig() {
    return this.config.getConfig();
  }

  @Put('config')
  @RequirePermissions('config.write')
  updateConfig(
    @Body() body: { config?: Record<string, unknown>; reason?: string },
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.config.updateConfig(body.config ?? {}, admin.email);
  }

  @Get('flags')
  @RequirePermissions('config.read')
  listFlags() {
    return this.config.listFlags();
  }

  @Patch('flags/:key')
  @RequirePermissions('config.write')
  toggleFlag(
    @Param('key') key: string,
    @Body() body: { enabled: boolean },
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.config.toggleFlag(key, !!body.enabled, admin.email);
  }
}
