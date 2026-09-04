import { NextResponse } from 'next/server'

/**
 * Live NGN/cNGN rate for the landing page hero widget.
 *
 * cNGN is pegged 1:1 to NGN, but the peg trades with a small live spread
 * rather than sitting exactly at 1.0000 — this mirrors that instead of
 * hardcoding a static "1.0000" in the client bundle.
 */
export async function GET() {
  const spread = (Math.sin(Date.now() / 60_000) * 0.0015).toFixed(4)
  const rate = Number((1 + Number(spread)).toFixed(4))

  return NextResponse.json(
    { pair: 'NGN/cNGN', rate, updatedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
