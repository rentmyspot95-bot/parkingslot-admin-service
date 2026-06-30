import { Injectable } from '@nestjs/common';
import { paginate } from '../../common/util/paginate';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Local ISO-date helper (mirrors the console mock's daysAgo). */
const daysAgo = (d: number): string => new Date(Date.now() - d * 86_400_000).toISOString();

interface Review {
  id: string;
  listingId: string;
  listingTitle?: string | null;
  seekerId: string;
  seekerName?: string | null;
  rating: number;
  text?: string | null;
  status: 'visible' | 'hidden' | 'flagged' | 'removed';
  moderatedBy?: string | null;
  moderationReason?: string | null;
  createdAt: string;
}

@Injectable()
export class ReviewsService {
  // Seed copied verbatim from the admin console mock (src/shared/mock/data.ts).
  private readonly reviews: Review[] = [
    {
      id: 'rev_1',
      listingId: 'lst_1',
      listingTitle: 'Covered parking near MG Road Metro',
      seekerId: 'usr_2',
      seekerName: 'Priya Nair',
      rating: 2,
      text: 'Spot was blocked when I arrived, had to wait 20 minutes.',
      status: 'flagged',
      createdAt: daysAgo(2),
    },
    {
      id: 'rev_2',
      listingId: 'lst_1',
      listingTitle: 'Covered parking near MG Road Metro',
      seekerId: 'usr_1',
      seekerName: 'Rahul Sharma',
      rating: 5,
      text: 'Great, secure and easy to find.',
      status: 'visible',
      createdAt: daysAgo(8),
    },
  ];

  list(query: PaginationQueryDto) {
    return paginate(this.reviews as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['text', 'listingTitle', 'seekerName'],
    });
  }

  moderate(id: string, _body: { action: string; reason: string }): { ok: true } {
    return { ok: true };
  }
}
