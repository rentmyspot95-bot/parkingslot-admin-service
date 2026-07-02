import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import {
  UpstreamListing,
  UpstreamReview,
  UpstreamUser,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([UpstreamReview, UpstreamUser, UpstreamListing], UPSTREAM_CONNECTION),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
