import { Injectable } from '@nestjs/common';
import { paginate } from '../../common/util/paginate';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotFoundDomainException } from '../../common/errors/domain.exception';

/** ISO date for `d` days ago — keeps the seed fixtures stable and DB-free. */
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

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

// Seed fixtures copied from the admin console mock (src/shared/mock/data.ts).
// Money is in paise (integer minor units).
const payouts: Payout[] = [
  {
    id: 'pyt_1',
    hostId: 'hst_1',
    hostName: 'Rahul (MG Road Garage)',
    period: { from: daysAgo(37), to: daysAgo(7) },
    grossEarnings: 1240000,
    commission: 248000,
    netPayable: 992000,
    status: 'paid',
    method: 'UPI',
    reference: 'UTR123456',
    triggeredBy: 'adm_1',
    createdAt: daysAgo(6),
    paidAt: daysAgo(5),
  },
  {
    id: 'pyt_2',
    hostId: 'hst_2',
    hostName: 'Sneha (Indiranagar)',
    period: { from: daysAgo(37), to: daysAgo(7) },
    grossEarnings: 72000,
    commission: 14400,
    netPayable: 57600,
    status: 'on_hold',
    method: 'Bank',
    reference: null,
    createdAt: daysAgo(6),
    paidAt: null,
  },
];

@Injectable()
export class PayoutsService {
  listPayouts(query: PaginationQueryDto) {
    return paginate(payouts as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['id', 'hostId', 'hostName'],
    });
  }

  getPayout(id: string) {
    const payout = payouts.find((p) => p.id === id);
    if (!payout) throw new NotFoundDomainException('Payout not found');
    // Detail view adds the constituent bookings + settlement reference.
    return {
      ...payout,
      reference: payout.reference,
      bookings: [
        { id: 'bkg_1', amount: payout.grossEarnings, netToHost: payout.netPayable },
      ],
    };
  }

  run(body: { from: string; to: string }) {
    // Stub: a real run would compute payouts for the window [from, to].
    void body;
    return { ok: true, created: 1 };
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
