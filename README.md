# ParkingSlot Admin Service

The admin-scoped API (`/api/v1/admin/**`) behind the **operations console**. A NestJS
**BFF/aggregator** that owns admin identity, RBAC, and audit, and (as modules are
wired) reuses the existing domain microservices for marketplace data.

> Companion to `parkingslot-admin-console` (the React SPA). It implements the
> contract that console expects.

## What it provides

- **Admin auth** — email + password + optional TOTP → short-lived access JWT +
  httpOnly refresh cookie (`/admin/auth/login`, `/refresh`, `/logout`, `/admin/me`).
- **RBAC** — every route guarded by a permission (`@RequirePermissions`), enforced
  by a global guard. The console only mirrors this map; the server is the boundary.
- **Audit-first** — a global interceptor writes an `audit_logs` row for every
  successful mutation (actor, action, target, reason, requestId).
- **Owns** (in its own Postgres DB): `admin_users`, `admin_roles`, `audit_logs`,
  `platform_config`, `feature_flags`.
- **Domain modules** (users, hosts, listings, bookings, payments, payouts, wallet,
  reviews, support, notifications, dashboard) currently return **typed in-memory
  stub data** matching the console DTOs. Each is wired to its real domain service
  incrementally (see "Wiring" below).

## Architecture

```
admin console (SPA)  ──HTTPS, Bearer──▶  parkingslot-admin-service  ──HTTP──▶  domain services
                                          (auth · RBAC · audit · BFF)          (user, booking, payment, …)
                                          owns: admin DB (Postgres)
```

The nginx gateway routes `/api/v1/admin → parkingslot-admin-service`.

## Conventions (shared with the other services)

- NestJS 11 + TypeORM 0.3 + Postgres, `@nestjs/swagger` at `/api/docs`.
- Global prefix `api` + URI versioning → `/api/v1/...`; health at `/health`.
- Success envelope `{ data }` / `{ data, page, limit, total }`; error envelope
  `{ error: { code, message, requestId } }` (matches the console's API client).
- Money is integer **paise**; timestamps ISO-8601.

## Local development

```bash
cp .env.example .env          # set DB + secrets
npm install
createdb parkingslot_admin_service   # or point DATABASE_URL at a Postgres
npm run migration:run         # create admin tables
npm run seed                  # default roles + super admin (admin@parkingslot.com / admin)
npm run start:dev             # http://localhost:3010  (health: /health, docs: /api/docs)
```

Point the console at it: in `parkingslot-admin-console/.env` set
`VITE_USE_MOCK=false` and `VITE_API_PROXY_TARGET=http://localhost:3010`.

## Deploy (Railway)

Nixpacks (`railway.json`), same pattern as the other services. The start command
runs migrations + seed, then boots:
`npm run migration:run:prod && npm run seed:prod && npm start`.

Set service variables: `DATABASE_URL` (Railway Postgres plugin), `ADMIN_JWT_SECRET`,
`ADMIN_REFRESH_SECRET`, `ADMIN_COOKIE_SECURE=true`, `ADMIN_CONSOLE_ORIGIN=<console URL>`,
and `ADMIN_SEED_*` for the first admin.

## Wiring a module to its real service

Each stub `*.service.ts` is the seam. Replace its in-memory arrays with HTTP calls
to the domain service (base URLs in `.env`, e.g. `USER_SERVICE_BASE_URL`), mapping
the service's snake_case payload into the camelCase DTO the controller already
returns. Auth/RBAC/audit and the controller surface stay unchanged.
