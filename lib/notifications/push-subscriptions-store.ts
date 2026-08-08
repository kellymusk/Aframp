/**
 * Push Subscription Store
 *
 * Persists Web Push subscriptions (PushSubscription JSON) keyed by userId.
 * Uses the same JSON-file pattern as notifications-store.ts.
 *
 * In production, replace with a real database table.
 */

import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

export interface StoredPushSubscription {
  userId: string
  /** The serialised PushSubscription from the browser */
  subscription: PushSubscriptionJSON
  createdAt: string
  updatedAt: string
}

const STORAGE_FILE = path.join(process.cwd(), 'db', 'push-subscriptions.json')

async function ensureStore() {
  await mkdir(path.dirname(STORAGE_FILE), { recursive: true })
}

async function readStore(): Promise<StoredPushSubscription[]> {
  await ensureStore()
  try {
    const raw = await readFile(STORAGE_FILE, 'utf8')
    return JSON.parse(raw) as StoredPushSubscription[]
  } catch {
    return []
  }
}

async function writeStore(items: StoredPushSubscription[]) {
  await ensureStore()
  await writeFile(STORAGE_FILE, JSON.stringify(items, null, 2), 'utf8')
}

/** Upsert a subscription for a user. */
export async function saveSubscription(
  userId: string,
  subscription: PushSubscriptionJSON
): Promise<StoredPushSubscription> {
  const items = await readStore()
  const now = new Date().toISOString()

  // A user may have multiple devices; key on the endpoint URL to de-duplicate.
  const existingIndex = items.findIndex(
    (s) => s.userId === userId && s.subscription.endpoint === subscription.endpoint
  )

  const updated: StoredPushSubscription = {
    userId,
    subscription,
    createdAt: existingIndex >= 0 ? items[existingIndex].createdAt : now,
    updatedAt: now,
  }

  if (existingIndex >= 0) {
    items[existingIndex] = updated
  } else {
    items.push(updated)
  }

  await writeStore(items)
  return updated
}

/** Remove a specific subscription endpoint for a user. */
export async function removeSubscription(userId: string, endpoint: string): Promise<boolean> {
  const items = await readStore()
  const before = items.length
  const filtered = items.filter(
    (s) => !(s.userId === userId && s.subscription.endpoint === endpoint)
  )
  if (filtered.length === before) return false
  await writeStore(filtered)
  return true
}

/** Get all subscriptions for a user (one per device). */
export async function getSubscriptionsForUser(
  userId: string
): Promise<StoredPushSubscription[]> {
  const items = await readStore()
  return items.filter((s) => s.userId === userId)
}

/** Get all subscriptions in the store (used when broadcasting to all users). */
export async function getAllSubscriptions(): Promise<StoredPushSubscription[]> {
  return readStore()
}
