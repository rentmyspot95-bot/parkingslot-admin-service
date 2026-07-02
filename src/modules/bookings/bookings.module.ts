import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import {
  UpstreamBooking,
  UpstreamUser,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

@Module({
  imports: [TypeOrmModule.forFeature([UpstreamBooking, UpstreamUser], UPSTREAM_CONNECTION)],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
