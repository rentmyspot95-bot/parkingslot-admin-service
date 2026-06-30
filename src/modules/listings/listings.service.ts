import { Injectable } from '@nestjs/common';
import { paginate } from '../../common/util/paginate';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotFoundDomainException } from '../../common/errors/domain.exception';

const now = Date.now();
const daysAgo = (d: number): string => new Date(now - d * 86_400_000).toISOString();

interface Listing {
  id: string;
  hostId: string;
  hostName: string;
  title: string;
  address: string;
  geo: { lat: number; lng: number };
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

// Seed copied from the admin console mock (src/shared/mock/data.ts → listings[]).
const listings: Listing[] = [
  {
    id: 'lst_1',
    hostId: 'hst_1',
    hostName: 'Rahul (MG Road Garage)',
    title: 'Covered parking near MG Road Metro',
    address: '12 MG Road, Bengaluru 560001',
    geo: { lat: 12.9756, lng: 77.6068 },
    photos: [
      'https://placehold.co/800x500?text=Parking+1',
      'https://placehold.co/800x500?text=Parking+2',
    ],
    amenities: ['Covered', 'CCTV', 'EV charging'],
    vehicleTypes: ['car', 'bike'],
    pricePerHour: 4000,
    pricePerDay: 30000,
    bookingMode: 'instant_book',
    status: 'active',
    createdAt: daysAgo(105),
    updatedAt: daysAgo(2),
  },
  {
    id: 'lst_2',
    hostId: 'hst_2',
    hostName: 'Sneha (Indiranagar)',
    title: 'Driveway spot, 100m from 100ft Road',
    address: '4 Indiranagar, Bengaluru 560038',
    geo: { lat: 12.9719, lng: 77.6412 },
    photos: ['https://placehold.co/800x500?text=Driveway'],
    amenities: ['Gated'],
    vehicleTypes: ['car'],
    pricePerHour: 3000,
    pricePerDay: null,
    bookingMode: 'request_to_book',
    status: 'pending_review',
    moderationNote: null,
    createdAt: daysAgo(11),
    updatedAt: daysAgo(11),
  },
];

@Injectable()
export class ListingsService {
  list(query: PaginationQueryDto, bookingMode?: string) {
    return paginate(listings as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['title', 'address'],
      filters: { bookingMode },
    });
  }

  getOne(id: string): Listing {
    const listing = listings.find((l) => l.id === id);
    if (!listing) throw new NotFoundDomainException('Listing not found');
    return listing;
  }

  moderate(id: string, _body: { action: string; note?: string }): { ok: true } {
    this.getOne(id);
    return { ok: true };
  }

  update(id: string, body: Partial<Listing>): { ok: true } & Partial<Listing> {
    const listing = this.getOne(id);
    return { ok: true, ...listing, ...body };
  }
}
