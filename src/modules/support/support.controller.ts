import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('support')
@ApiBearerAuth()
@Controller('admin')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('support/threads')
  @RequirePermissions('support.read')
  listThreads(@Query() query: PaginationQueryDto) {
    return this.support.listThreads(query);
  }

  // Declared before GET 'support/threads/:id' so the more specific route wins.
  @Get('support/threads/:id/messages')
  @RequirePermissions('support.read')
  listMessages(@Param('id') id: string) {
    return this.support.listMessages(id);
  }

  @Get('support/threads/:id')
  @RequirePermissions('support.read')
  getThread(@Param('id') id: string) {
    return this.support.getThread(id);
  }

  @Post('support/threads/:id/reply')
  @RequirePermissions('support.reply')
  reply(@Param('id') id: string, @Body() body: { body: string }) {
    return this.support.reply(id, body);
  }

  @Patch('support/threads/:id')
  @RequirePermissions('support.reply')
  updateThread(
    @Param('id') id: string,
    @Body() body: { status?: string; assigneeAdminId?: string; priority?: string },
  ) {
    return this.support.updateThread(id, body);
  }
}
