import { NextRequest, NextResponse } from 'next/server'
import { markNotificationRead } from '@/lib/notifications/notifications-store'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const updated = await markNotificationRead(id)

  if (!updated) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  return NextResponse.json({ notification: updated })
}
