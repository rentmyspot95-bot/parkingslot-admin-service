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
  UpstreamWalletTransaction,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

interface UserDto {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  status: string;
  vehicles: unknown[];
  walletCreditBalance: number;
  createdAt: string;
  lastActiveAt: string;
  bookingCount: number;
  flagged: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UpstreamUser, UPSTREAM_CONNECTION)
    private readonly users: Repository<UpstreamUser>,
    @InjectRepository(UpstreamBooking, UPSTREAM_CONNECTION)
    private readonly bookings: Repository<UpstreamBooking>,
    @InjectRepository(UpstreamWalletTransaction, UPSTREAM_CONNECTION)
    private readonly wallet: Repository<UpstreamWalletTransaction>,
  ) {}

  private toUser(u: UpstreamUser): UserDto {
    return {
      id: u.id,
      phone: u.phone,
      name: u.name,
      email: u.email,
      status: u.isActive ? 'active' : 'suspended',
      // Vehicles live in a separate table not read by this BFF.
      vehicles: [],
      walletCreditBalance: toPaise(u.walletBalance),
      createdAt: u.createdAt.toISOString(),
      lastActiveAt: u.updatedAt.toISOString(),
      bookingCount: u.totalBookings,
      flagged: false,
    };
  }

  async list(query: PaginationQueryDto) {
    const rows = (await this.users.find({ order: { createdAt: 'DESC' } })).map((u) =>
      this.toUser(u),
    );
    return paginate(rows as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['name', 'phone', 'email'],
    });
  }

  async get(id: string): Promise<UserDto> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundDomainException('User not found');
    return this.toUser(user);
  }

  async listBookings(id: string, query: PaginationQueryDto) {
    const raw = await this.bookings.find({
      where: { seeker_id: id },
      order: { created_at: 'DESC' },
    });
    const ownerIds = [...new Set(raw.map((b) => b.owner_id))];
    const owners = ownerIds.length
      ? await this.users.find({ where: { id: In(ownerIds) } })
      : [];
    const names = new Map(owners.map((u) => [u.id, u.name]));
    const rows = raw.map((b) => ({
      id: b.id,
      listingId: b.listing_id,
      listingTitle: b.listing_title ?? '',
      hostId: b.owner_id,
      hostName: names.get(b.owner_id) ?? b.owner_id,
      slot: { start: b.start_time.toISOString(), end: b.end_time.toISOString() },
      amount: toPaise(b.total_amount),
      currency: 'INR',
      status: b.status,
      createdAt: b.created_at.toISOString(),
    }));
    return paginate(rows as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: Math.min(query.limit ?? 25, 50),
      q: query.q,
      status: query.status,
      sort: query.sort,
    });
  }

  async listWallet(id: string, query: PaginationQueryDto) {
    const raw = await this.wallet.find({
      where: { userId: id },
      order: { createdAt: 'DESC' },
    });
    const rows = raw.map((t) => ({
      id: t.id,
      userId: t.userId,
      type: t.type,
      amount: toPaise(t.amount),
      reason: t.description,
      relatedBookingId: t.referenceId,
      issuedBy: '',
      balanceAfter: toPaise(t.balanceAfter),
      createdAt: t.createdAt.toISOString(),
    }));
    return paginate(rows as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
    });
  }

  async walletAdjust(id: string, body: { type: string; amount: number; reason: string }) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundDomainException('User not found');
    const amount = Number(body?.amount ?? 0);
    const delta = body?.type === 'debit' ? -amount : amount;
    // Read-only against the domain DB: report the projected balance only.
    const balanceAfter = toPaise(user.walletBalance) + delta;
    return { ok: true as const, balanceAfter };
  }

  async updateStatus(id: string, body: { status: string; reason?: string }) {
    const user = await this.get(id);
    return { ...user, status: body?.status };
  }
}
