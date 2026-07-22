import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { paginate } from '../../common/util/paginate';
import { toPaise } from '../../common/util/money';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  BadRequestDomainException,
  NotFoundDomainException,
} from '../../common/errors/domain.exception';
import { InternalServiceClient } from '../../common/http/internal-service.client';
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
    private readonly internal: InternalServiceClient,
  ) {}

  private readonly logger = new Logger(HostsService.name);

  /**
   * Map kyc-service's record status onto the console's four-value contract.
   *
   * Absent (no KYC record, or kyc-service unreachable) deliberately resolves to
   * 'unverified' — never 'verified'. Showing an unverified owner as verified is
   * the failure mode that let unreviewed listings through, so the default must
   * be the cautious one.
   */
  private static mapKycStatus(status?: string): Host['kycStatus'] {
    switch (status) {
      case 'approved':
        return 'verified';
      case 'rejected':
        return 'rejected';
      case 'in_progress':
      case 'pending_review':
        return 'pending';
      default:
        return 'unverified';
    }
  }

  private toHost(
    u: UpstreamUser,
    earningsPaise: number,
    kycStatus?: string,
  ): Host {
    return {
      id: u.id,
      userId: u.id,
      displayName: u.name,
      // Sourced from kyc-service, which owns the record. Was `u.isVerified`,
      // which auth-service hardcodes true at registration and kyc-service never
      // writes to (its approval updates the separate kyc_users projection) — so
      // this column reported EVERY owner as verified, including owners with no
      // KYC at all.
      kycStatus: HostsService.mapKycStatus(kycStatus),
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

  /**
   * Real KYC statuses from kyc-service, keyed by owner id.
   *
   * Fail-soft: a kyc-service outage must not blank the whole host list, which
   * is also the finance and support view. Unresolved owners fall through to
   * 'unverified' in `mapKycStatus` — cautious, never a false 'verified'.
   *
   * Chunked because the batch endpoint caps each request at 200 ids.
   */
  private async kycStatusMap(ownerIds: string[]): Promise<Map<string, string>> {
    const ids = [...new Set(ownerIds)];
    const map = new Map<string, string>();
    if (!ids.length) return map;

    const CHUNK = 200;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      try {
        const result = await this.internal.request<Record<string, string>>({
          baseUrlKey: 'KYC_SERVICE_BASE_URL',
          path: '/api/v1/internal/owners/kyc-statuses',
          method: 'POST',
          body: { owner_ids: chunk },
        });
        for (const [ownerId, status] of Object.entries(result ?? {})) {
          map.set(ownerId, status);
        }
      } catch (error) {
        this.logger.warn(
          `KYC status lookup failed for ${chunk.length} owners — they will ` +
            `display as unverified: ${(error as Error).message}`,
        );
      }
    }

    return map;
  }

  async list(query: PaginationQueryDto, kycStatus?: string) {
    const raw = await this.users.find({
      where: { role: In(['owner', 'both']) },
      order: { createdAt: 'DESC' },
    });
    const earnings = await this.earningsMap(raw.map((u) => u.id));
    const kyc = await this.kycStatusMap(raw.map((u) => u.id));
    const rows = raw.map((u) =>
      this.toHost(u, earnings.get(u.id) ?? 0, kyc.get(u.id)),
    );
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
    const kyc = await this.kycStatusMap([id]);
    return this.toHost(user, earnings.get(id) ?? 0, kyc.get(id));
  }

  /**
   * Approve or reject an owner's KYC.
   *
   * Was a stub that discarded the body and returned `{ ok: true }`, so the
   * console reported success while the KYC record was untouched. The decision
   * now goes to kyc-service, which owns the record, flips `users.is_verified`,
   * recomputes the trust score, and emits the approval events.
   */
  async decideKyc(
    id: string,
    body: { decision: string; reason?: string },
  ): Promise<{ ok: true; status: string }> {
    const decision = body.decision === 'approved' || body.decision === 'approve'
      ? 'approved'
      : 'rejected';

    if (decision === 'rejected' && !body.reason?.trim()) {
      throw new BadRequestDomainException(
        'A reason is required when rejecting KYC — it tells the owner what to redo.',
      );
    }

    const result = await this.internal.request<{ status: string }>({
      baseUrlKey: 'KYC_SERVICE_BASE_URL',
      path: `/api/v1/internal/owners/${id}/kyc-decision`,
      method: 'POST',
      body: { decision, reason: body.reason },
    });

    return { ok: true, status: result.status };
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
