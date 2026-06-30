import { Injectable } from '@nestjs/common';
import { paginate } from '../../common/util/paginate';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotFoundDomainException } from '../../common/errors/domain.exception';

/** ISO date for `d` days ago — keeps the seed fixtures stable and DB-free. */
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const minsAhead = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

interface Refund {
  id: string;
  amount: number;
  reason: string;
  by: string;
  at: string;
}

interface Payment {
  id: string;
  bookingId: string;
  gateway: string;
  gatewayPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  refunds: Refund[];
  createdAt: string;
}

interface RefundRecord {
  id: string;
  paymentId: string;
  bookingId: string;
  amount: number;
  reason: string;
  status: string;
  by: string;
  at: string;
}

// Seed fixtures copied from the admin console mock (src/shared/mock/data.ts).
// Money is in paise (integer minor units).
const payments: Payment[] = [
  {
    id: 'pay_1',
    bookingId: 'bkg_1',
    gateway: 'razorpay',
    gatewayPaymentId: 'rzp_pay_AbC123',
    amount: 12000,
    currency: 'INR',
    status: 'captured',
    refunds: [],
    createdAt: daysAgo(2),
  },
  {
    id: 'pay_2',
    bookingId: 'bkg_2',
    gateway: 'razorpay',
    gatewayPaymentId: 'rzp_pay_DeF456',
    amount: 12000,
    currency: 'INR',
    status: 'authorized',
    refunds: [],
    createdAt: minsAhead(-38),
  },
  {
    id: 'pay_3',
    bookingId: 'bkg_3',
    gateway: 'razorpay',
    gatewayPaymentId: 'rzp_pay_GhI789',
    amount: 9000,
    currency: 'INR',
    status: 'refunded',
    refunds: [{ id: 'rfnd_1', amount: 9000, reason: 'Auto-rejected request', by: 'adm_1', at: daysAgo(1) }],
    createdAt: daysAgo(1),
  },
  {
    id: 'pay_4',
    bookingId: 'bkg_4',
    gateway: 'razorpay',
    gatewayPaymentId: 'rzp_pay_JkL012',
    amount: 15000,
    currency: 'INR',
    status: 'partially_refunded',
    refunds: [{ id: 'rfnd_2', amount: 5000, reason: 'Partial goodwill', by: 'adm_1', at: daysAgo(2) }],
    createdAt: daysAgo(3),
  },
];

const refunds: RefundRecord[] = [
  { id: 'rfnd_1', paymentId: 'pay_3', bookingId: 'bkg_3', amount: 9000, reason: 'Auto-rejected request', status: 'processed', by: 'adm_1', at: daysAgo(1) },
  { id: 'rfnd_2', paymentId: 'pay_4', bookingId: 'bkg_4', amount: 5000, reason: 'Partial goodwill', status: 'processed', by: 'adm_1', at: daysAgo(2) },
];

@Injectable()
export class PaymentsService {
  listPayments(query: PaginationQueryDto) {
    return paginate(payments as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['id', 'bookingId', 'gatewayPaymentId'],
    });
  }

  getPayment(id: string): Payment {
    const payment = payments.find((p) => p.id === id);
    if (!payment) throw new NotFoundDomainException('Payment not found');
    return payment;
  }

  refund(id: string, body: { amount: number; reason: string }) {
    // Stub: a real implementation would call the gateway and persist the refund.
    return {
      refundId: 'rfnd_new',
      paymentId: id,
      amount: body.amount,
      status: 'processing',
      auditId: 'aud_new',
    };
  }

  listRefunds(query: PaginationQueryDto) {
    return paginate(refunds as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['id', 'paymentId', 'reason'],
    });
  }
}
