import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { AdminUser } from '../../auth/entities/admin-user.entity';
import { AdminRole } from '../../auth/entities/admin-role.entity';
import { paginate } from '../../common/util/paginate';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotFoundDomainException } from '../../common/errors/domain.exception';

interface AdminDto {
  id: string;
  email: string;
  name: string;
  status: string;
  roles: string[];
  totpEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>,
    @InjectRepository(AdminRole) private readonly roles: Repository<AdminRole>,
  ) {}

  async listAdmins(query: PaginationQueryDto) {
    const rows = (await this.admins.find()).map((a) => this.toDto(a));
    return paginate(rows as unknown as Record<string, unknown>[], {
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      sort: query.sort,
      searchFields: ['email', 'name'],
    });
  }

  async invite(input: { email: string; name: string; roles?: string[] }): Promise<AdminDto> {
    const tempPassword = randomUUID();
    const admin = this.admins.create({
      email: input.email.toLowerCase().trim(),
      name: input.name,
      status: 'active',
      passwordHash: bcrypt.hashSync(tempPassword, 10),
      totpEnabled: false,
      totpSecret: null,
      roleNames: input.roles ?? [],
      lastLoginAt: null,
    });
    const saved = await this.admins.save(admin);
    // In production an invite email with a set-password link would be sent here.
    return this.toDto(saved);
  }

  async updateAdmin(
    id: string,
    patch: { status?: string; roles?: string[]; totpEnabled?: boolean },
  ): Promise<AdminDto> {
    const admin = await this.admins.findOne({ where: { id } });
    if (!admin) throw new NotFoundDomainException('Admin not found');
    if (patch.status === 'active' || patch.status === 'disabled') admin.status = patch.status;
    if (Array.isArray(patch.roles)) admin.roleNames = patch.roles;
    if (typeof patch.totpEnabled === 'boolean') admin.totpEnabled = patch.totpEnabled;
    return this.toDto(await this.admins.save(admin));
  }

  listRoles() {
    return this.roles.find();
  }

  async saveRole(input: { id?: string; name: string; permissions: string[] }): Promise<AdminRole> {
    if (input.id) {
      const role = await this.roles.findOne({ where: { id: input.id } });
      if (!role) throw new NotFoundDomainException('Role not found');
      role.name = input.name;
      role.permissions = input.permissions;
      return this.roles.save(role);
    }
    return this.roles.save(this.roles.create({ name: input.name, permissions: input.permissions }));
  }

  private toDto(a: AdminUser): AdminDto {
    return {
      id: a.id,
      email: a.email,
      name: a.name,
      status: a.status,
      roles: a.roleNames,
      totpEnabled: a.totpEnabled,
      lastLoginAt: a.lastLoginAt,
      createdAt: a.createdAt,
    };
  }
}
