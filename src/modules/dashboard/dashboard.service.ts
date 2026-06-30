import { Injectable } from '@nestjs/common';

/** Local ISO-date helper (mirrors data.ts daysAgo). */
const daysAgo = (d: number): string => new Date(Date.now() - d * 86_400_000).toISOString();

export interface MetricsQueues {
  pendingKyc: number;
  flaggedReviews: number;
  openSupport: number;
  onHoldPayouts: number;
  pendingOwnerApproval: number;
}

export interface MetricsOverview {
  gmv: number;
  bookingsToday: number;
  bookings7d: number;
  bookings30d: number;
  activeListings: number;
  newHosts7d: number;
  refundRatePct: number;
  payoutBacklog: number;
  queues: MetricsQueues;
}

export interface TimeseriesPoint {
  t: string;
  value: number;
}

export interface TimeseriesResult {
  metric: string;
  range: string;
  points: TimeseriesPoint[];
}

export interface SearchResult {
  type: string;
  id: string;
  label: string;
  sublabel?: string;
}

@Injectable()
export class DashboardService {
  /** Mirrors data.ts metricsOverview(). Counts are derived from the seed fixtures. */
  overview(): MetricsOverview {
    return {
      gmv: 4820000,
      bookingsToday: 23,
      bookings7d: 162,
      bookings30d: 689,
      activeListings: 1,
      newHosts7d: 1,
      refundRatePct: 3.4,
      payoutBacklog: 57600,
      queues: this.queues(),
    };
  }

  /** Mirrors the queues object inside metricsOverview(). */
  queues(): MetricsQueues {
    return {
      pendingKyc: 1,
      flaggedReviews: 1,
      openSupport: 1,
      onHoldPayouts: 1,
      pendingOwnerApproval: 1,
    };
  }

  /** Mirrors data.ts timeseries(): ~30 points of synthetic data. */
  timeseries(metric: string, range: string): TimeseriesResult {
    const points: TimeseriesPoint[] = Array.from({ length: 30 }, (_, i) => {
      const base = metric === 'gmv' ? 120000 : 20;
      const wobble = Math.round(base * (0.6 + 0.5 * Math.abs(Math.sin(i / 3))));
      return { t: daysAgo(29 - i), value: wobble };
    });
    return { metric, range: range || '30d', points };
  }

  /** Mirrors data.ts globalSearch(): cross-entity search over users/hosts/listings/bookings. */
  search(q: string): SearchResult[] {
    const ql = (q ?? '').toLowerCase();
    const out: SearchResult[] = [];
    if (!ql) return out;

    USERS.filter(
      (u) =>
        u.name.toLowerCase().includes(ql) ||
        u.phone.includes(q) ||
        (u.email ?? '').includes(ql),
    ).forEach((u) => out.push({ type: 'user', id: u.id, label: u.name, sublabel: u.phone }));

    HOSTS.filter((h) => h.displayName.toLowerCase().includes(ql)).forEach((h) =>
      out.push({ type: 'host', id: h.id, label: h.displayName }),
    );

    LISTINGS.filter((l) => l.title.toLowerCase().includes(ql)).forEach((l) =>
      out.push({ type: 'listing', id: l.id, label: l.title, sublabel: l.address }),
    );

    BOOKINGS.filter((b) => b.id.includes(ql)).forEach((b) =>
      out.push({ type: 'booking', id: b.id, label: b.id, sublabel: b.listingTitle ?? '' }),
    );

    return out.slice(0, 8);
  }
}

// ── Minimal search fixtures (mirror data.ts) ───────────────────────────────────
const USERS = [
  { id: 'usr_1', name: 'Rahul Sharma', phone: '+919800000001', email: 'rahul@example.com' },
  { id: 'usr_2', name: 'Priya Nair', phone: '+919800000002', email: 'priya@example.com' },
  { id: 'usr_3', name: 'Imran Khan', phone: '+919800000003', email: null as string | null },
  { id: 'usr_4', name: 'Sneha Reddy', phone: '+919800000004', email: 'sneha@example.com' },
];

const HOSTS = [
  { id: 'hst_1', displayName: 'Rahul (MG Road Garage)' },
  { id: 'hst_2', displayName: 'Sneha (Indiranagar)' },
];

const LISTINGS = [
  { id: 'lst_1', title: 'Covered parking near MG Road Metro', address: '12 MG Road, Bengaluru 560001' },
  { id: 'lst_2', title: 'Driveway spot, 100m from 100ft Road', address: '4 Indiranagar, Bengaluru 560038' },
];

const BOOKINGS = [
  { id: 'bkg_1', listingTitle: 'Covered parking near MG Road Metro' },
  { id: 'bkg_2', listingTitle: 'Driveway spot, 100m from 100ft Road' },
  { id: 'bkg_3', listingTitle: 'Driveway spot, 100m from 100ft Road' },
  { id: 'bkg_4', listingTitle: 'Covered parking near MG Road Metro' },
];
