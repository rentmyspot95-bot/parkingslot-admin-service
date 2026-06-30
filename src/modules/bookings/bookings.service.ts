import { Injectable } from '@nestjs/common';
import { paginate } from '../../common/util/paginate';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotFoundDomainException } from '../../common/errors/domain.exception';

const now = Date.now();
const daysAgo = (d: number): string => new Date(now - d * 86_400_000).toISOString();
const hoursAhead = (h: number): string => new Date(now + h * 3_600_000).toISOString();
const minsAhead = (m: number): string => new Date(now + m * 60_000).toISOString();

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

// Seed copied from the admin console mock (src/shared/mock/data.ts → bookings[]).
const bookings: Booking[] = [
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
    ownerRejectReason: null,
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

@Injectable()
export class BookingsService {
  list(query: PaginationQueryDto, bookingMode?: string) {
    return paginate(bookings as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['id', 'listingTitle', 'seekerName', 'hostName'],
      filters: { bookingMode },
    });
  }

  getOne(id: string): Booking {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) throw new NotFoundDomainException('Booking not found');
    return booking;
  }

  cancel(id: string, _body: { reason: string; refund?: boolean }): { ok: true } {
    this.getOne(id);
    return { ok: true };
  }

  ownerDecision(
    id: string,
    _body: { decision: string; reason?: string; onBehalfOfOwner: boolean },
  ): { ok: true } {
    this.getOne(id);
    return { ok: true };
  }

  extendDeadline(id: string, _body: { minutes: number }): { ok: true } {
    this.getOne(id);
    return { ok: true };
  }

  resolveDispute(id: string, _body: { reason: string }): { ok: true } {
    this.getOne(id);
    return { ok: true };
  }

  ownerApprovalStats(hostId: string): OwnerApprovalStats {
    return {
      hostId,
      pendingCount: 1,
      approvedCount: 4,
      rejectedCount: 1,
      autoRejectedCount: 2,
      avgResponseMinutes: 34,
      rejectionRate: 12.5,
    };
  }
}
