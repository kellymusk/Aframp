import { Redis } from '@upstash/redis'

export type PriceAlertChannel = 'email' | 'push'
export type PriceAlertDirection = 'below' | 'above'

export interface PriceAlertRule {
  id: string
  userId?: string
  asset: 'cNGN'
  direction: PriceAlertDirection
  threshold: number
  channels: {
    email: boolean
    push: boolean
  }
  email: string
  createdAt: number
  lastTriggeredAt?: number
}

export interface PriceAlertEvent {
  id: string
  ruleId: string
  asset: 'cNGN'
  direction: PriceAlertDirection
  threshold: number
  actualValue: number
  channel: PriceAlertChannel
  notifiedAt: number
  message: string
}

export interface PriceAlertsStore {
  rules: PriceAlertRule[]
  history: PriceAlertEvent[]
}

const STORE_KEY = 'aframp:price-alerts-store'
const DEFAULT_STORE: PriceAlertsStore = { rules: [], history: [] }

let redisClient: Redis | null = null

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return redisClient
}

async function readPriceAlertStore(): Promise<PriceAlertsStore> {
  const stored = await getRedisClient().get<PriceAlertsStore>(STORE_KEY)
  return stored ?? DEFAULT_STORE
}

async function writePriceAlertStore(store: PriceAlertsStore): Promise<PriceAlertsStore> {
  await getRedisClient().set(STORE_KEY, store)
  return store
}

async function readStore(): Promise<PriceAlertsStore> {
  if (hasDatabase && db) {
    const [rules, history] = await Promise.all([
      db.select().from(priceAlertRules),
      db.select().from(priceAlertEvents).orderBy(desc(priceAlertEvents.notifiedAt)).limit(100),
    ])
    return { rules: rules.map(rowToRule), history: history.map(rowToEvent) }
  }
  return readPriceAlertStore()
}

export async function getPriceAlertsStore() {
  const store = await readStore()
  const currentPrice = await getCngnPrice()
  return { ...store, currentPrice }
}

export async function addPriceAlertRule({
  email,
  direction,
  threshold,
  channels,
  userId,
}: Omit<PriceAlertRule, 'id' | 'asset' | 'createdAt' | 'lastTriggeredAt'>) {
  const newRule: PriceAlertRule = {
    id: generateId(),
    asset: 'cNGN',
    direction,
    threshold,
    channels,
    email,
    userId,
    createdAt: Date.now(),
  }

  if (hasDatabase && db) {
    await db.insert(priceAlertRules).values(ruleToRow(newRule))
    return newRule
  }

  const store = await readPriceAlertStore()
  store.rules.unshift(newRule)
  await writePriceAlertStore(store)
  return newRule
}

export async function triggerPriceAlertChecks() {
  const currentPrice = await getCngnPrice()
  const now = Date.now()

  if (hasDatabase && db) {
    const rules = (await db.select().from(priceAlertRules)).map(rowToRule)
    const events: PriceAlertEvent[] = []

    for (const rule of rules) {
      const meetsThreshold =
        rule.direction === 'below' ? currentPrice < rule.threshold : currentPrice > rule.threshold
      if (!meetsThreshold) continue

      const wasRecentlyTriggered = rule.lastTriggeredAt && now - rule.lastTriggeredAt < 60 * 60 * 1000
      if (wasRecentlyTriggered) continue

      if (rule.channels.email) events.push(await notifyAlert(rule, 'email', currentPrice))
      if (rule.channels.push) events.push(await notifyAlert(rule, 'push', currentPrice))

      await db
        .update(priceAlertRules)
        .set({ lastTriggeredAt: new Date(now) })
        .where(eq(priceAlertRules.id, rule.id))
    }

    if (events.length > 0) {
      await db.insert(priceAlertEvents).values(
        events.map((event) => ({
          id: event.id,
          ruleId: event.ruleId,
          asset: event.asset,
          direction: event.direction,
          threshold: String(event.threshold),
          actualValue: String(event.actualValue),
          channel: event.channel,
          message: event.message,
        }))
      )
    }

    const store = await readStore()
    return { currentPrice, events, rules: store.rules, history: store.history }
  }

  const store = await readPriceAlertStore()
  const events: PriceAlertEvent[] = []

  for (const rule of store.rules) {
    const meetsThreshold =
      rule.direction === 'below'
        ? currentPrice < rule.threshold
        : currentPrice > rule.threshold

    if (!meetsThreshold) {
      continue
    }

    const wasRecentlyTriggered = rule.lastTriggeredAt && now - rule.lastTriggeredAt < 60 * 60 * 1000
    if (wasRecentlyTriggered) {
      continue
    }

    if (rule.channels.email) {
      const event = await notifyAlert(rule, 'email', currentPrice)
      events.push(event)
      store.history.unshift(event)
    }

    if (rule.channels.push) {
      const event = await notifyAlert(rule, 'push', currentPrice)
      events.push(event)
      store.history.unshift(event)
    }

    rule.lastTriggeredAt = now
  }

  // Keep history manageable
  store.history = store.history.slice(0, 100)
  await writePriceAlertStore(store)

  return { currentPrice, events, rules: store.rules, history: store.history }
}

