import { NextRequest } from 'next/server'
import { getNotifications } from '@/lib/notifications/notifications-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/notifications/stream?userId=…
 *
 * Server-Sent Events endpoint. The client receives:
 *   - An immediate "snapshot" event with all current notifications on connect.
 *   - A "ping" heartbeat every 20 s to keep the connection alive through proxies.
 *   - A "update" event whenever new notifications appear (polled every 5 s server-side).
 *
 * The client falls back to REST polling if SSE is unavailable (e.g. HTTP/1.1 proxies
 * that buffer responses). See `useNotifications` hook.
 */
export async function GET(request: NextRequest) {
  const userId = new URL(request.url).searchParams.get('userId')

  if (!userId) {
    return new Response('Missing userId', { status: 400 })
  }

  const encoder = new TextEncoder()

  let lastCount = 0
  let lastIds = new Set<string>()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      // Send initial snapshot immediately
      try {
        const notifications = await getNotifications(userId)
        lastCount = notifications.filter((n) => !n.isRead).length
        lastIds = new Set(notifications.map((n) => n.id))
        send('snapshot', { notifications, unread: lastCount })
      } catch {
        send('error', { message: 'Failed to load notifications' })
      }

      // Heartbeat every 20 s
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(pingInterval)
          clearInterval(pollInterval)
        }
      }, 20_000)

      // Poll for changes every 5 s and push diff to client
      const pollInterval = setInterval(async () => {
        try {
          const notifications = await getNotifications(userId)
          const newUnread = notifications.filter((n) => !n.isRead).length
          const newIds = new Set(notifications.map((n) => n.id))

          const hasNew = notifications.some((n) => !lastIds.has(n.id))
          const unreadChanged = newUnread !== lastCount

          if (hasNew || unreadChanged) {
            lastCount = newUnread
            lastIds = newIds
            send('update', { notifications, unread: newUnread })
          }
        } catch {
          // Store unavailable — skip this tick
        }
      }, 5_000)

      // Clean up when the client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval)
        clearInterval(pollInterval)
        try {
          controller.close()
        } catch {
          // already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable Nginx buffering
    },
  })
}
