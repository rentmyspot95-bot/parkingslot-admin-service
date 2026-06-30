import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminsService } from './admins.service';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('admins')
@ApiBearerAuth()
@Controller('admin')
export class AdminsController {
  constructor(private readonly admins: AdminsService) {}

  @Get('admins')
  @RequirePermissions('admin.read')
  listAdmins(@Query() query: PaginationQueryDto) {
    return this.admins.listAdmins(query);
  }

  @Post('admins/invite')
  @RequirePermissions('admin.manage')
  invite(@Body() body: { email: string; name: string; roles?: string[] }) {
    return this.admins.invite(body);
  }

  @Patch('admins/:id')
  @RequirePermissions('admin.manage')
  updateAdmin(
    @Param('id') id: string,
    @Body() body: { status?: string; roles?: string[]; totpEnabled?: boolean },
  ) {
    return this.admins.updateAdmin(id, body);
  }

  @Get('roles')
  @RequirePermissions('admin.read')
  listRoles() {
    return this.admins.listRoles();
  }

  @Post('roles')
  @RequirePermissions('admin.manage')
  createRole(@Body() body: { name: string; permissions: string[] }) {
    return this.admins.saveRole(body);
  }

  @Patch('roles')
  @RequirePermissions('admin.manage')
  updateRole(@Body() body: { id: string; name: string; permissions: string[] }) {
    return this.admins.saveRole(body);
  }
}
