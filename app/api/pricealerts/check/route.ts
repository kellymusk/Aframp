import { NextResponse } from 'next/server'
import { triggerPriceAlertChecks } from '@/lib/price-alerts'

export async function POST() {
  const result = await triggerPriceAlertChecks()
  return NextResponse.json(result)
}
