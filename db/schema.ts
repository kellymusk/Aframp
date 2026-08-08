import { boolean, integer, jsonb, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const withdrawals = pgTable('withdrawals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  amountCents: integer('amount_cents').notNull(),
  status: text('status').notNull().default('pending'),
  asset: text('asset').notNull(),
  chain: text('chain').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  category: text('category').notNull(),
  priority: text('priority').notNull().default('normal'),
  isRead: boolean('is_read').notNull().default(false),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const referralAnalytics = pgTable('referral_analytics', {
  id: text('id').primaryKey(),
  referralCode: text('referral_code').notNull(),
  ownerAddress: text('owner_address').notNull(),
  clickCount: integer('click_count').notNull().default(0),
  conversionCount: integer('conversion_count').notNull().default(0),
  totalRebatesEarned: numeric('total_rebates_earned').notNull().default('0'),
  lastClickedAt: timestamp('last_clicked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const referralConversions = pgTable('referral_conversions', {
  id: text('id').primaryKey(),
  referralCode: text('referral_code').notNull(),
  referrerAddress: text('referrer_address').notNull(),
  refereeAddress: text('referee_address').notNull(),
  discountAmount: numeric('discount_amount').notNull().default('0'),
  rebateAmount: numeric('rebate_amount').notNull().default('0'),
  orderId: text('order_id'),
  convertedAt: timestamp('converted_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── App-state tables (migration 003) ────────────────────────────────────────
// Backing store for previously in-memory/module-level state: KYC
// submissions, referral codes, business API keys, team invites, and
// price alert rules/history.

export const kycSubmissions = pgTable('kyc_submissions', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const referralCodes = pgTable('referral_codes', {
  code: text('code').primaryKey(),
  ownerAddress: text('owner_address').notNull(),
  referees: jsonb('referees').notNull().default([]),
  totalRebatesEarned: numeric('total_rebates_earned').notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  maskedKey: text('masked_key').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
})

export const teamInvites = pgTable('team_invites', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull().default('pending'),
  invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
})

export const priceAlertRules = pgTable('price_alert_rules', {
  id: text('id').primaryKey(),
  asset: text('asset').notNull().default('cNGN'),
  direction: text('direction').notNull(),
  threshold: numeric('threshold').notNull(),
  email: text('email').notNull(),
  notifyEmail: boolean('notify_email').notNull().default(true),
  notifyPush: boolean('notify_push').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
})

export const priceAlertEvents = pgTable('price_alert_events', {
  id: text('id').primaryKey(),
  ruleId: text('rule_id').notNull(),
  asset: text('asset').notNull().default('cNGN'),
  direction: text('direction').notNull(),
  threshold: numeric('threshold').notNull(),
  actualValue: numeric('actual_value').notNull(),
  channel: text('channel').notNull(),
  message: text('message').notNull(),
  notifiedAt: timestamp('notified_at', { withTimezone: true }).notNull().defaultNow(),
})
