import { Injectable } from '@nestjs/common';
import { paginate } from '../../common/util/paginate';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const hoursAhead = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

interface NotificationCampaign {
  id: string;
  title: string;
  body: string;
  deepLinkType: string;
  audience: { segment?: string | null; userIds?: string[] | null };
  scheduledAt: string | null;
  status: string;
  sentCount: number;
  createdBy: string | null;
  createdAt: string;
}

@Injectable()
export class NotificationsService {
  private readonly campaigns: NotificationCampaign[] = [
    {
      id: 'cmp_1',
      title: 'Monsoon offer — ₹50 credit',
      body: 'Park dry this monsoon. ₹50 credit on your next booking.',
      deepLinkType: 'wallet',
      audience: { segment: 'all_users' },
      scheduledAt: null,
      status: 'sent',
      sentCount: 10423,
      createdBy: 'adm_1',
      createdAt: daysAgo(9),
    },
    {
      id: 'cmp_2',
      title: 'Win-back inactive seekers',
      body: 'We miss you! Here is ₹30 to come back.',
      deepLinkType: 'home',
      audience: { segment: 'inactive_30d' },
      scheduledAt: hoursAhead(20),
      status: 'scheduled',
      sentCount: 0,
      createdBy: 'adm_1',
      createdAt: daysAgo(1),
    },
  ];

  list(query: PaginationQueryDto) {
    return paginate(this.campaigns as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['title'],
    });
  }

  create(body: Record<string, unknown>) {
    return { id: 'cmp_new', ...body, status: 'draft', sentCount: 0 };
  }

  test(_body: { title: string; body: string; deepLinkType: string; deviceToken: string }) {
    return { ok: true };
  }

  send(_id: string) {
    return { ok: true, status: 'sending' };
  }
}
