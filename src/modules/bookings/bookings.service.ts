import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { paginate } from '../../common/util/paginate';
import { toPaise } from '../../common/util/money';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotFoundDomainException } from '../../common/errors/domain.exception';
import {
  UpstreamBooking,
  UpstreamUser,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

interface Booking {
  id: string;
  listingId: string;
  listingTitle: string;
  seekerId: string;
  seekerName: string;
  hostId: string;
  hostName: string;
  slot: { start: string; end: string };
  vehicleType: string;
  bayId?: string;
  amount: number;
  currency: string;
  commission: number;
  netToHost: number;
  status: string;
  bookingMode: string;
  responseDeadline?: string;
  ownerRejectReason?: string | null;
  autoRejected: boolean;
  paymentId: string;
  createdAt: string;
}

interface OwnerApprovalStats {
  hostId: string;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  autoRejectedCount: number;
  avgResponseMinutes: number;
  rejectionRate: number;
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(UpstreamBooking, UPSTREAM_CONNECTION)
    private readonly bookings: Repository<UpstreamBooking>,
    @InjectRepository(UpstreamUser, UPSTREAM_CONNECTION)
    private readonly users: Repository<UpstreamUser>,
  ) {}

  private toBooking(b: UpstreamBooking, names: Map<string, string>): Booking {
    const deadline = b.owner_response_deadline ?? b.auto_reject_at;
    return {
      id: b.id,
      listingId: b.listing_id,
      listingTitle: b.listing_title ?? '',
      seekerId: b.seeker_id,
      seekerName: names.get(b.seeker_id) ?? b.seeker_id,
      hostId: b.owner_id,
      hostName: names.get(b.owner_id) ?? b.owner_id,
      slot: { start: b.start_time.toISOString(), end: b.end_time.toISOString() },
      vehicleType: b.vehicle_type ?? '',
      bayId: b.slot_number ?? undefined,
      amount: toPaise(b.total_amount),
      currency: 'INR',
      commission: toPaise(b.service_fee),
      netToHost: toPaise(b.base_amount),
      status: b.status,
      bookingMode: b.is_instant ? 'instant_book' : 'request_to_book',
      responseDeadline: deadline ? deadline.toISOString() : undefined,
      ownerRejectReason: b.status === 'rejected' ? b.cancel_reason : null,
      autoRejected: b.status === 'expired',
      paymentId: b.payment_id ?? '',
      createdAt: b.created_at.toISOString(),
    };
  }

  private async nameMap(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map();
    const rows = await this.users.find({ where: { id: In(unique) } });
    return new Map(rows.map((u) => [u.id, u.name]));
  }

  async list(query: PaginationQueryDto, bookingMode?: string) {
    const raw = await this.bookings.find({ order: { created_at: 'DESC' } });
    const names = await this.nameMap(raw.flatMap((b) => [b.seeker_id, b.owner_id]));
    const rows = raw.map((b) => this.toBooking(b, names));
    return paginate(rows as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['id', 'listingTitle', 'seekerName', 'hostName'],
      filters: { bookingMode },
    });
  }

  async getOne(id: string): Promise<Booking> {
    const booking = await this.bookings.findOne({ where: { id } });
    if (!booking) throw new NotFoundDomainException('Booking not found');
    const names = await this.nameMap([booking.seeker_id, booking.owner_id]);
    return this.toBooking(booking, names);
  }

  async cancel(id: string, _body: { reason: string; refund?: boolean }): Promise<{ ok: true }> {
    await this.getOne(id);
    return { ok: true };
  }

  async ownerDecision(
    id: string,
    _body: { decision: string; reason?: string; onBehalfOfOwner: boolean },
  ): Promise<{ ok: true }> {
    await this.getOne(id);
    return { ok: true };
  }

  async extendDeadline(id: string, _body: { minutes: number }): Promise<{ ok: true }> {
    await this.getOne(id);
    return { ok: true };
  }

  async resolveDispute(id: string, _body: { reason: string }): Promise<{ ok: true }> {
    await this.getOne(id);
    return { ok: true };
  }

  async ownerApprovalStats(hostId: string): Promise<OwnerApprovalStats> {
    const rows = await this.bookings.find({ where: { owner_id: hostId } });
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
      hostId,
      pendingCount,
      approvedCount,
      rejectedCount,
      autoRejectedCount,
      avgResponseMinutes: 0,
      rejectionRate,
    };
  }
}
