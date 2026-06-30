import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('admin')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  @RequirePermissions('notification.send')
  list(@Query() query: PaginationQueryDto) {
    return this.notifications.list(query);
  }

  @Post('notifications')
  @RequirePermissions('notification.send')
  create(@Body() body: Record<string, unknown>) {
    return this.notifications.create(body);
  }

  // Declared before POST 'notifications/:id/send' so ':id' does not capture 'test'.
  @Post('notifications/test')
  @RequirePermissions('notification.send')
  test(
    @Body() body: { title: string; body: string; deepLinkType: string; deviceToken: string },
  ) {
    return this.notifications.test(body);
  }

  @Post('notifications/:id/send')
  @RequirePermissions('notification.send')
  send(@Param('id') id: string) {
    return this.notifications.send(id);
  }
}
