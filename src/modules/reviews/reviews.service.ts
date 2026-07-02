import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { paginate } from '../../common/util/paginate';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  UpstreamListing,
  UpstreamReview,
  UpstreamUser,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

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
  constructor(
    @InjectRepository(UpstreamReview, UPSTREAM_CONNECTION)
    private readonly reviews: Repository<UpstreamReview>,
    @InjectRepository(UpstreamUser, UPSTREAM_CONNECTION)
    private readonly users: Repository<UpstreamUser>,
    @InjectRepository(UpstreamListing, UPSTREAM_CONNECTION)
    private readonly listings: Repository<UpstreamListing>,
  ) {}

  async list(query: PaginationQueryDto) {
    const raw = await this.reviews.find({ order: { createdAt: 'DESC' } });

    const userIds = [...new Set(raw.map((r) => r.reviewerId))];
    const listingIds = [...new Set(raw.map((r) => r.listingId))];
    const [users, listings] = await Promise.all([
      userIds.length ? this.users.find({ where: { id: In(userIds) } }) : Promise.resolve([]),
      listingIds.length
        ? this.listings.find({ where: { id: In(listingIds) } })
        : Promise.resolve([]),
    ]);
    const userNames = new Map(users.map((u) => [u.id, u.name]));
    const listingTitles = new Map(listings.map((l) => [l.id, l.title ?? '']));

    const rows: Review[] = raw.map((r) => ({
      id: r.id,
      listingId: r.listingId,
      listingTitle: listingTitles.get(r.listingId) ?? null,
      seekerId: r.reviewerId,
      seekerName: userNames.get(r.reviewerId) ?? null,
      rating: r.rating,
      text: r.comment,
      // The review-service has no moderation state; everything is visible.
      status: 'visible',
      moderatedBy: null,
      moderationReason: null,
      createdAt: r.createdAt.toISOString(),
    }));

    return paginate(rows as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['text', 'listingTitle', 'seekerName'],
    });
  }

  moderate(id: string, _body: { action: string; reason: string }): { ok: true } {
    void id;
    return { ok: true };
  }
}
