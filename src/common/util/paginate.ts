import type { PaginatedResult } from '../dto/pagination-query.dto';

export interface PaginateOptions {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  sort?: string;
  /** Fields to match against `q` (case-insensitive substring). */
  searchFields?: string[];
  /** Extra exact-match filters, e.g. { kycStatus: 'pending' }. */
  filters?: Record<string, string | undefined>;
}

/**
 * In-memory pagination/filtering/sorting helper for the stub modules.
 * (When a module is wired to a real domain service, that service paginates instead.)
 */
export function paginate<T extends Record<string, unknown>>(
  rows: T[],
  opts: PaginateOptions = {},
): PaginatedResult<T> {
  const { page = 1, limit = 25, q, status, sort, searchFields = [], filters = {} } = opts;
  let data = [...rows];

  // Accepts a single status or a comma-separated set ("expired,rejected"), so a
  // view can ask for several related states in one round trip.
  if (status) {
    const wanted = new Set(
      status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    data = data.filter((r) => wanted.has(String(r['status'] ?? '')));
  }

  for (const [key, value] of Object.entries(filters)) {
    if (value) data = data.filter((r) => String(r[key] ?? '') === value);
  }

  if (q && searchFields.length) {
    const needle = q.toLowerCase();
    data = data.filter((r) =>
      searchFields.some((f) => String(r[f] ?? '').toLowerCase().includes(needle)),
    );
  }

  if (sort) {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    data.sort((a, b) => {
      const av = a[field] as string | number | null | undefined;
      const bv = b[field] as string | number | null | undefined;
      // Rows missing the sort field (e.g. an undecided booking sorted by
      // decidedAt) always sort last, rather than flipping with the direction.
      const aEmpty = av === null || av === undefined;
      const bEmpty = bv === null || bv === undefined;
      if (aEmpty || bEmpty) return aEmpty && bEmpty ? 0 : aEmpty ? 1 : -1;
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return desc ? -cmp : cmp;
    });
  }

  const total = data.length;
  const start = (page - 1) * limit;
  return { data: data.slice(start, start + limit), page, limit, total };
}
