import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('admin')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('users')
  @RequirePermissions('user.read')
  list(@Query() query: PaginationQueryDto) {
    return this.users.list(query);
  }

  @Get('users/:id')
  @RequirePermissions('user.read')
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Get('users/:id/bookings')
  @RequirePermissions('user.read')
  bookings(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.users.listBookings(id, query);
  }

  @Get('users/:id/wallet')
  @RequirePermissions('user.read')
  wallet(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.users.listWallet(id, query);
  }

  @Post('users/:id/wallet-adjust')
  @RequirePermissions('wallet.adjust')
  walletAdjust(
    @Param('id') id: string,
    @Body() body: { type: string; amount: number; reason: string },
  ) {
    return this.users.walletAdjust(id, body);
  }

  @Patch('users/:id/status')
  @RequirePermissions('user.suspend')
  updateStatus(@Param('id') id: string, @Body() body: { status: string; reason?: string }) {
    return this.users.updateStatus(id, body);
  }
}
