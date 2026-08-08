/**
 * Transaction ledger — the monitoring record every velocity rule reads from.
 *
 * Storage layer:
 *   Same shape as lib/kyc/withdrawalLimitService.ts and lib/orders/order-store.ts
 *   — an in-memory map deliberately mirroring the SQL table in
 *   db/migrations/003_create_compliance.sql, so the swap to a real database is
 *   a one-file change.  Each exported function maps to a single statement and
 *   quotes the equivalent SQL.
 *
 *   The distinction from the withdrawals store matters: that one exists to
 *   enforce a *limit* and only records offramps.  This one exists to establish
 *   a *behavioural baseline* and records every direction of flow, including
 *   transactions that were ultimately blocked — an attempt that was stopped is
 *   evidence, and dropping it would make the account look cleaner than it is.
 *
 * PII:
 *   No account numbers or holder names are stored here.  Counterparties are
 *   recorded as an opaque `counterpartyKey` (see hashCounterparty) so fan-out
 *   and reuse can be detected without the ledger becoming a second copy of
 *   customers' banking details.  Names live only on cases, where access is
 *   gated and audited.
 */

import { createHash } from 'node:crypto'
import { MAX_LEDGER_ENTRIES_PER_USER } from './config'
import type { ScreeningDecision, TransactionKind } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A row of the `compliance_transactions` table. */
export interface LedgerEntry {
  transactionId: string
  userId: string
  kind: TransactionKind
  /** Integer USD cents. */
  amountCents: number
  asset: string
  chain: string
  /** Salted hash of the counterparty identifier — never the raw value. */
  counterpartyKey?: string
  /** What screening decided.  Blocked attempts are retained deliberately. */
  decision: ScreeningDecision
  riskScore: number
  occurredAt: Date
}

export interface RecordEntryInput extends Omit<LedgerEntry, 'occurredAt'> {
  /** Defaults to now.  Injectable so tests can build histories. */
  occurredAt?: Date
}

export interface WindowQuery {
  /** Rolling window length in ms, measured back from `now`. */
  windowMs: number
  /** Window end.  Injectable so rules are testable without faking the clock. */
  now?: Date
}

// ---------------------------------------------------------------------------
// In-memory store (replace with DB queries in production)
// ---------------------------------------------------------------------------

/**
 * Map<userId, LedgerEntry[]> — the `compliance_transactions` table, kept in
 * ascending occurredAt order.  Exported so tests can inspect state directly.
 */
export const _ledger = new Map<string, LedgerEntry[]>()

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Appends an entry, keeping each user's list ordered by occurredAt.
 *
 *   INSERT INTO compliance_transactions
 *     (transaction_id, user_id, kind, amount_cents, asset, chain,
 *      counterparty_key, decision, risk_score, occurred_at)
 *   VALUES ($1, …, $10)
 *   ON CONFLICT (transaction_id) DO NOTHING;
 *
 * Re-recording the same transaction id is ignored rather than duplicated: the
 * screening endpoint is retried by clients on flaky networks, and a duplicate
 * would inflate every velocity count that reads this table.
 */
