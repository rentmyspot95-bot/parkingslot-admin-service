import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { paginate } from '../../common/util/paginate';
import { toPaise } from '../../common/util/money';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  BadRequestDomainException,
  NotFoundDomainException,
} from '../../common/errors/domain.exception';
import { InternalServiceClient } from '../../common/http/internal-service.client';
import {
  UpstreamListing,
  UpstreamUser,
  UPSTREAM_CONNECTION,
} from '../../database/upstream/upstream.entities';

interface Listing {
  id: string;
  hostId: string;
  hostName: string;
  title: string;
  address: string;
  geo: { lat: number; lng: number } | null;
  photos: string[];
  amenities: string[];
  vehicleTypes: string[];
  pricePerHour: number;
  pricePerDay: number | null;
  bookingMode: string;
  status: string;
  moderationNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatAddress(a: UpstreamListing['address']): string {
  if (!a) return '';
  return [a.street, a.area, a.city, a.state, a.pincode].filter(Boolean).join(', ');
}

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(UpstreamListing, UPSTREAM_CONNECTION)
    private readonly listings: Repository<UpstreamListing>,
    @InjectRepository(UpstreamUser, UPSTREAM_CONNECTION)
    private readonly users: Repository<UpstreamUser>,
    private readonly internal: InternalServiceClient,
  ) {}

  private toListing(l: UpstreamListing, hostName: string): Listing {
    const amenities = l.amenities
      ? Object.entries(l.amenities)
          .filter(([, on]) => on)
          .map(([key]) => key)
      : [];
    const photos = (l.photos ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => p.url);
    return {
      id: l.id,
      hostId: l.ownerId,
      hostName,
      title: l.title ?? '',
      address: formatAddress(l.address),
      // See UpstreamListing: the location column is not mapped, because it is
      // absent in the deployed schema. Consumers must tolerate a null geo.
      geo: null,
      photos,
      amenities,
      vehicleTypes: l.vehicleTypes ?? [],
      pricePerHour: toPaise(l.pricing?.hourly),
      pricePerDay: l.pricing?.daily != null ? toPaise(l.pricing.daily) : null,
      bookingMode: l.isInstantBook ? 'instant_book' : 'request_to_book',
      status: l.status,
      moderationNote: null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    };
  }

  private async nameMap(ownerIds: string[]): Promise<Map<string, string>> {
    const ids = [...new Set(ownerIds)];
    if (!ids.length) return new Map();
    const rows = await this.users.find({ where: { id: In(ids) } });
    return new Map(rows.map((u) => [u.id, u.name]));
  }

  async list(query: PaginationQueryDto, bookingMode?: string) {
    const raw = await this.listings.find({
      relations: { photos: true },
      order: { createdAt: 'DESC' },
    });
    const names = await this.nameMap(raw.map((l) => l.ownerId));
    const rows = raw.map((l) => this.toListing(l, names.get(l.ownerId) ?? l.ownerId));
    return paginate(rows as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['title', 'address'],
      filters: { bookingMode },
    });
  }

  async getOne(id: string): Promise<Listing> {
    const listing = await this.listings.findOne({ where: { id }, relations: { photos: true } });
    if (!listing) throw new NotFoundDomainException('Listing not found');
    const names = await this.nameMap([listing.ownerId]);
    return this.toListing(listing, names.get(listing.ownerId) ?? listing.ownerId);
  }

  /**
   * Approve or reject a listing awaiting review.
   *
   * Was a stub that discarded the body and returned `{ ok: true }` — so an
   * operator could reject a listing, see success, and change nothing. The write
   * goes to listing-service because the upstream connection here is read-only.
   */
  async moderate(
    id: string,
    body: { action: string; note?: string },
  ): Promise<{ ok: true; status: string }> {
    const decision = body.action === 'approve' ? 'approve' : 'reject';

    if (decision === 'reject' && !body.note?.trim()) {
      throw new BadRequestDomainException(
        'A note is required when rejecting a listing — it is shown to the owner.',
      );
    }

    const result = await this.internal.request<{ status: string }>({
      baseUrlKey: 'LISTING_SERVICE_BASE_URL',
      path: `/api/v1/internal/listings/${id}/moderate`,
      method: 'POST',
      body: { decision, reason: body.note },
    });

    return { ok: true, status: result.status };
  }

  async update(id: string, body: Partial<Listing>): Promise<{ ok: true } & Partial<Listing>> {
    const listing = await this.getOne(id);
    return { ok: true, ...listing, ...body };
  }
}
