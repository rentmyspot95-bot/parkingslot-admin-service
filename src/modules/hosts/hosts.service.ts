import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { paginate } from '../../common/util/paginate';
import { toPaise } from '../../common/util/money';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotFoundDomainException } from '../../common/errors/domain.exception';
import {
  UpstreamBooking,
  UpstreamPayout,
  UpstreamUser,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

interface Host {
  id: string;
  userId: string;
  displayName: string;
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycDocs: unknown[];
  payoutAccount?: unknown | null;
  listingCount: number;
  rating?: number | null;
  totalEarnings: number;
  status: 'active' | 'suspended';
  createdAt: string;
}

interface OwnerApprovalStats {
  hostId: string;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  autoRejectedCount: number;
  avgResponseMinutes?: number | null;
  rejectionRate: number;
}

@Injectable()
export class HostsService {
  constructor(
    @InjectRepository(UpstreamUser, UPSTREAM_CONNECTION)
    private readonly users: Repository<UpstreamUser>,
    @InjectRepository(UpstreamPayout, UPSTREAM_CONNECTION)
    private readonly payouts: Repository<UpstreamPayout>,
    @InjectRepository(UpstreamBooking, UPSTREAM_CONNECTION)
    private readonly bookings: Repository<UpstreamBooking>,
  ) {}

  private toHost(u: UpstreamUser, earningsPaise: number): Host {
    return {
      id: u.id,
      userId: u.id,
      displayName: u.name,
      // Full KYC document/status detail lives in the kyc-service database, which
      // is not part of this read connection; verified flag is the best proxy.
      kycStatus: u.isVerified ? 'verified' : 'pending',
      kycDocs: [],
      payoutAccount: null,
      listingCount: u.totalListings,
      rating: u.avgRating,
      totalEarnings: earningsPaise,
      status: u.isActive ? 'active' : 'suspended',
      createdAt: u.createdAt.toISOString(),
    };
  }

  /** Sum of completed payouts per owner, in paise. */
  private async earningsMap(ownerIds: string[]): Promise<Map<string, number>> {
    const ids = [...new Set(ownerIds)];
    const map = new Map<string, number>();
    if (!ids.length) return map;
    const rows = await this.payouts.find({
      where: { ownerId: In(ids), status: 'completed' },
    });
    for (const p of rows) {
      map.set(p.ownerId, (map.get(p.ownerId) ?? 0) + toPaise(p.amount));
    }
    return map;
  }

  async list(query: PaginationQueryDto, kycStatus?: string) {
    const raw = await this.users.find({
      where: { role: In(['owner', 'both']) },
      order: { createdAt: 'DESC' },
    });
    const earnings = await this.earningsMap(raw.map((u) => u.id));
    const rows = raw.map((u) => this.toHost(u, earnings.get(u.id) ?? 0));
    return paginate(rows as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['displayName'],
      filters: { kycStatus },
    });
  }

  async getOne(id: string): Promise<Host> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundDomainException('Host not found');
    const earnings = await this.earningsMap([id]);
    return this.toHost(user, earnings.get(id) ?? 0);
  }

  async decideKyc(id: string, _body: { decision: string; reason?: string }): Promise<{ ok: true }> {
    await this.getOne(id);
    return { ok: true };
  }

  async updateStatus(id: string, _body: { status: string; reason: string }): Promise<{ ok: true }> {
    await this.getOne(id);
    return { ok: true };
  }

  async flag(id: string, _body: { reason: string }): Promise<{ ok: true }> {
    await this.getOne(id);
    return { ok: true };
  }

  async approvalStats(id: string): Promise<OwnerApprovalStats> {
    await this.getOne(id);
    const rows = await this.bookings.find({ where: { owner_id: id } });
    const pendingCount = rows.filter((b) => b.status === 'pending').length;
    const approvedCount = rows.filter((b) =>
      ['confirmed', 'active', 'completed'].includes(b.status),
    ).length;
    const rejectedCount = rows.filter((b) => b.status === 'rejected').length;
    const autoRejectedCount = rows.filter((b) => b.status === 'expired').length;
    const decided = approvedCount + rejectedCount + autoRejectedCount;
    const rejectionRate = decided
      ? Math.round(((rejectedCount + autoRejectedCount) / decided) * 1000) / 10
      : 0;
    return {
      hostId: id,
      pendingCount,
      approvedCount,
      rejectedCount,
      autoRejectedCount,
      avgResponseMinutes: null,
      rejectionRate,
    };
  }
}
