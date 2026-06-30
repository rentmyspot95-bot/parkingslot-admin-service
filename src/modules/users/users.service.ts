import { Injectable } from '@nestjs/common';
import { paginate } from '../../common/util/paginate';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotFoundDomainException } from '../../common/errors/domain.exception';

/** Local ISO-date helper (mirrors data.ts daysAgo / hoursAhead / minsAhead). */
const daysAgo = (d: number): string => new Date(Date.now() - d * 86_400_000).toISOString();
const hoursAhead = (h: number): string => new Date(Date.now() + h * 3_600_000).toISOString();
const minsAhead = (m: number): string => new Date(Date.now() + m * 60_000).toISOString();

// ── Seed fixtures (copied from console mock data.ts; money in paise) ────────────
const users = [
  {
    id: 'usr_1',
    phone: '+919800000001',
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    status: 'active',
    vehicles: [{ type: 'car', label: 'Sedan', plate: 'KA01AB1234' }],
    walletCreditBalance: 25000,
    createdAt: daysAgo(120),
    lastActiveAt: daysAgo(1),
    bookingCount: 14,
    flagged: false,
  },
  {
    id: 'usr_2',
    phone: '+919800000002',
    name: 'Priya Nair',
    email: 'priya@example.com',
    status: 'active',
    vehicles: [{ type: 'bike', label: '2-Wheeler', plate: 'KA05CD5678' }],
    walletCreditBalance: 0,
    createdAt: daysAgo(80),
    lastActiveAt: daysAgo(3),
    bookingCount: 7,
    flagged: true,
  },
  {
    id: 'usr_3',
    phone: '+919800000003',
    name: 'Imran Khan',
    email: null as string | null,
    status: 'suspended',
    vehicles: [] as { type: string; label: string; plate?: string }[],
    walletCreditBalance: 5000,
    createdAt: daysAgo(40),
    lastActiveAt: daysAgo(10),
    bookingCount: 2,
    flagged: false,
  },
  {
    id: 'usr_4',
    phone: '+919800000004',
    name: 'Sneha Reddy',
    email: 'sneha@example.com',
    status: 'active',
    vehicles: [
      { type: 'car', label: 'Hatchback', plate: 'KA03EF9012' },
      { type: 'bike', label: '2-Wheeler' },
    ],
    walletCreditBalance: 50000,
    createdAt: daysAgo(15),
    lastActiveAt: daysAgo(0),
    bookingCount: 1,
    flagged: false,
  },
];

const bookings = [
  {
    id: 'bkg_1',
    listingId: 'lst_1',
    listingTitle: 'Covered parking near MG Road Metro',
    seekerId: 'usr_2',
    seekerName: 'Priya Nair',
    hostId: 'hst_1',
    hostName: 'Rahul (MG Road Garage)',
    slot: { start: daysAgo(2), end: daysAgo(2) },
    vehicleType: 'bike',
    bayId: 'B-04',
    amount: 12000,
    currency: 'INR',
    commission: 2400,
    netToHost: 9600,
    status: 'completed',
    bookingMode: 'instant_book',
    autoRejected: false,
    paymentId: 'pay_1',
    createdAt: daysAgo(2),
  },
  {
    id: 'bkg_2',
    listingId: 'lst_2',
    listingTitle: 'Driveway spot, 100m from 100ft Road',
    seekerId: 'usr_1',
    seekerName: 'Rahul Sharma',
    hostId: 'hst_2',
    hostName: 'Sneha (Indiranagar)',
    slot: { start: hoursAhead(6), end: hoursAhead(10) },
    vehicleType: 'car',
    amount: 12000,
    currency: 'INR',
    commission: 2400,
    netToHost: 9600,
    status: 'pending_owner_approval',
    bookingMode: 'request_to_book',
    responseDeadline: minsAhead(22),
    autoRejected: false,
    paymentId: 'pay_2',
    createdAt: minsAhead(-38),
  },
  {
    id: 'bkg_3',
    listingId: 'lst_2',
    listingTitle: 'Driveway spot, 100m from 100ft Road',
    seekerId: 'usr_4',
    seekerName: 'Sneha Reddy',
    hostId: 'hst_2',
    hostName: 'Sneha (Indiranagar)',
    slot: { start: daysAgo(1), end: daysAgo(1) },
    vehicleType: 'car',
    amount: 9000,
    currency: 'INR',
    commission: 1800,
    netToHost: 7200,
    status: 'auto_rejected',
    bookingMode: 'request_to_book',
    ownerRejectReason: null as string | null,
    responseDeadline: daysAgo(1),
    autoRejected: true,
    paymentId: 'pay_3',
    createdAt: daysAgo(1),
  },
  {
    id: 'bkg_4',
    listingId: 'lst_1',
    listingTitle: 'Covered parking near MG Road Metro',
    seekerId: 'usr_3',
    seekerName: 'Imran Khan',
    hostId: 'hst_1',
    hostName: 'Rahul (MG Road Garage)',
    slot: { start: hoursAhead(2), end: hoursAhead(5) },
    vehicleType: 'car',
    amount: 15000,
    currency: 'INR',
    commission: 3000,
    netToHost: 12000,
    status: 'disputed',
    bookingMode: 'instant_book',
    autoRejected: false,
    paymentId: 'pay_4',
    createdAt: daysAgo(3),
  },
];

const walletTxns: Record<string, Array<Record<string, unknown>>> = {
  usr_1: [
    {
      id: 'wtx_1',
      userId: 'usr_1',
      type: 'credit',
      amount: 25000,
      reason: 'Apology credit — host cancelled',
      issuedBy: 'adm_1',
      balanceAfter: 25000,
      createdAt: daysAgo(20),
    },
  ],
  usr_3: [
    {
      id: 'wtx_2',
      userId: 'usr_3',
      type: 'credit',
      amount: 10000,
      reason: 'Campaign credit',
      issuedBy: 'adm_1',
      balanceAfter: 10000,
      createdAt: daysAgo(30),
    },
    {
      id: 'wtx_3',
      userId: 'usr_3',
      type: 'debit',
      amount: 5000,
      reason: 'Used on booking bkg_x',
      relatedBookingId: 'bkg_x',
      balanceAfter: 5000,
      createdAt: daysAgo(25),
    },
  ],
};

@Injectable()
export class UsersService {
  list(query: PaginationQueryDto) {
    return paginate(users as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['name', 'phone', 'email'],
    });
  }

  get(id: string) {
    const user = users.find((u) => u.id === id);
    if (!user) throw new NotFoundDomainException('User not found');
    return user;
  }

  listBookings(id: string, query: PaginationQueryDto) {
    const rows = bookings.filter((b) => b.seekerId === id);
    return paginate(rows as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: Math.min(query.limit ?? 25, 50),
      q: query.q,
      status: query.status,
      sort: query.sort,
    });
  }

  listWallet(id: string, query: PaginationQueryDto) {
    const rows = walletTxns[id] ?? [];
    return paginate(rows, {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
    });
  }

  walletAdjust(id: string, body: { type: string; amount: number; reason: string }) {
    const user = users.find((u) => u.id === id);
    if (!user) throw new NotFoundDomainException('User not found');
    const amount = Number(body?.amount ?? 0);
    const delta = body?.type === 'debit' ? -amount : amount;
    const balanceAfter = user.walletCreditBalance + delta;
    return { ok: true as const, balanceAfter };
  }

  updateStatus(id: string, body: { status: string; reason?: string }) {
    const user = users.find((u) => u.id === id);
    if (!user) throw new NotFoundDomainException('User not found');
    return { ...user, status: body?.status };
  }
}
