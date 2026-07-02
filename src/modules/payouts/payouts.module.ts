import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import {
  UpstreamPayout,
  UpstreamUser,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

@Module({
  imports: [TypeOrmModule.forFeature([UpstreamPayout, UpstreamUser], UPSTREAM_CONNECTION)],
  controllers: [PayoutsController],
  providers: [PayoutsService],
})
export class PayoutsModule {}
