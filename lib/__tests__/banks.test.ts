import * as bankModule from '@/lib/banks'
import {
  BANKS_BY_COUNTRY,
  GHANA_BANKS,
  KENYA_BANKS,
  NIGERIA_BANKS,
  findBankByCode,
} from '@/lib/banks'

describe('banks', () => {
  it('exposes a Nigerian bank list for cNGN cash-outs without a country-agnostic alias', () => {
    expect(NIGERIA_BANKS.length).toBeGreaterThan(0)
    expect(bankModule).not.toHaveProperty('BANKS')
    expect(NIGERIA_BANKS[0]).toEqual({ code: '044', name: 'Access Bank' })
    expect(NIGERIA_BANKS.some((b) => b.name === 'Kuda Bank' && b.code === '50211')).toBe(true)
    expect(NIGERIA_BANKS.some((b) => b.name === 'Moniepoint MFB' && b.code === '50515')).toBe(true)
    expect(NIGERIA_BANKS.some((b) => b.name === 'PalmPay' && b.code === '999991')).toBe(true)
    expect(NIGERIA_BANKS.some((b) => b.name === 'VFD Microfinance Bank' && b.code === '566')).toBe(
      true
    )
    expect(NIGERIA_BANKS.some((b) => b.name === 'Carbon' && b.code === '565')).toBe(true)
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

  it('resolves colliding bank codes by country, never as a Nigerian bank', () => {
    expect(findBankByCode('Kenya', '011')?.name).toBe('KCB Bank')
    expect(findBankByCode('Kenya', '070')?.name).toBe('Equity Bank')
    expect(findBankByCode('Ghana', '003')?.name).toBe('GCB Bank')
    expect(findBankByCode('Nigeria', '011')?.name).toBe('First Bank of Nigeria')
    expect(KENYA_BANKS.find((bank) => bank.code === '011')?.name).not.toBe(
      NIGERIA_BANKS.find((bank) => bank.code === '011')?.name
    )
    expect(GHANA_BANKS.find((bank) => bank.code === '002')?.name).not.toBe(
      NIGERIA_BANKS.find((bank) => bank.code === '002')?.name
    )
  })
})
