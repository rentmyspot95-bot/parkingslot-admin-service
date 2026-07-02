import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source';
import { upstreamDataSourceOptions } from './upstream/upstream.datasource';

@Module({
  imports: [
    // Admin-owned database (auth, admins, config, audit).
    TypeOrmModule.forRootAsync({
      useFactory: () => dataSourceOptions,
    }),
    // Read-only connection to the shared domain database (`parkslot`) for
    // marketplace/finance data.
    TypeOrmModule.forRootAsync({
      name: 'upstream',
      useFactory: () => upstreamDataSourceOptions(),
    }),
  ],
})
export class DatabaseModule {}
