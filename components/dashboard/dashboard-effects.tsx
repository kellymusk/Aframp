'use client'

/**
 * DashboardEffects — mounts side-effects that need to run while the user
 * is inside the dashboard, without cluttering DashboardLayout's JSX.
 *
 * Currently activates:
 *  - Stellar Horizon payment stream → pushes "payment received" notifications
 */

import { useStellarPaymentStream } from '@/hooks/use-stellar-payment-stream'

interface Props {
  walletAddress?: string
}

export function DashboardEffects({ walletAddress }: Props) {
  useStellarPaymentStream(walletAddress ?? null)
  return null
}
