/**
 * Single import point for mobile money payments.
 * Callers should never import from mpesa.ts or mtn-momo.ts directly.
 */

export type {
  MobileMoneyProvider,
  MobileMoneyProviderName,
  PaymentParams,
  PaymentResult,
  PaymentStatus,
} from './types'
export { MobileMoneyError } from './types'
export { getMobileMoneyOptions, MOBILE_MONEY_AVAILABILITY } from './regions'
export type { MobileMoneyOption } from './regions'

import { mpesaProvider } from './mpesa'
import { mtnMomoProvider } from './mtn-momo'
import { flutterwaveProvider } from './flutterwave'
import type { MobileMoneyProvider, MobileMoneyProviderName } from './types'

const providers: Record<MobileMoneyProviderName, MobileMoneyProvider> = {
  mpesa: mpesaProvider,
  mtn_momo: mtnMomoProvider,
  flutterwave: flutterwaveProvider,
}

/**
 * Retrieve a provider instance by name.
 * Throws if the provider name is unknown.
 */
export function getProvider(name: MobileMoneyProviderName): MobileMoneyProvider {
  const provider = providers[name]
  if (!provider) {
    throw new Error(`Unknown mobile money provider: ${name}`)
  }
  return provider
}
