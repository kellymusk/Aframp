/**
 * Order store — server-side persistence for in-progress onramp/offramp orders.
 *
 * Storage layer:
 *   As with lib/kyc/withdrawalLimitService.ts, this project has no persistent
 *   database wired up yet.  The store below is an in-memory map shaped to
 *   mirror the SQL table in db/migrations/002_create_orders.sql, so swapping in
 *   Prisma / Drizzle is a one-file change.  Every exported function maps to a
 *   single statement — the equivalent SQL is quoted on each one.
 *
 * Ownership:
 *   Reads and writes are scoped by wallet address.  An order id on its own is
 *   never enough to read or mutate an order, so a leaked or guessed id does not
 *   expose another user's payment details.  Mismatches surface as `null` (not
 *   found) rather than a distinct error, so the API cannot be used to probe
 *   which order ids exist.
 *
 * Retention:
 *   Each wallet keeps at most MAX_ORDERS_PER_WALLET orders; the oldest are
 *   pruned on insert.  In SQL this would instead be a periodic cleanup job.
 */

import { MAX_ORDERS_PER_WALLET, type OrderKind, type StoredOrder } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A row of the `orders` table. */
export interface OrderRecord {
  id: string
  walletAddress: string
  kind: OrderKind
  status: string
  payload: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface SaveOrderInput {
  id: string
  walletAddress: string
  kind: OrderKind
  status: string
  payload: Record<string, unknown>
}

export interface UpdateOrderInput {
  status?: string
  payload?: Record<string, unknown>
}

export interface ListOrdersOptions {
  kind?: OrderKind
  limit?: number
}

// ---------------------------------------------------------------------------
// In-memory store (replace with DB queries in production)
// ---------------------------------------------------------------------------

/**
 * Map<orderId, OrderRecord> — the `orders` table.
 * Exported so tests can seed and inspect state directly.
 */
export const _orderStore = new Map<string, OrderRecord>()

/**
 * Map<walletAddress, orderId[]> — stands in for idx_orders_wallet_created.
 * Ids are kept in insertion order; listing reverses for newest-first.
 */
const _walletIndex = new Map<string, string[]>()

function indexOrder(walletAddress: string, orderId: string): void {
  const ids = _walletIndex.get(walletAddress) ?? []
  if (!ids.includes(orderId)) {
    ids.push(orderId)
    _walletIndex.set(walletAddress, ids)
  }
}

/**
 * Drops the wallet's oldest orders once it exceeds MAX_ORDERS_PER_WALLET, so a
 * single wallet cannot grow the process heap without bound.
 */
function pruneWallet(walletAddress: string): void {
  const ids = _walletIndex.get(walletAddress)
  if (!ids || ids.length <= MAX_ORDERS_PER_WALLET) return

  const excess = ids.splice(0, ids.length - MAX_ORDERS_PER_WALLET)
  for (const id of excess) {
    _orderStore.delete(id)
  }
  _walletIndex.set(walletAddress, ids)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Inserts an order, or updates it if the same wallet already owns that id.
 *
 * Returns `null` when the id exists under a *different* wallet — the caller
 * should treat that as a conflict rather than overwriting.  Re-saving an order
 * the wallet already owns is idempotent (the client retries on flaky networks),
 * and preserves the original createdAt.
 *
 *   INSERT INTO orders (id, wallet_address, kind, status, payload)
 *   VALUES ($1, $2, $3, $4, $5)
 *   ON CONFLICT (id) DO UPDATE
 *     SET status = EXCLUDED.status, payload = EXCLUDED.payload
 *     WHERE orders.wallet_address = EXCLUDED.wallet_address
 *   RETURNING *;
 */
export function saveOrder(input: SaveOrderInput): OrderRecord | null {
  const existing = _orderStore.get(input.id)

  if (existing && existing.walletAddress !== input.walletAddress) {
    return null
  }

  const now = new Date()
  const record: OrderRecord = {
    id: input.id,
    walletAddress: input.walletAddress,
    kind: input.kind,
    status: input.status,
    payload: input.payload,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  _orderStore.set(record.id, record)
  indexOrder(record.walletAddress, record.id)
  pruneWallet(record.walletAddress)

  return record
}

/**
 * Reads a single order, scoped to its owner.  Returns null if the order does
 * not exist or belongs to another wallet.
 *
 *   SELECT * FROM orders WHERE id = $1 AND wallet_address = $2;
 */
export function getOrder(orderId: string, walletAddress: string): OrderRecord | null {
  const record = _orderStore.get(orderId)
  if (!record || record.walletAddress !== walletAddress) return null
  return record
}

/**
 * Lists a wallet's orders, newest first.
 *
 *   SELECT * FROM orders
 *   WHERE  wallet_address = $1
 *     AND  ($2::TEXT IS NULL OR kind = $2)
 *   ORDER  BY created_at DESC
 *   LIMIT  $3;
 */
export function listOrders(
  walletAddress: string,
  { kind, limit = 20 }: ListOrdersOptions = {}
): OrderRecord[] {
  const ids = _walletIndex.get(walletAddress) ?? []

  const records: OrderRecord[] = []
  for (let i = ids.length - 1; i >= 0 && records.length < limit; i--) {
    const record = _orderStore.get(ids[i])
    if (!record) continue
    if (kind && record.kind !== kind) continue
    records.push(record)
  }

  return records
}

/**
 * Applies a partial update to an order the wallet owns.  Returns null if the
 * order does not exist or belongs to another wallet.
 *
 * `payload` is merged rather than replaced so a client that only knows about
 * the status change does not clobber fields written by another tab or device.
 *
 *   UPDATE orders
 *   SET    status = COALESCE($3, status), payload = payload || $4
 *   WHERE  id = $1 AND wallet_address = $2
 *   RETURNING *;
 */
export function updateOrder(
  orderId: string,
  walletAddress: string,
  patch: UpdateOrderInput
): OrderRecord | null {
  const existing = getOrder(orderId, walletAddress)
  if (!existing) return null

  const record: OrderRecord = {
    ...existing,
    status: patch.status ?? existing.status,
    payload: patch.payload ? { ...existing.payload, ...patch.payload } : existing.payload,
    updatedAt: new Date(),
  }

  _orderStore.set(orderId, record)
  return record
}

// ---------------------------------------------------------------------------
// Serialisation
// ---------------------------------------------------------------------------

/** Converts a row into the JSON-safe shape returned by the API. */
export function toStoredOrder(record: OrderRecord): StoredOrder {
  return {
    id: record.id,
    walletAddress: record.walletAddress,
    kind: record.kind,
    status: record.status,
    payload: record.payload,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Clears every order for a wallet.  Test helper only. */
export function _clearWalletOrders(walletAddress: string): void {
  const ids = _walletIndex.get(walletAddress) ?? []
  for (const id of ids) {
    _orderStore.delete(id)
  }
  _walletIndex.delete(walletAddress)
}

/** Empties the store.  Test helper only. */
export function _clearAllOrders(): void {
  _orderStore.clear()
  _walletIndex.clear()
}
