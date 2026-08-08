/**
 * Regional availability for mobile money providers.
 *
 * ISO 3166-1 alpha-2 country codes map to the providers available in that country.
 * GH and UG appear in both M-Pesa and MTN MoMo — both options are surfaced.
 */

import { MobileMoneyProviderName } from './types'

export interface MobileMoneyOption {
  provider: MobileMoneyProviderName
  /** Display name shown in the UI */
  label: string
  /** Short description shown below the label */
  description: string
  /** Dial prefix for E.164 phone validation, e.g. "+254" */
  dialPrefix: string
  /** Regex pattern for validating the local number after the prefix */
  phonePattern: string
}

export const MOBILE_MONEY_AVAILABILITY: Record<string, MobileMoneyOption[]> = {
  // ── M-Pesa only ──────────────────────────────────────────────────────────
  KE: [
    {
      provider: 'mpesa',
      label: 'M-Pesa',
      description: 'Pay via M-Pesa STK Push (Safaricom)',
      dialPrefix: '+254',
      phonePattern: '^\\+2547\\d{8}$',
    },
    {
      provider: 'flutterwave',
      label: 'M-Pesa (Flutterwave)',
      description: 'Pay via M-Pesa through Flutterwave collections',
      dialPrefix: '+254',
      phonePattern: '^\\+254\\d{9}$',
    },
  ],
  TZ: [
    {
      provider: 'mpesa',
      label: 'M-Pesa',
      description: 'Pay via M-Pesa (Vodacom Tanzania)',
      dialPrefix: '+255',
      phonePattern: '^\\+2556\\d{8}$',
    },
    {
      provider: 'flutterwave',
      label: 'Mobile Money (Flutterwave)',
      description: 'Pay via mobile money through Flutterwave collections',
      dialPrefix: '+255',
      phonePattern: '^\\+255\\d{9}$',
    },
  ],

  // ── MTN MoMo only ────────────────────────────────────────────────────────
  CM: [
    {
      provider: 'mtn_momo',
      label: 'MTN MoMo',
      description: 'Pay via MTN Mobile Money (Cameroon)',
      dialPrefix: '+237',
      phonePattern: '^\\+237[67]\\d{8}$',
    },
    {
      provider: 'flutterwave',
      label: 'Mobile Money (Flutterwave)',
      description: 'Pay via mobile money through Flutterwave collections',
      dialPrefix: '+237',
      phonePattern: '^\\+237\\d{9}$',
    },
  ],
  CI: [
    {
      provider: 'mtn_momo',
      label: 'MTN MoMo',
      description: "Pay via MTN Mobile Money (Côte d'Ivoire)",
      dialPrefix: '+225',
      phonePattern: '^\\+2250[57]\\d{8}$',
    },
    {
      provider: 'flutterwave',
      label: 'Mobile Money (Flutterwave)',
      description: 'Pay via mobile money through Flutterwave collections',
      dialPrefix: '+225',
      phonePattern: '^\\+225\\d{10}$',
    },
  ],
  RW: [
    {
      provider: 'mtn_momo',
      label: 'MTN MoMo',
      description: 'Pay via MTN Mobile Money (Rwanda)',
      dialPrefix: '+250',
      phonePattern: '^\\+2507[89]\\d{7}$',
    },
    {
      provider: 'flutterwave',
      label: 'Mobile Money (Flutterwave)',
      description: 'Pay via mobile money through Flutterwave collections',
      dialPrefix: '+250',
      phonePattern: '^\\+250\\d{9}$',
    },
  ],
  ZM: [
    {
      provider: 'mtn_momo',
      label: 'MTN MoMo',
      description: 'Pay via MTN Mobile Money (Zambia)',
      dialPrefix: '+260',
      phonePattern: '^\\+26096\\d{7}$',
    },
    {
      provider: 'flutterwave',
      label: 'Mobile Money (Flutterwave)',
      description: 'Pay via mobile money through Flutterwave collections',
      dialPrefix: '+260',
      phonePattern: '^\\+260\\d{9}$',
    },
  ],

  // ── Both providers ───────────────────────────────────────────────────────
  GH: [
    {
      provider: 'mpesa',
      label: 'M-Pesa',
      description: 'Pay via M-Pesa (Vodafone Ghana)',
      dialPrefix: '+233',
      phonePattern: '^\\+2330[25]\\d{7}$',
    },
    {
      provider: 'mtn_momo',
      label: 'MTN MoMo',
      description: 'Pay via MTN Mobile Money (Ghana)',
      dialPrefix: '+233',
      phonePattern: '^\\+2332[45]\\d{7}$',
    },
    {
      provider: 'flutterwave',
      label: 'Mobile Money (Flutterwave)',
      description: 'Pay via MTN/Vodafone/AirtelTigo through Flutterwave collections',
      dialPrefix: '+233',
      phonePattern: '^\\+233\\d{9}$',
    },
  ],
  UG: [
    {
      provider: 'mpesa',
      label: 'M-Pesa',
      description: 'Pay via M-Pesa (Vodacom Uganda)',
      dialPrefix: '+256',
      phonePattern: '^\\+25670\\d{7}$',
    },
    {
      provider: 'mtn_momo',
      label: 'MTN MoMo',
      description: 'Pay via MTN Mobile Money (Uganda)',
      dialPrefix: '+256',
      phonePattern: '^\\+2567[67]\\d{7}$',
    },
    {
      provider: 'flutterwave',
      label: 'Mobile Money (Flutterwave)',
      description: 'Pay via mobile money through Flutterwave collections',
      dialPrefix: '+256',
      phonePattern: '^\\+256\\d{9}$',
    },
  ],
}

/**
 * Returns the mobile money options available for a given ISO country code.
 * Returns an empty array for countries with no mobile money support.
 */
export function getMobileMoneyOptions(countryCode: string): MobileMoneyOption[] {
  return MOBILE_MONEY_AVAILABILITY[countryCode.toUpperCase()] ?? []
}
