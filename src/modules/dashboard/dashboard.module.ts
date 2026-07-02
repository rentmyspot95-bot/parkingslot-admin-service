import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import {
  UpstreamBooking,
  UpstreamListing,
  UpstreamPayment,
  UpstreamPayout,
  UpstreamUser,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [UpstreamBooking, UpstreamPayment, UpstreamPayout, UpstreamListing, UpstreamUser],
      UPSTREAM_CONNECTION,
    ),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
