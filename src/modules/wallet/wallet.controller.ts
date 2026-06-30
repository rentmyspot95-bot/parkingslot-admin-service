import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';

/**
 * Platform-wide wallet operations. Per-user wallet routes live in the users
 * module (admin/users/:id/wallet*) — do NOT duplicate them here.
 */
@ApiTags('wallet')
@ApiBearerAuth()
@Controller('admin')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Post('wallet/bulk-credit')
  @RequirePermissions('wallet.adjust')
  bulkCredit(@Body() body: { audience: unknown; amount: number; reason: string }) {
    return this.wallet.bulkCredit(body);
  }
}
