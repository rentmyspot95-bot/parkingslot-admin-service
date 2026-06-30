import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('admin')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get('bookings')
  @RequirePermissions('booking.read')
  list(@Query() query: PaginationQueryDto, @Query('bookingMode') bookingMode?: string) {
    return this.bookings.list(query, bookingMode);
  }

  @Get('bookings/:id')
  @RequirePermissions('booking.read')
  getOne(@Param('id') id: string) {
    return this.bookings.getOne(id);
  }

  @Post('bookings/:id/cancel')
  @RequirePermissions('booking.cancel')
  cancel(@Param('id') id: string, @Body() body: { reason: string; refund?: boolean }) {
    return this.bookings.cancel(id, body);
  }

  @Post('bookings/:id/owner-decision')
  @RequirePermissions('booking.override')
  ownerDecision(
    @Param('id') id: string,
    @Body() body: { decision: string; reason?: string; onBehalfOfOwner: boolean },
  ) {
    return this.bookings.ownerDecision(id, body);
  }

  @Post('bookings/:id/extend-deadline')
  @RequirePermissions('booking.override')
  extendDeadline(@Param('id') id: string, @Body() body: { minutes: number }) {
    return this.bookings.extendDeadline(id, body);
  }

  @Post('bookings/:id/resolve-dispute')
  @RequirePermissions('booking.cancel')
  resolveDispute(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.bookings.resolveDispute(id, body);
  }

  @Get('owners/:hostId/approval-stats')
  @RequirePermissions('booking.read')
  ownerApprovalStats(@Param('hostId') hostId: string) {
    return this.bookings.ownerApprovalStats(hostId);
  }
}
