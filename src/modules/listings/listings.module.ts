import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import {
  UpstreamListing,
  UpstreamUser,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

@Module({
  imports: [TypeOrmModule.forFeature([UpstreamListing, UpstreamUser], UPSTREAM_CONNECTION)],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule {}
