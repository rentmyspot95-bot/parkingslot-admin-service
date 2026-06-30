import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AdminUser } from '../auth/entities/admin-user.entity';
import { AdminRole } from '../auth/entities/admin-role.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { PlatformConfigRow } from '../modules/config/entities/platform-config.entity';
import { FeatureFlagRow } from '../modules/config/entities/feature-flag.entity';

export const entities = [AdminUser, AdminRole, AuditLog, PlatformConfigRow, FeatureFlagRow];

const migrations = [__dirname + '/migrations/*{.ts,.js}'];
const databaseUrl = process.env.DATABASE_URL;
const sslEnabled = process.env.DB_SSL === 'true';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  ...(databaseUrl
    ? { url: databaseUrl }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        username: process.env.DB_USERNAME ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_NAME ?? 'parkingslot_admin_service',
      }),
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  entities,
  migrations,
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
};

export const AppDataSource = new DataSource(dataSourceOptions);
