import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../../common/util/paginate';
import { toPaise } from '../../common/util/money';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotFoundDomainException } from '../../common/errors/domain.exception';
import { UpstreamPayment, UPSTREAM_CONNECTION } from '../../database/upstream/upstream.entities';

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

/** Maps a real payment row (rupees) to the console's Payment contract (paise). */
function toPayment(p: UpstreamPayment): Payment {
  const refunds: Refund[] =
    p.refundAmount > 0
      ? [
          {
            id: p.refundId ?? `rfnd_${p.id.slice(0, 8)}`,
            amount: toPaise(p.refundAmount),
            reason: p.refundReason ?? '',
            by: '',
            at: (p.refundedAt ?? p.createdAt).toISOString(),
          },
        ]
      : [];
  return {
    id: p.id,
    bookingId: p.bookingId,
    gateway: 'razorpay',
    gatewayPaymentId: p.razorpayPaymentId ?? p.razorpayOrderId ?? '',
    amount: toPaise(p.amount),
    currency: p.currency,
    status: p.status,
    refunds,
    createdAt: p.createdAt.toISOString(),
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(UpstreamPayment, UPSTREAM_CONNECTION)
    private readonly payments: Repository<UpstreamPayment>,
  ) {}

  async listPayments(query: PaginationQueryDto) {
    const rows = (await this.payments.find({ order: { createdAt: 'DESC' } })).map(toPayment);
    return paginate(rows as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['id', 'bookingId', 'gatewayPaymentId'],
    });
  }

  async getPayment(id: string): Promise<Payment> {
    const payment = await this.payments.findOne({ where: { id } });
    if (!payment) throw new NotFoundDomainException('Payment not found');
    return toPayment(payment);
  }

  refund(id: string, body: { amount: number; reason: string }) {
    // Mutations still stub: refunds are executed by the payment-service gateway
    // flow. This BFF is read-only against the domain DB.
    return {
      refundId: 'rfnd_new',
      paymentId: id,
      amount: body.amount,
      status: 'processing',
      auditId: 'aud_new',
    };
  }

  async listRefunds(query: PaginationQueryDto) {
    const rows: RefundRecord[] = (await this.payments.find({ order: { refundedAt: 'DESC' } }))
      .filter((p) => p.refundAmount > 0)
      .map((p) => ({
        id: p.refundId ?? `rfnd_${p.id.slice(0, 8)}`,
        paymentId: p.id,
        bookingId: p.bookingId,
        amount: toPaise(p.refundAmount),
        reason: p.refundReason ?? '',
        status: p.status === 'refunded' ? 'processed' : 'processing',
        by: '',
        at: (p.refundedAt ?? p.createdAt).toISOString(),
      }));
    return paginate(rows as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['id', 'paymentId', 'reason'],
    });
  }
}
