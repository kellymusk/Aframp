import { NextResponse } from 'next/server'
import { addPriceAlertRule, getPriceAlertsStore } from '@/lib/price-alerts'

export async function GET() {
  const store = await getPriceAlertsStore()
  return NextResponse.json(store)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, direction, threshold, channels } = body

    if (!email || !direction || typeof threshold !== 'number' || !channels) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (threshold <= 0) {
      return NextResponse.json({ error: 'Threshold must be greater than zero' }, { status: 400 })
    }

    if (!channels.email && !channels.push) {
      return NextResponse.json({ error: 'At least one notification channel must be enabled' }, { status: 400 })
    }

    const rule = await addPriceAlertRule({
      email,
      direction,
      threshold,
      channels,
    })

    return NextResponse.json({ rule })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create price alert rule'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
