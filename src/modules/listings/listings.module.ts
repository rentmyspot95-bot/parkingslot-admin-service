import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import {
  UpstreamListing,
  UpstreamUser,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';
import { InternalServiceClient } from '../../common/http/internal-service.client';

@Module({
  imports: [TypeOrmModule.forFeature([UpstreamListing, UpstreamUser], UPSTREAM_CONNECTION)],
  controllers: [ListingsController],
  providers: [ListingsService, InternalServiceClient],
})
export class ListingsModule {}
