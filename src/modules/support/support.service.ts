import { Injectable } from '@nestjs/common';
import { paginate } from '../../common/util/paginate';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotFoundDomainException } from '../../common/errors/domain.exception';

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const minsAhead = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

interface SupportThread {
  id: string;
  userId: string;
  userName: string | null;
  subject: string;
  category: string | null;
  status: string;
  assigneeAdminId: string | null;
  assigneeName: string | null;
  priority: string;
  lastMessageAt: string | null;
  createdAt: string;
}

interface SupportMessage {
  id: string;
  threadId: string;
  senderType: 'user' | 'agent' | 'system';
  senderId?: string | null;
  senderName?: string | null;
  body: string;
  createdAt: string;
}

@Injectable()
export class SupportService {
  private readonly threads: SupportThread[] = [
    {
      id: 'sup_1',
      userId: 'usr_2',
      userName: 'Priya Nair',
      subject: 'Refund not received',
      category: 'payment',
      status: 'open',
      assigneeAdminId: null,
      assigneeName: null,
      priority: 'high',
      lastMessageAt: minsAhead(-12),
      createdAt: daysAgo(1),
    },
    {
      id: 'sup_2',
      userId: 'usr_1',
      userName: 'Rahul Sharma',
      subject: 'How do I change my payout UPI?',
      category: 'account',
      status: 'pending',
      assigneeAdminId: 'adm_1',
      assigneeName: 'Ava Operator',
      priority: 'normal',
      lastMessageAt: daysAgo(1),
      createdAt: daysAgo(2),
    },
  ];

  private readonly messages: Record<string, SupportMessage[]> = {
    sup_1: [
      { id: 'msg_1', threadId: 'sup_1', senderType: 'user', senderId: 'usr_2', senderName: 'Priya Nair', body: 'I was auto-rejected but still charged. Where is my refund?', createdAt: daysAgo(1) },
      { id: 'msg_2', threadId: 'sup_1', senderType: 'system', body: 'Ticket created · category: payment', createdAt: daysAgo(1) },
      { id: 'msg_3', threadId: 'sup_1', senderType: 'user', senderId: 'usr_2', senderName: 'Priya Nair', body: 'Any update?', createdAt: minsAhead(-12) },
    ],
    sup_2: [
      { id: 'msg_4', threadId: 'sup_2', senderType: 'user', senderId: 'usr_1', senderName: 'Rahul Sharma', body: 'I need to update my UPI ID for payouts.', createdAt: daysAgo(2) },
      { id: 'msg_5', threadId: 'sup_2', senderType: 'agent', senderId: 'adm_1', senderName: 'Ava Operator', body: 'Happy to help — can you confirm the new UPI handle?', createdAt: daysAgo(1) },
    ],
  };

  listThreads(query: PaginationQueryDto) {
    return paginate(this.threads as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['subject', 'userName'],
    });
  }

  getThread(id: string): SupportThread {
    const thread = this.threads.find((t) => t.id === id);
    if (!thread) throw new NotFoundDomainException('Thread not found');
    return thread;
  }

  listMessages(id: string): SupportMessage[] {
    return this.messages[id] ?? [];
  }

  reply(_id: string, _body: { body: string }) {
    return { ok: true };
  }

  updateThread(
    _id: string,
    _patch: { status?: string; assigneeAdminId?: string; priority?: string },
  ) {
    return { ok: true };
  }
}
