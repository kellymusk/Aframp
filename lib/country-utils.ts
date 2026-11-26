/**
 * Country-specific utilities for locale inference and pricing.
 * Handles BCP-47 locale parsing correctly, including script subtags.
 */

import { type ClassValue, clsx } from 'clsx'

/**
 * Country codes supported for Aframp operations.
 */
export type CountryCode = 'NG' | 'KE' | 'GH' | 'ZA' | 'TZ' | 'UG' | 'ET' | 'GH' | 'SN' | 'CI' | 'CM' | 'MA'

/**
 * Country pricing configuration with per-country fee data.
 * Fee percentages are illustrative placeholders pending sign-off from
 * the payments team on real merchant rates per corridor — do not treat
 * as final pricing.
 */
export interface CountryPricingConfig {
  code: CountryCode
  name: string
  /** Country codes that map to this pricing (region codes from locale) */
  localeRegions: string[]
  /** Platform fee percentage (illustrative) */
  feePercentage: number
  /** Local currency symbol */
  currencySymbol: string
}

/**
 * Country-specific fee schedule for the pricing section.
 *
 * Figures are illustrative placeholders pending sign-off from the payments
 * team on real merchant rates per corridor — do not treat as final pricing.
 */
export const countryPricing: CountryPricingConfig[] = [
  {
    code: 'NG',
    name: 'Nigeria',
    localeRegions: ['NG', 'NI'],
    feePercentage: 1.5,
    currencySymbol: '₦',
  },
  {
    code: 'KE',
    name: 'Kenya',
    localeRegions: ['KE'],
    feePercentage: 0.5,
    currencySymbol: 'KSh',
  },
  {
    code: 'GH',
    name: 'Ghana',
    localeRegions: ['GH'],
    feePercentage: 1.0,
    currencySymbol: '₵',
  },
  {
    code: 'ZA',
    name: 'South Africa',
    localeRegions: ['ZA'],
    feePercentage: 1.25,
    currencySymbol: 'R',
  },
  {
    code: 'TZ',
    name: 'Tanzania',
    localeRegions: ['TZ'],
    feePercentage: 1.0,
    currencySymbol: 'TSh',
  },
  {
    code: 'UG',
    name: 'Uganda',
    localeRegions: ['UG'],
    feePercentage: 1.0,
    currencySymbol: 'USh',
  },
]

/**
 * Infer country code from browser locale(s).
 *
 * Handles BCP-47 locale format correctly:
 * - Simple: "en-KE" -> region is "KE"
 * - With script: "en-Latn-KE" -> region is "KE" (not "Latn")
 * - With variant: "de-DE-1996" -> region is "DE"
 *
 * Falls back to Nigeria if no match is found.
 */
export function inferCountryFromLocale(locales: string | string[]): CountryPricingConfig {
  if (!Array.isArray(locales)) {
    locales = [locales]
  }

  for (const locale of locales) {
    // Parse BCP-47 locale correctly
    // Format: language-Script-Region-Variant (e.g., en-Latn-KE, de-DE-1996)
    // The region is always the last segment that looks like a 2-letter code
    const parts = locale.split('-')

    // Find the region: it's a 2-letter uppercase segment
    // Skip any script tag (4 letters like Latn, Cyrl) and find the country code
    let region: string | undefined

    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i]
      // Region codes are 2 letters and all uppercase
      if (part.length === 2 && /^[A-Z]{2}$/.test(part)) {
        region = part
        break
      }
    }

    if (!region) continue

    const match = countryPricing.find((c) => c.localeRegions.includes(region!))
    if (match) return match
  }

  // Default to Nigeria if no locale matches
  return countryPricing.find((c) => c.code === 'NG')!
}

/**
 * Get country pricing by country code.
 */
export function getCountryPricing(code: CountryCode): CountryPricingConfig | undefined {
  return countryPricing.find((c) => c.code === code)
}

/**
 * Get the default country pricing (Nigeria).
 */
export function getDefaultCountryPricing(): CountryPricingConfig {
  return countryPricing.find((c) => c.code === 'NG')!
}

/**
 * Format a fee percentage for display.
 */
export function formatFeePercentage(percentage: number): string {
  return `${percentage}%`
}

/**
 * Utility to combine class names (re-export from clsx).
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}