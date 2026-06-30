import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';

// Version-neutral + excluded from the global prefix → reachable at /health
// (matches railway.json healthcheckPath).
@ApiTags('health')
@Controller({ version: VERSION_NEUTRAL })
export class AppController {
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'parkingslot-admin-service' };
  }
}
