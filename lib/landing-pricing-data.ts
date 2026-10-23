/**
 * Country-specific fee schedule for the pricing section.
 *
 * Figures are illustrative placeholders pending sign-off from the payments
 * team on real merchant rates per corridor — do not treat as final pricing.
 */

export type CountryCode = 'NG' | 'KE' | 'GH' | 'ZA' | 'UG'

export type FeeRow = {
  method: string
  fee: string
  note?: string
}

export type CountryPricing = {
  code: CountryCode
  name: string
  currency: string
  /** BCP-47 region subtags that should default the dropdown to this country. */
  localeRegions: string[]
  rows: FeeRow[]
}

export const countryPricing: CountryPricing[] = [
  {
    code: 'NG',
    name: 'Nigeria',
    currency: 'NGN',
    localeRegions: ['NG'],
    rows: [
      { method: 'Bank Transfer', fee: '0%', note: 'Instant, via NIBSS' },
      { method: 'Card', fee: '1.5%' },
      { method: 'Mobile Money', fee: '0.5%' },
    ],
  },
  {
    code: 'KE',
    name: 'Kenya',
    currency: 'KES',
    localeRegions: ['KE'],
    rows: [
      { method: 'Bank Transfer', fee: '0.5%' },
      { method: 'Card', fee: '1.8%' },
      { method: 'Mobile Money', fee: '0.3%', note: 'M-Pesa' },
    ],
  },
  {
    code: 'GH',
    name: 'Ghana',
    currency: 'GHS',
    localeRegions: ['GH'],
    rows: [
      { method: 'Bank Transfer', fee: '0.5%' },
      { method: 'Card', fee: '1.8%' },
      { method: 'Mobile Money', fee: '0.4%', note: 'MTN MoMo, AirtelTigo' },
    ],
  },
  {
    code: 'ZA',
    name: 'South Africa',
    currency: 'ZAR',
    localeRegions: ['ZA'],
    rows: [
      { method: 'Bank Transfer', fee: '0.3%', note: 'EFT' },
      { method: 'Card', fee: '1.6%' },
      { method: 'Mobile Money', fee: '1.0%' },
    ],
  },
  {
    code: 'UG',
    name: 'Uganda',
    currency: 'UGX',
    localeRegions: ['UG'],
    rows: [
      { method: 'Bank Transfer', fee: '0.6%' },
      { method: 'Card', fee: '2.0%' },
      { method: 'Mobile Money', fee: '0.4%', note: 'MTN, Airtel' },
    ],
  },
]

const DEFAULT_COUNTRY: CountryCode = 'NG'

/**
 * Infers a default country from the browser's locale (e.g. `en-KE` → `KE`).
 * Falls back to Nigeria when the locale doesn't map to a supported country
 * or when called outside the browser (SSR).
 */
export function inferCountryFromLocale(
  locales: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages : []
): CountryCode {
  for (const locale of locales) {
    const region = locale.split('-')[1]?.toUpperCase()
    if (!region) continue
    const match = countryPricing.find((c) => c.localeRegions.includes(region))
    if (match) return match.code
  }
  return DEFAULT_COUNTRY
}
