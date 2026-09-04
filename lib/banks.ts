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
  { code: '023', name: 'Citibank Nigeria' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '999992', name: 'OPay' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
]

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
