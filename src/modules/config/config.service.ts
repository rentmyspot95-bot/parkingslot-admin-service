import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformConfigRow } from './entities/platform-config.entity';
import { FeatureFlagRow } from './entities/feature-flag.entity';

const CONFIG_KEY = 'platform';

const DEFAULT_CONFIG: Record<string, unknown> = {
  commissionRatePct: 20,
  ownerResponseWindowMinutes: 60,
  cancellationWindowHours: 2,
  refundPolicy:
    'Full refund if cancelled >2h before slot; 50% within 2h; none after start.',
  minPricePerHour: 1000,
  maxPricePerHour: 20000,
  supportedCities: ['Bengaluru', 'Hyderabad', 'Pune'],
  defaultBookingMode: 'instant_book',
};

const DEFAULT_FLAGS: { key: string; enabled: boolean; description: string }[] = [
  { key: 'instant_book_rollout', enabled: true, description: 'Enable instant-book listings' },
  { key: 'default_request_to_book', enabled: false, description: 'New listings default to request-to-book' },
  { key: 'new_payment_methods', enabled: false, description: 'Show UPI Autopay at checkout' },
];

@Injectable()
export class ConfigManagementService {
  constructor(
    @InjectRepository(PlatformConfigRow) private readonly configRepo: Repository<PlatformConfigRow>,
    @InjectRepository(FeatureFlagRow) private readonly flagRepo: Repository<FeatureFlagRow>,
  ) {}

  async getConfig(): Promise<Record<string, unknown>> {
    const row = await this.configRepo.findOne({ where: { key: CONFIG_KEY } });
    return { ...DEFAULT_CONFIG, ...(row?.value ?? {}) };
  }

  async updateConfig(
    patch: Record<string, unknown>,
    updatedBy: string,
  ): Promise<Record<string, unknown>> {
    const current = await this.getConfig();
    const merged = { ...current, ...patch };
    await this.configRepo.save({ key: CONFIG_KEY, value: merged, updatedBy });
    return merged;
  }

  async listFlags(): Promise<FeatureFlagRow[]> {
    const rows = await this.flagRepo.find();
    if (rows.length > 0) return rows;
    // Surface defaults even before they've been persisted.
    return DEFAULT_FLAGS.map((f) => ({
      key: f.key,
      enabled: f.enabled,
      description: f.description,
      updatedBy: null,
      updatedAt: new Date(),
    })) as FeatureFlagRow[];
  }

  async toggleFlag(key: string, enabled: boolean, updatedBy: string): Promise<FeatureFlagRow> {
    const existing = await this.flagRepo.findOne({ where: { key } });
    const description =
      existing?.description ?? DEFAULT_FLAGS.find((f) => f.key === key)?.description ?? null;
    const saved = await this.flagRepo.save({ key, enabled, description, updatedBy });
    return saved;
  }
}
