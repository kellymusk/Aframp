import { BANKS_BY_COUNTRY, GHANA_BANKS, KENYA_BANKS, NIGERIA_BANKS } from '@/lib/banks'

describe('banks', () => {
  it('exposes a Nigerian bank list for cNGN cash-outs', () => {
    expect(NIGERIA_BANKS.length).toBeGreaterThan(0)
    expect(NIGERIA_BANKS[0]).toEqual({ code: '044', name: 'Access Bank' })
  })

  it('exposes a Kenyan bank / mobile-money list', () => {
    expect(KENYA_BANKS.length).toBeGreaterThan(0)
    expect(KENYA_BANKS.some((bank) => bank.name === 'M-PESA')).toBe(true)
  })

  it('exposes a Ghanaian bank / mobile-money list', () => {
    expect(GHANA_BANKS.length).toBeGreaterThan(0)
    expect(GHANA_BANKS.some((bank) => bank.name === 'MTN Mobile Money')).toBe(true)
  })

  it('keys the country lookup by country', () => {
    expect(BANKS_BY_COUNTRY.Nigeria).toBe(NIGERIA_BANKS)
    expect(BANKS_BY_COUNTRY.Kenya).toBe(KENYA_BANKS)
    expect(BANKS_BY_COUNTRY.Ghana).toBe(GHANA_BANKS)
  })
})
