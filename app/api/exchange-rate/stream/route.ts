import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,stellar,tether&vs_currencies=ngn,kes,ghs,zar,ugx'

// Binance WebSocket symbols we care about for sparkline / tick data
// We poll CoinGecko every 10 s (free tier) and push via SSE.
const POLL_INTERVAL_MS = 10_000
const PING_INTERVAL_MS = 20_000

type RatePayload = {
  'usd-coin': Record<string, number>
  stellar: Record<string, number>
  tether: Record<string, number>
  timestamp: number
}

async function fetchRates(): Promise<RatePayload | null> {
  try {
    const res = await fetch(COINGECKO_URL, {
      headers: { 'User-Agent': 'Aframp/1.0', Accept: 'application/json' },
      // no Next.js cache — we want fresh data every time
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return { ...data, timestamp: Date.now() }
  } catch {
    return null
  }
}

/**
 * GET /api/exchange-rate/stream
 *
 * Server-Sent Events endpoint that pushes exchange-rate updates to the client.
 *
 * Events:
 *   - "snapshot"  initial rates on connect
 *   - "update"    fresh rates every ~10 s when data changes
 *   - "error"     when the upstream fetch fails (client should use cached data)
 *   - ": ping"    keepalive comment every 20 s
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false

      function send(event: string, data: unknown) {
        if (closed) return
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        } catch {
          // controller already closed
        }
      }

      // Send initial snapshot immediately
      const initial = await fetchRates()
      if (initial) {
        send('snapshot', initial)
      } else {
        send('error', { message: 'Initial rate fetch failed' })
      }

      let lastPayload = initial ? JSON.stringify(initial) : ''

      // Ping to keep connection alive through proxies
      const pingInterval = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(pingInterval)
          clearInterval(pollInterval)
        }
      }, PING_INTERVAL_MS)

      // Poll upstream and push only when data changes
      const pollInterval = setInterval(async () => {
        if (closed) return
        const payload = await fetchRates()
        if (!payload) {
          send('error', { message: 'Rate refresh failed' })
          return
        }
        const serialised = JSON.stringify(payload)
        if (serialised !== lastPayload) {
          lastPayload = serialised
          send('update', payload)
        }
      }, POLL_INTERVAL_MS)

      request.signal.addEventListener('abort', () => {
        closed = true
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
      'X-Accel-Buffering': 'no',
    },
  })
}
