import 'reflect-metadata';
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from './data-source';
import { AdminRole } from '../auth/entities/admin-role.entity';
import { AdminUser } from '../auth/entities/admin-user.entity';
import { DEFAULT_ROLES } from '../auth/permissions';

/** Idempotent seed: default roles + a super-admin (from ADMIN_SEED_* env). */
async function run(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const roleRepo = AppDataSource.getRepository(AdminRole);
    const adminRepo = AppDataSource.getRepository(AdminUser);

    for (const r of DEFAULT_ROLES) {
      const existing = await roleRepo.findOne({ where: { name: r.name } });
      if (existing) {
        existing.permissions = [...r.permissions];
        await roleRepo.save(existing);
      } else {
        await roleRepo.save(roleRepo.create({ name: r.name, permissions: [...r.permissions] }));
      }
    }

    const email = (process.env.ADMIN_SEED_EMAIL ?? 'admin@parkingslot.com').toLowerCase().trim();
    const password = process.env.ADMIN_SEED_PASSWORD ?? 'admin';
    const name = process.env.ADMIN_SEED_NAME ?? 'Super Admin';

    let admin = await adminRepo.findOne({ where: { email } });
    if (!admin) {
      admin = adminRepo.create({
        email,
        name,
        status: 'active',
        passwordHash: bcrypt.hashSync(password, 10),
        totpEnabled: false,
        totpSecret: null,
        roleNames: ['Super Admin'],
        lastLoginAt: null,
      });
      await adminRepo.save(admin);
      // eslint-disable-next-line no-console
      console.log(`[seed] created super admin: ${email}`);
    } else {
      if (!admin.roleNames.includes('Super Admin')) {
        admin.roleNames = [...admin.roleNames, 'Super Admin'];
        await adminRepo.save(admin);
      }
      // eslint-disable-next-line no-console
      console.log(`[seed] super admin already present: ${email}`);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed', err);
  process.exit(1);
});
