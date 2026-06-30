import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { AdminUser } from './entities/admin-user.entity';
import { AdminRole } from './entities/admin-role.entity';
import type {
  AdminJwtPayload,
  AdminRefreshPayload,
  AuthenticatedAdmin,
} from './auth.types';
import {
  ForbiddenDomainException,
  UnauthorizedDomainException,
} from '../common/errors/domain.exception';

export interface LoginSuccess {
  totpRequired?: false;
  accessToken: string;
  refreshToken: string;
  admin: AuthenticatedAdmin;
}
export interface LoginTotpRequired {
  totpRequired: true;
}
export type LoginResult = LoginSuccess | LoginTotpRequired;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>,
    @InjectRepository(AdminRole) private readonly roles: Repository<AdminRole>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string, totp?: string): Promise<LoginResult> {
    const admin = await this.admins.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!admin || admin.status !== 'active') {
      throw new UnauthorizedDomainException('Invalid email or password.');
    }

    const passwordOk = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordOk) throw new UnauthorizedDomainException('Invalid email or password.');

    if (admin.totpEnabled) {
      if (!totp) return { totpRequired: true };
      const valid = admin.totpSecret
        ? authenticator.verify({ token: totp, secret: admin.totpSecret })
        : false;
      if (!valid) throw new UnauthorizedDomainException('Invalid authenticator code.');
    }

    admin.lastLoginAt = new Date();
    await this.admins.save(admin);

    return this.issueTokens(admin);
  }

  async refresh(refreshToken: string | undefined): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) throw new UnauthorizedDomainException('No refresh session.');
    let payload: AdminRefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<AdminRefreshPayload>(refreshToken, {
        secret: this.config.get<string>('ADMIN_REFRESH_SECRET') ?? 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedDomainException('Refresh session expired.');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedDomainException('Invalid refresh token.');

    const admin = await this.admins.findOne({ where: { id: payload.sub } });
    if (!admin || admin.status !== 'active') {
      throw new UnauthorizedDomainException('Account is no longer active.');
    }
    const { accessToken, refreshToken: rotated } = await this.issueTokens(admin);
    return { accessToken, refreshToken: rotated };
  }

  /** Resolve and return the current admin for /admin/me. */
  async me(id: string): Promise<AuthenticatedAdmin> {
    const admin = await this.admins.findOne({ where: { id } });
    if (!admin || admin.status !== 'active') {
      throw new ForbiddenDomainException('Account is no longer active.');
    }
    const permissions = await this.resolvePermissions(admin.roleNames);
    return this.toAuthenticated(admin, permissions);
  }

  private async issueTokens(admin: AdminUser): Promise<LoginSuccess> {
    const permissions = await this.resolvePermissions(admin.roleNames);
    const authenticatedAdmin = this.toAuthenticated(admin, permissions);

    const accessPayload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      roles: admin.roleNames,
      permissions,
      type: 'access',
    };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.get<string>('ADMIN_JWT_SECRET') ?? 'dev-access-secret',
      expiresIn: Number(this.config.get('ADMIN_JWT_ACCESS_TTL') ?? 900),
    });

    const refreshPayload: AdminRefreshPayload = { sub: admin.id, type: 'refresh' };
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.get<string>('ADMIN_REFRESH_SECRET') ?? 'dev-refresh-secret',
      expiresIn: Number(this.config.get('ADMIN_REFRESH_TTL') ?? 2592000),
    });

    return { accessToken, refreshToken, admin: authenticatedAdmin };
  }

  private async resolvePermissions(roleNames: string[]): Promise<string[]> {
    if (!roleNames || roleNames.length === 0) return [];
    const roles = await this.roles.find();
    const set = new Set<string>();
    for (const role of roles) {
      if (roleNames.includes(role.name)) role.permissions.forEach((p) => set.add(p));
    }
    return [...set];
  }

  private toAuthenticated(admin: AdminUser, permissions: string[]): AuthenticatedAdmin {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      roles: admin.roleNames,
      permissions,
    };
  }
}
