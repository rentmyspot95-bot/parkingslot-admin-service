export function validateEnvironment(config: Record<string, unknown>) {
  const nodeEnv = String(config.NODE_ENV ?? 'development').trim() || 'development';
  const databaseUrl = String(config.DATABASE_URL ?? '').trim();
  const dbHost = String(config.DB_HOST ?? '').trim();

  const validated = {
    NODE_ENV: nodeEnv,
    PORT: Number(config.PORT ?? 3010),
    ADMIN_CONSOLE_ORIGIN: String(config.ADMIN_CONSOLE_ORIGIN ?? 'http://localhost:5273').trim(),

    DATABASE_URL: databaseUrl || undefined,
    DB_HOST: dbHost || undefined,
    DB_PORT: Number(config.DB_PORT ?? 5432),
    DB_USERNAME: String(config.DB_USERNAME ?? 'postgres'),
    DB_PASSWORD: String(config.DB_PASSWORD ?? 'postgres'),
    DB_NAME: String(config.DB_NAME ?? 'parkingslot_admin_service'),
    DB_SSL: String(config.DB_SSL ?? 'false'),
    TYPEORM_LOGGING: String(config.TYPEORM_LOGGING ?? 'false'),

    ADMIN_JWT_SECRET: String(config.ADMIN_JWT_SECRET ?? '').trim(),
    ADMIN_JWT_ACCESS_TTL: Number(config.ADMIN_JWT_ACCESS_TTL ?? 900),
    ADMIN_REFRESH_SECRET: String(config.ADMIN_REFRESH_SECRET ?? '').trim(),
    ADMIN_REFRESH_TTL: Number(config.ADMIN_REFRESH_TTL ?? 2592000),
    ADMIN_COOKIE_SECURE: String(config.ADMIN_COOKIE_SECURE ?? 'false'),

    ADMIN_SEED_EMAIL: String(config.ADMIN_SEED_EMAIL ?? 'admin@parkingslot.com').trim(),
    ADMIN_SEED_PASSWORD: String(config.ADMIN_SEED_PASSWORD ?? 'admin'),
    ADMIN_SEED_NAME: String(config.ADMIN_SEED_NAME ?? 'Super Admin'),
  };

  const numeric: (keyof typeof validated)[] = [
    'PORT',
    'DB_PORT',
    'ADMIN_JWT_ACCESS_TTL',
    'ADMIN_REFRESH_TTL',
  ];
  for (const key of numeric) {
    if (Number.isNaN(validated[key])) {
      throw new Error(`Environment variable ${key} must be a number.`);
    }
  }

  if (!validated.DATABASE_URL && !validated.DB_HOST) {
    throw new Error('DATABASE_URL or DB_HOST must be configured.');
  }

  // In production the JWT secrets must be set explicitly; dev gets safe fallbacks.
  if (nodeEnv === 'production') {
    if (!validated.ADMIN_JWT_SECRET || !validated.ADMIN_REFRESH_SECRET) {
      throw new Error('ADMIN_JWT_SECRET and ADMIN_REFRESH_SECRET must be set in production.');
    }
  } else {
    validated.ADMIN_JWT_SECRET ||= 'dev-access-secret';
    validated.ADMIN_REFRESH_SECRET ||= 'dev-refresh-secret';
  }

  return validated;
}
