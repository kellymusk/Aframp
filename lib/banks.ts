/**
 * Hardcoded bank / mobile-money lists for the cash-out form, one per country.
 *
 * STOPGAP: the backend has no `/banks` endpoint, so these lists are hardcoded.
 * Paystack exposes the authoritative list at `GET /bank?country=…` and validates
 * the code server-side when creating a transfer recipient — a wrong code here
 * fails the payout rather than misdirecting it, but the lists should be replaced
 * by a proxied live fetch before this goes near real merchants.
 */
export interface Bank {
  code: string
  name: string
}

export type BankCountry = 'Nigeria' | 'Kenya' | 'Ghana'

export const NIGERIA_BANKS: Bank[] = [
  { code: '044', name: 'Access Bank' },
  { code: '565', name: 'Carbon' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '50211', name: 'Kuda Bank' },
  { code: '50515', name: 'Moniepoint MFB' },
  { code: '999992', name: 'OPay' },
  { code: '999991', name: 'PalmPay' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '215', name: 'Unity Bank' },
  { code: '566', name: 'VFD Microfinance Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
]

// No country-agnostic `BANKS` export: codes collide across countries (e.g. '011'
// is First Bank of Nigeria and KCB Bank), so always look up by country/asset.

export const KENYA_BANKS: Bank[] = [
  { code: 'MPS', name: 'M-PESA' },
  { code: '011', name: 'KCB Bank' },
  { code: '070', name: 'Equity Bank' },
  { code: '012', name: 'Co-operative Bank of Kenya' },
  { code: '003', name: 'Absa Bank Kenya' },
  { code: '068', name: 'NCBA Bank' },
  { code: '074', name: 'Stanbic Bank Kenya' },
  { code: '002', name: 'Standard Chartered Kenya' },
  { code: '031', name: 'DTB Kenya' },
  { code: '041', name: 'I&M Bank' },
]

export const GHANA_BANKS: Bank[] = [
  { code: 'MTN', name: 'MTN Mobile Money' },
  { code: 'VOD', name: 'Vodafone Cash' },
  { code: 'ATL', name: 'AirtelTigo Money' },
  { code: '001', name: 'Access Bank Ghana' },
  { code: '002', name: 'Ecobank Ghana' },
  { code: '003', name: 'GCB Bank' },
  { code: '004', name: 'Stanbic Bank Ghana' },
  { code: '005', name: 'Absa Bank Ghana' },
  { code: '006', name: 'Fidelity Bank Ghana' },
  { code: '007', name: 'Zenith Bank Ghana' },
]

export const BANKS_BY_COUNTRY: Record<BankCountry, Bank[]> = {
  Nigeria: NIGERIA_BANKS,
  Kenya: KENYA_BANKS,
  Ghana: GHANA_BANKS,
}

/** Length rules for cash-out account numbers / mobile-money references. */
export interface AccountNumberRule {
  minLength: number
  maxLength: number
  /** User-facing hint, also used in validation errors. */
  description: string
}

/** Default rules for bank accounts in each country in the bank lists above. */
export const ACCOUNT_NUMBER_RULES: Record<BankCountry, AccountNumberRule> = {
  Nigeria: { minLength: 10, maxLength: 10, description: 'Nigerian accounts are 10 digits.' },
  Kenya: { minLength: 13, maxLength: 14, description: 'Kenyan accounts are 13–14 digits.' },
  Ghana: { minLength: 13, maxLength: 15, description: 'Ghanaian accounts are 13–15 digits.' },
}

/** Per-code overrides, keyed by the `code` values of BANKS_BY_COUNTRY.
 * Mobile-money codes use phone-number references, not bank account numbers. */
export const BANK_ACCOUNT_RULES: Record<BankCountry, Record<string, AccountNumberRule>> = {
  Nigeria: {},
  Kenya: {
    '011': { minLength: 14, maxLength: 14, description: 'KCB accounts are 14 digits.' },
    '070': { minLength: 13, maxLength: 13, description: 'Equity accounts are 13 digits.' },
    '012': { minLength: 14, maxLength: 14, description: 'Co-op accounts are 14 digits.' },
    MPS: {
      minLength: 10,
      maxLength: 12,
      description: 'M-PESA references are 10–12-digit phone numbers.',
    },
  },
  Ghana: {
    MTN: {
      minLength: 10,
      maxLength: 12,
      description: 'MTN MoMo references are 10–12-digit phone numbers.',
    },
    VOD: {
      minLength: 10,
      maxLength: 12,
      description: 'Vodafone Cash references are 10–12-digit phone numbers.',
    },
    ATL: {
      minLength: 10,
      maxLength: 12,
      description: 'AirtelTigo Money references are 10–12-digit phone numbers.',
    },
  },
}

/** Rule for the given bank code from the asset country's bank list. */
export function getAccountNumberRule(country: BankCountry, bankCode: string): AccountNumberRule {
  return BANK_ACCOUNT_RULES[country][bankCode] ?? ACCOUNT_NUMBER_RULES[country]
}

/** Country-scoped lookup: bank codes are only unique within a country. */
export function findBankByCode(country: BankCountry, code: string): Bank | undefined {
  return BANKS_BY_COUNTRY[country].find((bank) => bank.code === code)
}
