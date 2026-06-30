import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitAdminTables1730000000000 implements MigrationInterface {
  name = 'InitAdminTables1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "admin_roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "permissions" text NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_admin_roles_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "admin_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "name" character varying(255) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'active',
        "password_hash" character varying(255) NOT NULL,
        "totp_secret" character varying(255),
        "totp_enabled" boolean NOT NULL DEFAULT false,
        "role_names" text NOT NULL DEFAULT '',
        "last_login_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_admin_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actor_admin_id" uuid,
        "actor_name" character varying(255),
        "action" character varying(100) NOT NULL,
        "target_type" character varying(50) NOT NULL,
        "target_id" character varying(100),
        "reason" text,
        "metadata" jsonb,
        "ip" character varying(64),
        "request_id" character varying(64),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_audit_actor" ON "audit_logs" ("actor_admin_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_action" ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_target_type" ON "audit_logs" ("target_type")`);

    await queryRunner.query(`
      CREATE TABLE "platform_config" (
        "key" character varying(100) NOT NULL,
        "value" jsonb NOT NULL,
        "updated_by" character varying(255),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_config" PRIMARY KEY ("key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "feature_flags" (
        "key" character varying(100) NOT NULL,
        "enabled" boolean NOT NULL DEFAULT false,
        "description" text,
        "updated_by" character varying(255),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_feature_flags" PRIMARY KEY ("key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "feature_flags"`);
    await queryRunner.query(`DROP TABLE "platform_config"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_target_type"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_action"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_actor"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "admin_users"`);
    await queryRunner.query(`DROP TABLE "admin_roles"`);
  }
}