async function notifyAlert(rule: PriceAlertRule, channel: PriceAlertChannel, currentPrice: number) {
  const message = `Your cNGN price alert has triggered. Direction: ${rule.direction}, Threshold: ₦${rule.threshold.toLocaleString()}, Current price: ₦${currentPrice.toLocaleString()}`

  if (channel === 'email') {
    await sendPriceAlertEmail({
      to: rule.email,
      asset: rule.asset,
      direction: rule.direction,
      threshold: rule.threshold,
      actualValue: currentPrice,
    })
  } else {
    // Pass userId so push is targeted to this user's devices only
    const userId = (rule as PriceAlertRule & { userId?: string }).userId
    await sendPushNotification(message, userId)
  }

  return {
    id: generateId(),
    ruleId: rule.id,
    asset: rule.asset,
    direction: rule.direction,
    threshold: rule.threshold,
    actualValue: currentPrice,
    channel,
    notifiedAt: Date.now(),
    message,
  }
}

export async function sendEmailNotification(email: string, subject: string, body: string) {
  // subject and body are kept as params for back-compat with any direct callers,
  // but the Resend template is built from the rule fields passed via notifyAlert.
  // We forward them as a plain-text fallback via the generic sendEmail helper if
  // needed; for now the typed sendPriceAlertEmail helper does the work.
  void subject
  void body
  // Actual sending is delegated to notifyAlert which calls sendPriceAlertEmail directly.
  // This wrapper exists only for backward-compatibility.
}

export async function sendPushNotification(message: string) {
  // TODO: integrate a push notification provider (e.g. web push / Firebase)
  console.warn('[price-alerts] Push notification pending integration:', message.slice(0, 80))
/**
 * Send a Web Push notification to all subscribed devices for the user
 * whose price alert was triggered.
 *
 * Falls back to a console warning when VAPID keys are not configured (e.g.
 * in local development without push credentials).
 */
export async function sendPushNotification(
  message: string,
  /** Optional userId to target a specific user's subscriptions. */
  userId?: string
): Promise<void> {
  // Guard: if VAPID keys are missing, log and return gracefully
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    console.warn('[price-alerts] VAPID keys not configured — skipping push notification')
    console.warn('[price-alerts] Message:', message)
    return
  }

  try {
    const { getAllSubscriptions, removeSubscription } = await import(
      './notifications/push-subscriptions-store'
    )
    const { sendToSubscription } = await import('./notifications/push-sender')

    let subscriptions = await getAllSubscriptions()

    // If a userId is provided, filter to that user's subscriptions only
    if (userId) {
      subscriptions = subscriptions.filter((s) => s.userId === userId)
    }

    if (subscriptions.length === 0) {
      console.warn('[price-alerts] No push subscriptions found')
      return
    }

    const payload = {
      title: 'Aframp Price Alert',
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'price-alert',
      url: '/pricealert',
    }

    await Promise.allSettled(
      subscriptions.map(async (stored) => {
        try {
          const result = await sendToSubscription(stored.subscription, payload)
          if (result.gone) {
            await removeSubscription(stored.userId, stored.subscription.endpoint!)
          }
        } catch (err) {
          console.error('[price-alerts] Push delivery failed for user', stored.userId, err)
        }
      })
    )
  } catch (err) {
    console.error('[price-alerts] sendPushNotification error', err)
  }
}

async function getCngnPrice() {
  if (process.env.CNGN_ALERT_PRICE) {
    const value = Number(process.env.CNGN_ALERT_PRICE)
    if (!Number.isNaN(value)) {
      return value
    }
  }

  // Simulate a live cNGN feed with mild volatility around ₦1,120.
  const basePrice = 1120
  const swing = Math.cos(Date.now() / 90_000) * 260
  return Math.round(basePrice + swing)
}
