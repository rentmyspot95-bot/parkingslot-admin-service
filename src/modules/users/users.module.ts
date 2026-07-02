import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import {
  UpstreamBooking,
  UpstreamUser,
  UpstreamWalletTransaction,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [UpstreamUser, UpstreamBooking, UpstreamWalletTransaction],
      UPSTREAM_CONNECTION,
    ),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
