import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, MoreThanOrEqual, Repository } from 'typeorm';
import { toPaise } from '../../common/util/money';
import {
  UpstreamBooking,
  UpstreamListing,
  UpstreamPayment,
  UpstreamPayout,
  UpstreamUser,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

const DAY = 86_400_000;
const daysAgoDate = (d: number): Date => new Date(Date.now() - d * DAY);

export interface MetricsQueues {
  pendingKyc: number;
  flaggedReviews: number;
  openSupport: number;
  onHoldPayouts: number;
  pendingOwnerApproval: number;
}

export interface MetricsOverview {
  gmv: number;
  bookingsToday: number;
  bookings7d: number;
  bookings30d: number;
  activeListings: number;
  newHosts7d: number;
  refundRatePct: number;
  payoutBacklog: number;
  queues: MetricsQueues;
}

export interface TimeseriesPoint {
  t: string;
  value: number;
}

export interface TimeseriesResult {
  metric: string;
  range: string;
  points: TimeseriesPoint[];
}

export interface SearchResult {
  type: string;
  id: string;
  label: string;
  sublabel?: string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(UpstreamBooking, UPSTREAM_CONNECTION)
    private readonly bookings: Repository<UpstreamBooking>,
    @InjectRepository(UpstreamPayment, UPSTREAM_CONNECTION)
    private readonly payments: Repository<UpstreamPayment>,
    @InjectRepository(UpstreamPayout, UPSTREAM_CONNECTION)
    private readonly payouts: Repository<UpstreamPayout>,
    @InjectRepository(UpstreamListing, UPSTREAM_CONNECTION)
    private readonly listings: Repository<UpstreamListing>,
    @InjectRepository(UpstreamUser, UPSTREAM_CONNECTION)
    private readonly users: Repository<UpstreamUser>,
  ) {}

  private async sum(
    repo: Repository<UpstreamPayment | UpstreamPayout>,
    column: string,
    where: string,
    params: Record<string, unknown>,
  ): Promise<number> {
    const row = await repo
      .createQueryBuilder('t')
      .select(`COALESCE(SUM(t.${column}), 0)`, 'total')
      .where(where, params)
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  async overview(): Promise<MetricsOverview> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      gmvRupees,
      bookingsToday,
      bookings7d,
      bookings30d,
      activeListings,
      newHosts7d,
      totalPayments,
      refundedPayments,
      payoutBacklogRupees,
      pendingKyc,
      onHoldPayouts,
      pendingOwnerApproval,
    ] = await Promise.all([
      this.sum(this.payments, 'amount', "t.status = 'captured'", {}),
      this.bookings.count({ where: { created_at: MoreThanOrEqual(startOfToday) } }),
      this.bookings.count({ where: { created_at: MoreThanOrEqual(daysAgoDate(7)) } }),
      this.bookings.count({ where: { created_at: MoreThanOrEqual(daysAgoDate(30)) } }),
      this.listings.count({ where: { status: 'active' } }),
      this.users
        .createQueryBuilder('u')
        .where("u.role IN ('owner','both')")
        .andWhere('u.created_at >= :since', { since: daysAgoDate(7) })
        .getCount(),
      this.payments.count(),
      this.payments.count({ where: [{ status: 'refunded' }, { status: 'partially_refunded' }] }),
      this.sum(this.payouts, 'amount', "t.status = 'processing'", {}),
      this.users
        .createQueryBuilder('u')
        .where("u.role IN ('owner','both')")
        .andWhere('u.is_verified = false')
        .getCount(),
      this.payouts.count({ where: { status: 'processing' } }),
      this.bookings.count({ where: { status: 'pending' } }),
    ]);

    const refundRatePct = totalPayments
      ? Math.round((refundedPayments / totalPayments) * 1000) / 10
      : 0;

    return {
      gmv: toPaise(gmvRupees),
      bookingsToday,
      bookings7d,
      bookings30d,
      activeListings,
      newHosts7d,
      refundRatePct,
      payoutBacklog: toPaise(payoutBacklogRupees),
      queues: {
        pendingKyc,
        // Review moderation and support live outside the parkslot DB.
        flaggedReviews: 0,
        openSupport: 0,
        onHoldPayouts,
        pendingOwnerApproval,
      },
    };
  }

  async queues(): Promise<MetricsQueues> {
    const [pendingKyc, onHoldPayouts, pendingOwnerApproval] = await Promise.all([
      this.users
        .createQueryBuilder('u')
        .where("u.role IN ('owner','both')")
        .andWhere('u.is_verified = false')
        .getCount(),
      this.payouts.count({ where: { status: 'processing' } }),
      this.bookings.count({ where: { status: 'pending' } }),
    ]);
    return {
      pendingKyc,
      flaggedReviews: 0,
      openSupport: 0,
      onHoldPayouts,
      pendingOwnerApproval,
    };
  }

  async timeseries(metric: string, range: string): Promise<TimeseriesResult> {
    const days = 30;
    const since = daysAgoDate(days - 1);
    since.setHours(0, 0, 0, 0);

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      buckets.set(new Date(since.getTime() + i * DAY).toISOString().slice(0, 10), 0);
    }

    if (metric === 'gmv') {
      const rows = await this.payments.find({
        where: { status: 'captured', createdAt: MoreThanOrEqual(since) },
      });
      for (const p of rows) {
        const key = p.createdAt.toISOString().slice(0, 10);
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + toPaise(p.amount));
      }
    } else {
      const rows = await this.bookings.find({
        where: { created_at: MoreThanOrEqual(since) },
      });
      for (const b of rows) {
        const key = b.created_at.toISOString().slice(0, 10);
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    }

    const points: TimeseriesPoint[] = [...buckets.entries()].map(([day, value]) => ({
      t: new Date(`${day}T00:00:00.000Z`).toISOString(),
      value,
    }));
    return { metric, range: range || '30d', points };
  }

  async search(q: string): Promise<SearchResult[]> {
    const ql = (q ?? '').trim();
    if (!ql) return [];
    const like = `%${ql}%`;
    const out: SearchResult[] = [];

    const [users, listings, bookings] = await Promise.all([
      this.users.find({
        where: [{ name: ILike(like) }, { phone: ILike(like) }, { email: ILike(like) }],
        take: 5,
      }),
      this.listings.find({ where: { title: ILike(like) }, take: 5 }),
      this.bookings.find({
        where: [{ booking_code: ILike(like) }],
        take: 5,
      }),
    ]);

    users.forEach((u) =>
      out.push({
        type: u.role === 'owner' || u.role === 'both' ? 'host' : 'user',
        id: u.id,
        label: u.name,
        sublabel: u.phone,
      }),
    );
    listings.forEach((l) =>
      out.push({ type: 'listing', id: l.id, label: l.title ?? '(untitled)' }),
    );
    bookings.forEach((b) =>
      out.push({ type: 'booking', id: b.id, label: b.booking_code, sublabel: b.listing_title ?? '' }),
    );

    return out.slice(0, 8);
  }
}
