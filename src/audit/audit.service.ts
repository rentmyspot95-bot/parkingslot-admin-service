import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import type { PaginatedResult } from '../common/dto/pagination-query.dto';

export interface RecordAuditInput {
  actorAdminId?: string | null;
  actorName?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  requestId?: string | null;
}

export interface AuditListQuery {
  page?: number;
  limit?: number;
  sort?: string;
  q?: string;
  targetType?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>,
  ) {}

  async record(input: RecordAuditInput): Promise<void> {
    try {
      await this.repo.save(this.repo.create(input));
    } catch {
      // Never let an audit-write failure break the underlying request.
    }
  }

  async list(query: AuditListQuery): Promise<PaginatedResult<AuditLog>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const qb = this.repo.createQueryBuilder('a');

    if (query.targetType) qb.andWhere('a.target_type = :tt', { tt: query.targetType });
    if (query.q) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('a.action ILIKE :q', { q: `%${query.q}%` })
            .orWhere('a.actor_name ILIKE :q', { q: `%${query.q}%` })
            .orWhere('a.target_id ILIKE :q', { q: `%${query.q}%` });
        }),
      );
    }

    const desc = !query.sort || query.sort.startsWith('-');
    const field = (query.sort ?? '-createdAt').replace(/^-/, '');
    const column = field === 'createdAt' ? 'a.created_at' : `a.${field}`;
    qb.orderBy(column, desc ? 'DESC' : 'ASC');

    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, page, limit, total };
  }

  get(id: string) {
    return this.repo.findOne({ where: { id } });
  }
}
