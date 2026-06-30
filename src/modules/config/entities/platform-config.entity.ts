import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Key/value store for platform config. The whole config object lives under key 'platform'. */
@Entity({ name: 'platform_config' })
export class PlatformConfigRow {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key!: string;

  @Column({ type: 'jsonb' })
  value!: Record<string, unknown>;

  @Column({ name: 'updated_by', type: 'varchar', length: 255, nullable: true })
  updatedBy!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
