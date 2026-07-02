import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { UpstreamPayment, UPSTREAM_CONNECTION } from '../../database/upstream/upstream.entities';

@Module({
  imports: [TypeOrmModule.forFeature([UpstreamPayment], UPSTREAM_CONNECTION)],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
