import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

/**
 * Dashboard / global-search routes. No @RequirePermissions — any authenticated
 * admin may read these (the global JwtAuthGuard already enforces login).
 */
@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('admin')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('metrics/overview')
  overview() {
    return this.dashboard.overview();
  }

  @Get('metrics/queues')
  queues() {
    return this.dashboard.queues();
  }

  @Get('metrics/timeseries')
  timeseries(@Query('metric') metric?: string, @Query('range') range?: string) {
    return this.dashboard.timeseries(metric ?? 'gmv', range ?? '30d');
  }

  @Get('search')
  search(@Query('q') q?: string) {
    return this.dashboard.search(q ?? '');
  }
}
