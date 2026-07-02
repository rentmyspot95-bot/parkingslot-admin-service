/**
 * Read-only entity mappings for the shared domain database (`parkslot`).
 *
 * These mirror the tables owned by the domain microservices (listing, booking,
 * payment, payout, review, user). The admin-service NEVER writes to them — they
 * are registered under the `upstream` connection with `synchronize: false` so
 * the admin console can surface real marketplace/finance data.
 *
 * Only the columns the admin BFF actually reads are declared. Money columns are
 * stored as rupees (decimal) upstream; mapping to the console's paise contract
 * happens in the services, not here.
 */
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

/** TypeORM returns decimals as strings; coerce to number (null → null). */
const numeric = {
  to: (v?: number | null) => v,
  from: (v?: string | null) => (v === null || v === undefined ? null : Number(v)),
};

// ── users ──────────────────────────────────────────────────────────────────
@Entity({ name: 'users' })
export class UpstreamUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  phone!: string;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  role!: string;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'trust_score', type: 'integer', default: 0 })
  trustScore!: number;

  @Column({ name: 'wallet_balance', type: 'numeric', transformer: numeric, default: 0 })
  walletBalance!: number;

  @Column({ name: 'total_bookings', type: 'integer', default: 0 })
  totalBookings!: number;

  @Column({ name: 'total_listings', type: 'integer', default: 0 })
  totalListings!: number;

  @Column({ name: 'avg_rating', type: 'numeric', transformer: numeric, nullable: true })
  avgRating!: number | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

// ── wallet_transactions ──────────────────────────────────────────────────────
@Entity({ name: 'wallet_transactions' })
export class UpstreamWalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  type!: 'credit' | 'debit';

  @Column({ type: 'numeric', transformer: numeric })
  amount!: number;

  @Column({ type: 'varchar' })
  description!: string;

  @Column({ name: 'reference_id', type: 'varchar', nullable: true })
  referenceId!: string | null;

  @Column({ name: 'balance_after', type: 'numeric', transformer: numeric })
  balanceAfter!: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

// ── listings ──────────────────────────────────────────────────────────────────
export interface UpstreamAddress {
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
}
export interface UpstreamPricing {
  hourly?: number;
  daily?: number;
  weekly?: number;
  monthly?: number;
}

@Entity({ name: 'listing_photos' })
export class UpstreamListingPhoto {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'listing_id', type: 'uuid' })
  listingId!: string;

  @Column({ type: 'varchar' })
  url!: string;

  @Column({ name: 'sort_order', type: 'integer' })
  sortOrder!: number;

  @ManyToOne(() => UpstreamListing, (l) => l.photos)
  @JoinColumn({ name: 'listing_id' })
  listing!: Relation<UpstreamListing>;
}

@Entity({ name: 'listings' })
export class UpstreamListing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'varchar', nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar' })
  status!: string;

  @Column({ name: 'parking_type', type: 'varchar', array: true, default: () => "'{}'" })
  parkingType!: string[];

  @Column({ name: 'vehicle_types', type: 'varchar', array: true, default: () => "'{}'" })
  vehicleTypes!: string[];

  @Column({ type: 'jsonb', nullable: true })
  address!: UpstreamAddress | null;

  @Column({ type: 'jsonb', nullable: true })
  amenities!: Record<string, boolean> | null;

  @Column({ type: 'jsonb', nullable: true })
  pricing!: UpstreamPricing | null;

  @Column({ name: 'is_instant_book', type: 'boolean', default: false })
  isInstantBook!: boolean;

  @Column({ name: 'avg_rating', type: 'decimal', transformer: numeric, default: 0 })
  avgRating!: number;

  @Column({ name: 'review_count', type: 'integer', default: 0 })
  reviewCount!: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => UpstreamListingPhoto, (p) => p.listing)
  photos!: Relation<UpstreamListingPhoto[]>;
}

// ── bookings ──────────────────────────────────────────────────────────────────
@Entity({ name: 'bookings' })
export class UpstreamBooking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  booking_code!: string;

  @Column({ type: 'uuid' })
  seeker_id!: string;

  @Column({ type: 'uuid' })
  listing_id!: string;

  @Column({ type: 'uuid' })
  owner_id!: string;

  @Column({ type: 'varchar' })
  status!: string;

  @Column({ type: 'timestamptz' })
  start_time!: Date;

  @Column({ type: 'timestamptz' })
  end_time!: Date;

  @Column({ type: 'decimal', transformer: numeric })
  base_amount!: number;

  @Column({ type: 'decimal', transformer: numeric, default: 0 })
  service_fee!: number;

  @Column({ type: 'decimal', transformer: numeric })
  total_amount!: number;

  @Column({ type: 'boolean', default: true })
  is_instant!: boolean;

  @Column({ type: 'uuid', nullable: true })
  payment_id!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  owner_response_deadline!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  auto_reject_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  cancel_reason!: string | null;

  @Column({ type: 'varchar', nullable: true })
  slot_number!: string | null;

  @Column({ type: 'varchar', nullable: true })
  vehicle_type!: string | null;

  @Column({ type: 'varchar', nullable: true })
  listing_title!: string | null;

  @Column({ type: 'varchar', nullable: true })
  listing_address!: string | null;

  @Column({ type: 'timestamptz' })
  created_at!: Date;
}

// ── payments ──────────────────────────────────────────────────────────────────
@Entity({ name: 'payments' })
export class UpstreamPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'razorpay_order_id', type: 'varchar', nullable: true })
  razorpayOrderId!: string | null;

  @Column({ name: 'razorpay_payment_id', type: 'varchar', nullable: true })
  razorpayPaymentId!: string | null;

  @Column({ type: 'decimal', transformer: numeric })
  amount!: number;

  @Column({ type: 'varchar', default: 'INR' })
  currency!: string;

  @Column({ type: 'varchar', default: 'created' })
  status!: string;

  @Column({ name: 'refund_amount', type: 'decimal', transformer: numeric, default: 0 })
  refundAmount!: number;

  @Column({ name: 'refund_id', type: 'varchar', nullable: true })
  refundId!: string | null;

  @Column({ name: 'refund_reason', type: 'text', nullable: true })
  refundReason!: string | null;

  @Column({ name: 'refunded_at', type: 'timestamptz', nullable: true })
  refundedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

// ── payouts ──────────────────────────────────────────────────────────────────
@Entity({ name: 'payouts' })
export class UpstreamPayout {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'decimal', transformer: numeric })
  amount!: number;

  @Column({ type: 'varchar', default: 'processing' })
  status!: string;

  @Column({ name: 'bank_account_id', type: 'uuid' })
  bankAccountId!: string;

  @Column({ type: 'varchar', nullable: true })
  utr!: string | null;

  @Column({ name: 'transaction_ref', type: 'varchar', nullable: true })
  transactionRef!: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ name: 'initiated_at', type: 'timestamptz' })
  initiatedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
}

// ── reviews ──────────────────────────────────────────────────────────────────
@Entity({ name: 'reviews' })
export class UpstreamReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId!: string;

  @Column({ name: 'listing_id', type: 'uuid' })
  listingId!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'integer' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

export const upstreamEntities = [
  UpstreamUser,
  UpstreamWalletTransaction,
  UpstreamListing,
  UpstreamListingPhoto,
  UpstreamBooking,
  UpstreamPayment,
  UpstreamPayout,
  UpstreamReview,
];

/** Connection name used across the admin-service for the read-only domain DB. */
export const UPSTREAM_CONNECTION = 'upstream';
