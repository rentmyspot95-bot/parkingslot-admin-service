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

  if (status) data = data.filter((r) => String(r['status'] ?? '') === status);

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
      const av = a[field] as string | number;
      const bv = b[field] as string | number;
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return desc ? -cmp : cmp;
    });
  }

  const total = data.length;
  const start = (page - 1) * limit;
  return { data: data.slice(start, start + limit), page, limit, total };
}
