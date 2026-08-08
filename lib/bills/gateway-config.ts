import type { PaymentGateway } from './payment-gateway'

/**
 * Default payment gateway per country across Aframp's 12-country target
 * market. Paystack covers Nigeria and Egypt; Flutterwave's broader mobile
 * money and card coverage handles the rest.
 */
export const COUNTRY_GATEWAY_MAP: Record<string, PaymentGateway> = {
  NG: 'paystack',
  EG: 'paystack',
  GH: 'flutterwave',
  KE: 'flutterwave',
  UG: 'flutterwave',
  TZ: 'flutterwave',
  RW: 'flutterwave',
  ZM: 'flutterwave',
  ZA: 'flutterwave',
  CM: 'flutterwave',
  CI: 'flutterwave',
  SN: 'flutterwave',
}

function isPaymentGateway(value: string | undefined): value is PaymentGateway {
  return value === 'paystack' || value === 'flutterwave'
}

/**
 * Resolve which gateway to use, in priority order:
 *   1. an explicit gateway passed by the caller
 *   2. the target country's default (COUNTRY_GATEWAY_MAP)
 *   3. the PAYMENT_GATEWAY env var
 *   4. 'paystack'
 */
export function resolveGateway(explicitGateway?: PaymentGateway, countryCode?: string): PaymentGateway {
  if (explicitGateway) return explicitGateway

  if (countryCode) {
    const countryDefault = COUNTRY_GATEWAY_MAP[countryCode.toUpperCase()]
    if (countryDefault) return countryDefault
  }

  if (isPaymentGateway(process.env.PAYMENT_GATEWAY)) {
    return process.env.PAYMENT_GATEWAY
  }

  return 'paystack'
}
