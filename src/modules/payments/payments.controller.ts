import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('admin')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('payments')
  @RequirePermissions('payment.read')
  listPayments(@Query() query: PaginationQueryDto) {
    return this.payments.listPayments(query);
  }

  @Get('refunds')
  @RequirePermissions('payment.read')
  listRefunds(@Query() query: PaginationQueryDto) {
    return this.payments.listRefunds(query);
  }

  @Get('payments/:id')
  @RequirePermissions('payment.read')
  getPayment(@Param('id') id: string) {
    return this.payments.getPayment(id);
  }

  @Post('payments/:id/refund')
  @RequirePermissions('payment.refund')
  refund(@Param('id') id: string, @Body() body: { amount: number; reason: string }) {
    return this.payments.refund(id, body);
  }
}
