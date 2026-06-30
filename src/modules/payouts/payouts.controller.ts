import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('payouts')
@ApiBearerAuth()
@Controller('admin')
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get('payouts')
  @RequirePermissions('payout.read')
  listPayouts(@Query() query: PaginationQueryDto) {
    return this.payouts.listPayouts(query);
  }

  @Post('payouts/run')
  @RequirePermissions('payout.trigger')
  run(@Body() body: { from: string; to: string }) {
    return this.payouts.run(body);
  }

  @Get('payouts/:id')
  @RequirePermissions('payout.read')
  getPayout(@Param('id') id: string) {
    return this.payouts.getPayout(id);
  }

  @Post('payouts/:id/trigger')
  @RequirePermissions('payout.trigger')
  trigger(@Param('id') id: string) {
    return this.payouts.trigger(id);
  }

  @Post('payouts/:id/hold')
  @RequirePermissions('payout.hold')
  hold(@Param('id') id: string, @Body() body: { hold: boolean; reason: string }) {
    return this.payouts.hold(id, body);
  }
}
