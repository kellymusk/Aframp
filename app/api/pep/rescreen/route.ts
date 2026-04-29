import { NextResponse } from 'next/server'
import { runNightlyRescreening } from '@/lib/pep/screening-engine'

/**
 * POST /api/pep/resscreen
 * Nightly cron endpoint — call from Vercel Cron / GitHub Actions.
 * Body: { wallets: Array<{ address: string; fullName: string }>, secret: string }
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    wallets: Array<{ address: string; fullName: string }>
    secret: string
  }

  const env = (typeof process !== 'undefined' ? process : {}) as Record<string, unknown> & { env?: Record<string, string> }
  const cronSecret = env.env?.PEP_CRON_SECRET

  if (cronSecret && body.secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!Array.isArray(body.wallets) || body.wallets.length === 0) {
    return NextResponse.json({ error: 'wallets array required' }, { status: 400 })
  }

  const changes = await runNightlyRescreening(body.wallets)
  return NextResponse.json({ screened: body.wallets.length, statusChanges: changes })
}
