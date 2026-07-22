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
import { InternalServiceClient } from '../../common/http/internal-service.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([UpstreamUser, UpstreamPayout, UpstreamBooking], UPSTREAM_CONNECTION),
  ],
  controllers: [HostsController],
  providers: [HostsService, InternalServiceClient],
})
export class HostsModule {}
