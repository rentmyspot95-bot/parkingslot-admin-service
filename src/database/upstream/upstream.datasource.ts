import { DataSourceOptions } from 'typeorm';
import { UPSTREAM_CONNECTION, upstreamEntities } from './upstream.entities';

/**
 * Read-only connection to the shared domain database (`parkslot`).
 *
 * Reuses the admin DB host/credentials by default but points at a different
 * database (`UPSTREAM_DB_NAME`, default `parkslot`), or an explicit
 * `UPSTREAM_DATABASE_URL` when the domain DB lives elsewhere. `synchronize` and
 * migrations are disabled — the domain services own this schema.
 */
export function upstreamDataSourceOptions(): DataSourceOptions {
  const url = process.env.UPSTREAM_DATABASE_URL;
  const sslEnabled = process.env.DB_SSL === 'true';

  return {
    name: UPSTREAM_CONNECTION,
    type: 'postgres',
    ...(url
      ? { url }
      : {
          host: process.env.DB_HOST ?? 'localhost',
          port: Number(process.env.DB_PORT ?? 5432),
          username: process.env.DB_USERNAME ?? 'postgres',
          password: process.env.DB_PASSWORD ?? 'postgres',
          database: process.env.UPSTREAM_DB_NAME ?? 'parkslot',
        }),
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    entities: upstreamEntities,
    synchronize: false,
    migrationsRun: false,
    logging: process.env.TYPEORM_LOGGING === 'true',
  };
}
