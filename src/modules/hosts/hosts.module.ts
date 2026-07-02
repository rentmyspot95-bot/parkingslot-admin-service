import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HostsService } from './hosts.service';
import { HostsController } from './hosts.controller';
import {
  UpstreamBooking,
  UpstreamPayout,
  UpstreamUser,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([UpstreamUser, UpstreamPayout, UpstreamBooking], UPSTREAM_CONNECTION),
  ],
  controllers: [HostsController],
  providers: [HostsService],
})
export class HostsModule {}
