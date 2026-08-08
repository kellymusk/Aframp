import {
  NIGERIAN_BANKS,
  findStaticBank,
  getBankList,
  getStaticBanks,
  normalizePaystackBanks,
} from '@/lib/offramp/bank-directory'

describe('normalizePaystackBanks', () => {
  it('maps Paystack rows onto the Bank shape', () => {
    const banks = normalizePaystackBanks(
      [{ name: 'Ecobank Ghana', code: '130100', type: 'ghipss', active: true }],
      'GH'
    )

    expect(banks).toEqual([
      { id: 'gh-130100', name: 'Ecobank Ghana', code: '130100', type: 'bank', country: 'GH' },
    ])
  })

  it('flags mobile money wallets so the picker can label them', () => {
    const banks = normalizePaystackBanks(
      [{ name: 'MTN Mobile Money', code: 'MTN', type: 'mobile_money' }],
      'GH'
    )

    expect(banks[0].type).toBe('mobile_money')
  })

  it('drops rows that cannot route a payout', () => {
    const banks = normalizePaystackBanks(
      [
        { name: 'No Code Bank' },
        { code: '001' },
        { name: 'Closed Bank', code: '002', active: false },
        { name: 'Good Bank', code: '003' },
      ],
      'KE'
    )

    expect(banks.map((bank) => bank.name)).toEqual(['Good Bank'])
  })

  it('de-duplicates codes Paystack lists more than once', () => {
    const banks = normalizePaystackBanks(
      [
        { name: 'Absa Bank Kenya', code: '03' },
        { name: 'Absa Bank Kenya (USD)', code: '03' },
      ],
      'KE'
    )

    expect(banks).toHaveLength(1)
  })

  it('sorts alphabetically so a long list is scannable', () => {
    const banks = normalizePaystackBanks(
      [
        { name: 'Zenith Bank', code: '057' },
        { name: 'Access Bank', code: '044' },
      ],
      'NG'
    )

    expect(banks.map((bank) => bank.name)).toEqual(['Access Bank', 'Zenith Bank'])
  })
})

describe('static bank lists', () => {
  it('only ships a fallback where the codes are verified', () => {
    // Guessed bank codes route money to the wrong institution — better to have
    // no list and ask the customer for the bank name. See the module comment.
    expect(getStaticBanks('NG')).toBe(NIGERIAN_BANKS)
    expect(getStaticBanks('GH')).toEqual([])
    expect(getStaticBanks('KE')).toEqual([])
    expect(getStaticBanks('ZA')).toEqual([])
    expect(getStaticBanks('UG')).toEqual([])
  })

  it('tags every static Nigerian bank with its country', () => {
    expect(NIGERIAN_BANKS.every((bank) => bank.country === 'NG')).toBe(true)
  })

  it('recovers a bank from the static list by code', () => {
    expect(findStaticBank('NG', '044')?.name).toBe('Access Bank')
    expect(findStaticBank('NG', 'nope')).toBeUndefined()
    expect(findStaticBank('KE', '03')).toBeUndefined()
  })
})

describe('getBankList without a gateway key', () => {
  const originalKey = process.env.PAYSTACK_SECRET_KEY

  beforeEach(() => {
    delete process.env.PAYSTACK_SECRET_KEY
  })

  afterAll(() => {
    if (originalKey === undefined) delete process.env.PAYSTACK_SECRET_KEY
    else process.env.PAYSTACK_SECRET_KEY = originalKey
  })

  it('falls back to the static list for Nigeria', async () => {
    const result = await getBankList('NG')

    expect(result.source).toBe('static')
    expect(result.currency).toBe('NGN')
    expect(result.banks).toBe(NIGERIAN_BANKS)
  })

  it('reports the list as unavailable where there is no fallback', async () => {
    const result = await getBankList('KE')

    expect(result.source).toBe('unavailable')
    expect(result.currency).toBe('KES')
    expect(result.banks).toEqual([])
  })

  it('never calls Paystack for a country with no directory', async () => {
    const result = await getBankList('UG')

    expect(result.source).toBe('unavailable')
    expect(result.currency).toBe('UGX')
  })
})
