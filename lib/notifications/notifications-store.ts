import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

export interface NotificationItem {
  id: string
  userId: string
  title: string
  message: string
  category: 'payment' | 'onramp' | 'offramp' | 'price_alert' | 'kyc' | 'system'
  priority: 'low' | 'normal' | 'high'
  isRead: boolean
  createdAt: string
  metadata?: Record<string, unknown>
}

const STORAGE_FILE = path.join(process.cwd(), 'db', 'notifications.json')
/** Keep the JSON file bounded — oldest notifications beyond this are dropped. */
const MAX_STORED = 200

async function ensureStore() {
  await mkdir(path.dirname(STORAGE_FILE), { recursive: true })
}

async function readStore(): Promise<NotificationItem[]> {
  await ensureStore()
  try {
    const raw = await readFile(STORAGE_FILE, 'utf8')
    return JSON.parse(raw) as NotificationItem[]
  } catch {
    return []
  }
}

async function writeStore(items: NotificationItem[]) {
  await ensureStore()
  await writeFile(STORAGE_FILE, JSON.stringify(items.slice(0, MAX_STORED), null, 2), 'utf8')
}

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const items = await readStore()
  return items
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getUnreadCount(userId: string): Promise<number> {
  const items = await readStore()
  return items.filter((item) => item.userId === userId && !item.isRead).length
}

export async function createNotification(input: {
  userId: string
  title: string
  message: string
  category: NotificationItem['category']
  priority?: NotificationItem['priority']
  metadata?: Record<string, unknown>
}): Promise<NotificationItem> {
  const items = await readStore()
  const created: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    title: input.title,
    message: input.message,
    category: input.category,
    priority: input.priority ?? 'normal',
    isRead: false,
    createdAt: new Date().toISOString(),
    metadata: input.metadata ?? {},
  }

  await writeStore([created, ...items])
  return created
}

export async function markNotificationRead(id: string): Promise<NotificationItem | null> {
  const items = await readStore()
  const target = items.find((item) => item.id === id)
  if (!target) return null

  const updated = { ...target, isRead: true }
  await writeStore(items.map((item) => (item.id === id ? updated : item)))
  return updated
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const items = await readStore()
  let count = 0
  const updated = items.map((item) => {
    if (item.userId === userId && !item.isRead) {
      count++
      return { ...item, isRead: true }
    }
    return item
  })
  await writeStore(updated)
  return count
}
