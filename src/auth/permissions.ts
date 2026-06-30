/** Permission catalogue (design doc §8) — mirrors the console's map. */
export const PERMISSIONS = [
  'user.read',
  'user.suspend',
  'user.delete',
  'host.read',
  'host.verify',
  'host.suspend',
  'listing.read',
  'listing.approve',
  'listing.edit',
  'listing.takedown',
  'booking.read',
  'booking.cancel',
  'booking.override',
  'payment.read',
  'payment.refund',
  'payout.read',
  'payout.trigger',
  'payout.hold',
  'wallet.read',
  'wallet.adjust',
  'wallet.adjust:capped',
  'review.read',
  'review.moderate',
  'support.read',
  'support.reply',
  'support.assign',
  'notification.send',
  'config.read',
  'config.write',
  'admin.read',
  'admin.manage',
  'audit.read',
  'export.run',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Default roles seeded on first run (design doc §3). */
export const DEFAULT_ROLES: { name: string; permissions: Permission[] }[] = [
  { name: 'Super Admin', permissions: [...PERMISSIONS] },
  {
    name: 'Operations',
    permissions: [
      'user.read',
      'user.suspend',
      'host.read',
      'host.verify',
      'host.suspend',
      'listing.read',
      'listing.approve',
      'listing.edit',
      'listing.takedown',
      'booking.read',
      'booking.cancel',
      'review.read',
    ],
  },
  {
    name: 'Finance',
    permissions: [
      'payment.read',
      'payment.refund',
      'payout.read',
      'payout.trigger',
      'payout.hold',
      'wallet.read',
      'wallet.adjust',
      'booking.read',
    ],
  },
  {
    name: 'Trust & Safety',
    permissions: [
      'host.read',
      'host.verify',
      'listing.read',
      'listing.approve',
      'listing.takedown',
      'review.read',
      'review.moderate',
      'user.read',
      'user.suspend',
    ],
  },
  {
    name: 'Support Agent',
    permissions: [
      'support.read',
      'support.reply',
      'support.assign',
      'booking.read',
      'wallet.adjust:capped',
      'user.read',
    ],
  },
];

/** Does the granted set satisfy `required`? `wallet.adjust` implies the capped variant. */
export function hasPermission(granted: ReadonlySet<string>, required: Permission): boolean {
  if (granted.has(required)) return true;
  if (required === 'wallet.adjust:capped' && granted.has('wallet.adjust')) return true;
  return false;
}