export function recordTransaction(input: RecordEntryInput): LedgerEntry {
  const entries = _ledger.get(input.userId) ?? []

  const existing = entries.find((e) => e.transactionId === input.transactionId)
  if (existing) return existing

  const entry: LedgerEntry = { ...input, occurredAt: input.occurredAt ?? new Date() }

  // Almost every insert is the newest entry, so scan from the end — seeded
  // back-dated history is the exception, not the hot path.
  let i = entries.length
  while (i > 0 && entries[i - 1].occurredAt > entry.occurredAt) i--
  entries.splice(i, 0, entry)

  // Bound heap growth per user, oldest first.  In SQL this is a retention job
  // running on RECORD_RETENTION_YEARS instead.
  if (entries.length > MAX_LEDGER_ENTRIES_PER_USER) {
    entries.splice(0, entries.length - MAX_LEDGER_ENTRIES_PER_USER)
  }

  _ledger.set(input.userId, entries)
  return entry
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Entries for a user inside a rolling window, oldest first.
 *
 *   SELECT * FROM compliance_transactions
 *   WHERE  user_id = $1 AND occurred_at >= $2 AND occurred_at <= $3
 *   ORDER  BY occurred_at;
 *
 * The upper bound is not redundant: back-dated seeds and clock skew can put an
 * entry ahead of `now`, and a future-dated row silently inflating a velocity
 * count is the kind of bug that only surfaces in an audit.
 */
export function getEntriesInWindow(
  userId: string,
  { windowMs, now = new Date() }: WindowQuery
): LedgerEntry[] {
  const cutoff = new Date(now.getTime() - windowMs)
  const entries = _ledger.get(userId) ?? []
  return entries.filter((e) => e.occurredAt >= cutoff && e.occurredAt <= now)
}

/**
 * Count and summed value inside a window.
 *
 *   SELECT COUNT(*), COALESCE(SUM(amount_cents), 0)
 *   FROM   compliance_transactions
 *   WHERE  user_id = $1 AND occurred_at >= $2;
 */
export function getWindowTotals(
  userId: string,
  query: WindowQuery
): { count: number; volumeCents: number } {
  const entries = getEntriesInWindow(userId, query)
  return {
    count: entries.length,
    volumeCents: entries.reduce((sum, e) => sum + e.amountCents, 0),
  }
}

/**
 * Distinct counterparties transacted with inside a window.
 *
 *   SELECT COUNT(DISTINCT counterparty_key) FROM compliance_transactions
 *   WHERE user_id = $1 AND occurred_at >= $2 AND counterparty_key IS NOT NULL;
 */
export function getDistinctCounterparties(
  userId: string,
  query: WindowQuery
): Set<string> {
  const keys = new Set<string>()
  for (const entry of getEntriesInWindow(userId, query)) {
    if (entry.counterpartyKey) keys.add(entry.counterpartyKey)
  }
  return keys
}

/**
 * The user's most recent entry before `before`, or null.
 *
 *   SELECT * FROM compliance_transactions
 *   WHERE user_id = $1 AND occurred_at < $2
 *   ORDER BY occurred_at DESC LIMIT 1;
 *
 * Drives dormancy detection.
 */
export function getLastEntryBefore(userId: string, before: Date): LedgerEntry | null {
  const entries = _ledger.get(userId) ?? []
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].occurredAt < before) return entries[i]
  }
  return null
}

/** The user's earliest recorded activity, or null.  Approximates account age. */
export function getFirstEntry(userId: string): LedgerEntry | null {
  return _ledger.get(userId)?.[0] ?? null
}

// ---------------------------------------------------------------------------
// Counterparty hashing
// ---------------------------------------------------------------------------

/**
 * One-way key for a counterparty identifier (bank account, wallet address).
 *
 * Salted with COMPLIANCE_HASH_SALT: an unsalted hash of a 10-digit NUBAN or a
 * phone number is trivially reversible by brute force, so it would not be
 * pseudonymisation in any meaningful sense — and would not be treated as such
 * under NDPA 2023 (NG) or POPIA (ZA).
 *
 * The salt must be stable for the lifetime of the data: rotating it re-keys
 * every counterparty and silently resets fan-out detection, so treat it as a
 * long-lived secret rather than a rotating one.  Missing salt throws rather
 * than falling back to unsalted — a weak hash that looks like protection is
 * worse than an obvious failure.
 */
export function hashCounterparty(identifier: string): string {
  const salt = process.env.COMPLIANCE_HASH_SALT
  if (!salt) {
    throw new Error(
      'COMPLIANCE_HASH_SALT is required to hash counterparty identifiers for the compliance ledger'
    )
  }
  return createHash('sha256')
    .update(`${salt}:${identifier.trim().toLowerCase()}`)
    .digest('hex')
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Clears one user's ledger.  Test helper only. */
export function _clearUserLedger(userId: string): void {
  _ledger.delete(userId)
}

/** Empties the ledger.  Test helper only. */
export function _clearLedger(): void {
  _ledger.clear()
}
