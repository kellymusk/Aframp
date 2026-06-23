import { promises as fs } from 'fs'
import path from 'path'

export type PriceAlertChannel = 'email' | 'push'
export type PriceAlertDirection = 'below' | 'above'

export interface PriceAlertRule {
  id: string
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

const STORE_PATH = path.join(process.cwd(), 'db', 'price-alerts-store.json')
const DEFAULT_STORE: PriceAlertsStore = { rules: [], history: [] }

async function ensureStoreFile() {
  try {
    await fs.access(STORE_PATH)
  } catch {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
    await fs.writeFile(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8')
  }
}

async function readPriceAlertStore(): Promise<PriceAlertsStore> {
  await ensureStoreFile()
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    return JSON.parse(raw) as PriceAlertsStore
  } catch {
    return DEFAULT_STORE
  }
}

async function writePriceAlertStore(store: PriceAlertsStore): Promise<PriceAlertsStore> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8')
  return store
}

const generateId = () => `alert_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

export async function getPriceAlertsStore() {
  const store = await readPriceAlertStore()
  const currentPrice = await getCngnPrice()
  return { ...store, currentPrice }
}

export async function addPriceAlertRule({
  email,
  direction,
  threshold,
  channels,
}: Omit<PriceAlertRule, 'id' | 'asset' | 'createdAt' | 'lastTriggeredAt'>) {
  const store = await readPriceAlertStore()
  const newRule: PriceAlertRule = {
    id: generateId(),
    asset: 'cNGN',
    direction,
    threshold,
    channels,
    email,
    createdAt: Date.now(),
  }

  store.rules.unshift(newRule)
  await writePriceAlertStore(store)
  return newRule
}

export async function triggerPriceAlertChecks() {
  const store = await readPriceAlertStore()
  const currentPrice = await getCngnPrice()
  const events: PriceAlertEvent[] = []
  const now = Date.now()

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
  const directionLabel = rule.direction === 'below' ? 'below' : 'above'
  const subject = `Aframp price alert: cNGN ${directionLabel} ${rule.threshold}`
  const message = `Your cNGN price alert has triggered.

Direction: ${rule.direction}
Threshold: ₦${rule.threshold.toLocaleString()}
Current cNGN price: ₦${currentPrice.toLocaleString()}
Channel: ${channel}

${rule.direction === 'below' ? 'The price has dropped below your configured threshold.' : 'The price has risen above your configured threshold.'}`

  if (channel === 'email') {
    await sendEmailNotification(rule.email, subject, message)
  } else {
    await sendPushNotification(message)
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
  console.warn('Sending price alert email to:', email)
  console.warn('Subject:', subject)
  console.warn(body)
  return Promise.resolve()
}

export async function sendPushNotification(message: string) {
  console.warn('Sending price alert push notification:')
  console.warn(message)
  return Promise.resolve()
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
