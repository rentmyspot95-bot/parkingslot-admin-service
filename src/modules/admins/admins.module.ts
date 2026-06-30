import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUser } from '../../auth/entities/admin-user.entity';
import { AdminRole } from '../../auth/entities/admin-role.entity';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser, AdminRole])],
  controllers: [AdminsController],
  providers: [AdminsService],
})
export class AdminsModule {}
