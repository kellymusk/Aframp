import { NextRequest, NextResponse } from 'next/server'
import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
} from '@/lib/notifications/notifications-store'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const countOnly = searchParams.get('countOnly') === 'true'

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  if (countOnly) {
    const unread = await getUnreadCount(userId)
    return NextResponse.json({ unread })
  }

  const notifications = await getNotifications(userId)
  const unread = notifications.filter((n) => !n.isRead).length
  return NextResponse.json({ notifications, unread })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.userId || !body.title || !body.message || !body.category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const notification = await createNotification({
    userId: body.userId,
    title: body.title,
    message: body.message,
    category: body.category,
    priority: body.priority,
    metadata: body.metadata,
  })

  return NextResponse.json({ notification }, { status: 201 })
}

/** PATCH /api/notifications?userId=… — mark all as read */
export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const count = await markAllNotificationsRead(userId)
  return NextResponse.json({ markedRead: count })
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}
