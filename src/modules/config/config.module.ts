import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformConfigRow } from './entities/platform-config.entity';
import { FeatureFlagRow } from './entities/feature-flag.entity';
import { ConfigManagementService } from './config.service';
import { ConfigController } from './config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformConfigRow, FeatureFlagRow])],
  controllers: [ConfigController],
  providers: [ConfigManagementService],
})
export class ConfigManagementModule {}
