import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { paginate } from '../../common/util/paginate';
import { toPaise } from '../../common/util/money';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotFoundDomainException } from '../../common/errors/domain.exception';
import {
  UpstreamPayout,
  UpstreamUser,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

interface Payout {
  id: string;
  hostId: string;
  hostName: string;
  period: { from: string; to: string };
  grossEarnings: number;
  commission: number;
  netPayable: number;
  status: string;
  method: string;
  reference: string | null;
  triggeredBy?: string;
  createdAt: string;
  paidAt: string | null;
}

/** Real payout lifecycle → console status vocabulary. */
const STATUS_MAP: Record<string, string> = {
  completed: 'paid',
  processing: 'processing',
  failed: 'failed',
  reversed: 'reversed',
};

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(UpstreamPayout, UPSTREAM_CONNECTION)
    private readonly payouts: Repository<UpstreamPayout>,
    @InjectRepository(UpstreamUser, UPSTREAM_CONNECTION)
    private readonly users: Repository<UpstreamUser>,
  ) {}

  private toPayout(p: UpstreamPayout, name: string): Payout {
    // The payout row tracks the net transfer only; gross/commission live in the
    // payout-service earnings ledger, so gross==net and commission==0 here.
    const net = toPaise(p.amount);
    return {
      id: p.id,
      hostId: p.ownerId,
      hostName: name,
      period: {
        from: p.initiatedAt.toISOString(),
        to: (p.completedAt ?? p.initiatedAt).toISOString(),
      },
      grossEarnings: net,
      commission: 0,
      netPayable: net,
      status: STATUS_MAP[p.status] ?? p.status,
      method: 'Bank',
      reference: p.utr ?? p.transactionRef ?? null,
      createdAt: p.initiatedAt.toISOString(),
      paidAt: p.completedAt ? p.completedAt.toISOString() : null,
    };
  }

  private async nameMap(ownerIds: string[]): Promise<Map<string, string>> {
    const ids = [...new Set(ownerIds)];
    if (!ids.length) return new Map();
    const rows = await this.users.find({ where: { id: In(ids) } });
    return new Map(rows.map((u) => [u.id, u.name]));
  }

  async listPayouts(query: PaginationQueryDto) {
    const raw = await this.payouts.find({ order: { initiatedAt: 'DESC' } });
    const names = await this.nameMap(raw.map((p) => p.ownerId));
    const rows = raw.map((p) => this.toPayout(p, names.get(p.ownerId) ?? p.ownerId));
    return paginate(rows as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['id', 'hostId', 'hostName'],
    });
  }

  async getPayout(id: string) {
    const payout = await this.payouts.findOne({ where: { id } });
    if (!payout) throw new NotFoundDomainException('Payout not found');
    const names = await this.nameMap([payout.ownerId]);
    return {
      ...this.toPayout(payout, names.get(payout.ownerId) ?? payout.ownerId),
      // Per-booking settlement breakdown lives in payout_allocations (not read here).
      bookings: [] as Array<{ id: string; amount: number; netToHost: number }>,
    };
  }

  run(body: { from: string; to: string }) {
    void body;
    return { ok: true, created: 0 };
  }

  trigger(id: string) {
    void id;
    return { ok: true };
  }

  hold(id: string, body: { hold: boolean; reason: string }) {
    void id;
    void body;
    return { ok: true };
  }
}
