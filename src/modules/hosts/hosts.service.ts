import { Injectable } from '@nestjs/common';
import { paginate } from '../../common/util/paginate';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotFoundDomainException } from '../../common/errors/domain.exception';

/** Local ISO-date helper (mirrors the console mock's daysAgo). */
const daysAgo = (d: number): string => new Date(Date.now() - d * 86_400_000).toISOString();

interface KycDoc {
  type: string;
  url: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

interface PayoutAccount {
  upi?: string | null;
  bank?: { accountNumber: string; ifsc: string; name: string } | null;
}

interface Host {
  id: string;
  userId: string;
  displayName: string;
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycDocs: KycDoc[];
  payoutAccount?: PayoutAccount | null;
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
  // Seed copied verbatim from the admin console mock (src/shared/mock/data.ts).
  private readonly hosts: Host[] = [
    {
      id: 'hst_1',
      userId: 'usr_1',
      displayName: 'Rahul (MG Road Garage)',
      kycStatus: 'verified',
      kycDocs: [
        {
          type: 'aadhaar',
          url: 'https://placehold.co/600x400?text=Aadhaar',
          reviewedBy: 'adm_1',
          reviewedAt: daysAgo(100),
        },
        {
          type: 'property_proof',
          url: 'https://placehold.co/600x400?text=Property+Proof',
          reviewedBy: 'adm_1',
          reviewedAt: daysAgo(100),
        },
      ],
      payoutAccount: { upi: 'rahul@upi' },
      listingCount: 2,
      rating: 4.6,
      totalEarnings: 1240000,
      status: 'active',
      createdAt: daysAgo(110),
    },
    {
      id: 'hst_2',
      userId: 'usr_4',
      displayName: 'Sneha (Indiranagar)',
      kycStatus: 'pending',
      kycDocs: [
        { type: 'aadhaar', url: 'https://placehold.co/600x400?text=Aadhaar' },
        { type: 'selfie', url: 'https://placehold.co/600x400?text=Selfie' },
      ],
      payoutAccount: {
        bank: { accountNumber: '00112233445', ifsc: 'HDFC0001234', name: 'Sneha Reddy' },
      },
      listingCount: 1,
      rating: null,
      totalEarnings: 0,
      status: 'active',
      createdAt: daysAgo(12),
    },
  ];

  list(query: PaginationQueryDto, kycStatus?: string) {
    return paginate(this.hosts as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['displayName'],
      filters: { kycStatus },
    });
  }

  getOne(id: string): Host {
    const host = this.hosts.find((h) => h.id === id);
    if (!host) throw new NotFoundDomainException('Host not found');
    return host;
  }

  decideKyc(id: string, _body: { decision: string; reason?: string }): { ok: true } {
    this.getOne(id);
    return { ok: true };
  }

  updateStatus(id: string, _body: { status: string; reason: string }): { ok: true } {
    this.getOne(id);
    return { ok: true };
  }

  flag(id: string, _body: { reason: string }): { ok: true } {
    this.getOne(id);
    return { ok: true };
  }

  approvalStats(id: string): OwnerApprovalStats {
    this.getOne(id);
    return {
      hostId: id,
      pendingCount: 1,
      approvedCount: 4,
      rejectedCount: 1,
      autoRejectedCount: 2,
      avgResponseMinutes: 34,
      rejectionRate: 12.5,
    };
  }
}
