import {
  getBankOptions,
  getWithdrawableAssets,
  getWithdrawalAssetConfig,
  WITHDRAWAL_ASSETS,
  validateWithdrawal,
} from '@/lib/withdraw'
import type { Balance } from '@/lib/api'

function balance(asset: string, available: bigint): Balance {
  return { merchant_id: 'm', asset, available, pending: 0n, updated_at: '' }
}

describe('getWithdrawableAssets', () => {
  it('returns [] for an empty balance array', () => {
    expect(getWithdrawableAssets([])).toEqual([])
  })

  it('excludes assets with a zero available balance', () => {
    const result = getWithdrawableAssets([
      balance('cNGN', 0n),
      balance('cKES', 0n),
      balance('cGHS', 0n),
    ])
    expect(result).toEqual([])
  })

  it.each([
    ['cNGN', 100_000n],
    ['cKES', 100_000n],
    ['cGHS', 100_000n],
  ] as const)('%s uses its configured currency sub-unit precision', (asset, precision) => {
    expect(getWithdrawalAssetConfig(asset).minimumPrecisionStroops).toBe(precision)
  })

  it('excludes non-withdrawable assets even with a positive balance', () => {
    const result = getWithdrawableAssets([
      balance('XLM', 10_000_000_000n),
      balance('USDC', 10_000_000_000n),
    ])
    expect(result).toEqual([])
  })

  it('excludes unknown asset symbols', () => {
    const result = getWithdrawableAssets([balance('DOGE', 10_000_000_000n)])
    expect(result).toEqual([])
  })

  it('returns all three withdrawal assets when all balances are positive', () => {
    const result = getWithdrawableAssets([
      balance('cNGN', 10_000_000_000n),
      balance('cKES', 5_000_000_000n),
      balance('cGHS', 1_000_000_000n),
    ])
    expect([...result].sort()).toEqual([...WITHDRAWAL_ASSETS].sort())
  })

  it('keeps only the withdrawable assets from a mixed balance set', () => {
    const result = getWithdrawableAssets([
      balance('cNGN', 10_000_000_000n),
      balance('XLM', 10_000_000_000n),
      balance('cKES', 0n),
      balance('USDC', 10_000_000_000n),
    ])
    expect(result).toEqual(['cNGN'])
  })
})

describe('getBankOptions', () => {
  it.each([...WITHDRAWAL_ASSETS])('returns a non-empty array for %s', (asset) => {
    const options = getBankOptions(asset)
    expect(Array.isArray(options)).toBe(true)
    expect(options.length).toBeGreaterThan(0)
  })
})

describe('validateWithdrawal', () => {
  const config = getWithdrawalAssetConfig('cNGN')
  const available = 1_000_000_000n
  const validAmount = 500_000_000n
  const validAccount = '0123456789'

  it('accepts a bank from the list the form shows, not only the static one', () => {
    const live = [{ code: '068', name: 'Standard Chartered Bank' }]
    expect(validateWithdrawal(validAmount, config, available, '068', validAccount)).toBe(
      'Choose a valid Nigeria bank.'
    )
    expect(validateWithdrawal(validAmount, config, available, '068', validAccount, live)).toBeNull()
  })

  it.each([null, 0n, -1n])('requires a positive parsed amount (%s)', (amount) => {
    expect(validateWithdrawal(amount, config, available, '044', validAccount)).toBe(
      'Enter an amount to cash out.'
    )
  })

  it('rejects amounts below the configured precision', () => {
    expect(validateWithdrawal(validAmount + 1n, config, available, '044', validAccount)).toBe(
      'Amount must have at most 2 decimal places.'
    )
  })

  it('rejects amounts below the asset minimum', () => {
    expect(validateWithdrawal(100_000n, config, available, '044', validAccount)).toBe(
      'The smallest cash-out is 50 cNGN.'
    )
  })

  it('rejects amounts above the available balance', () => {
    expect(validateWithdrawal(1_000_100_000n, config, available, '044', validAccount)).toBe(
      'That is more than your available balance.'
    )
  })

  it('requires a bank selection', () => {
    expect(validateWithdrawal(validAmount, config, available, '', validAccount)).toBe(
      'Choose your bank.'
    )
  })

  it('rejects a bank code that is not in the asset country bank list', () => {
    expect(validateWithdrawal(validAmount, config, available, '999', validAccount)).toBe(
      'Choose a valid Nigeria bank.'
    )
    expect(
      validateWithdrawal(
        validAmount,
        getWithdrawalAssetConfig('cKES'),
        available,
        '044',
        '1234567890123'
      )
    ).toBe('Choose a valid Kenya bank.')
  })

  it('requires an account number with the configured length', () => {
    expect(validateWithdrawal(validAmount, config, available, '044', '123')).toBe(
      'Nigerian accounts are 10 digits.'
    )
  })

  it('requires a digits-only account number', () => {
    expect(validateWithdrawal(validAmount, config, available, '044', '01234abcde')).toBe(
      'Account number must contain digits only.'
    )
  })

  it('accepts a valid withdrawal', () => {
    expect(validateWithdrawal(validAmount, config, available, '044', validAccount)).toBeNull()
  })
})

describe('country and mobile-money account number rules', () => {
  const fixtures = {
    kenyaBank: ['1234567890123', '12345678901234'],
    ghanaBank: ['1234567890123', '12345678901234', '123456789012345'],
    mobileMoney: ['0712345678', '254712345678'],
  } as const

  const cases = [
    ['cKES', '011', fixtures.kenyaBank[1], null],
    ['cKES', '011', fixtures.kenyaBank[0], 'KCB accounts are 14 digits.'],
    ['cKES', '070', fixtures.kenyaBank[0], null],
    ['cKES', '012', fixtures.kenyaBank[1], null],
    ['cKES', '003', '123456789012', 'Kenyan accounts are 13–14 digits.'],
    ['cKES', 'MPS', fixtures.mobileMoney[0], null],
    ['cKES', 'MPS', fixtures.mobileMoney[1], null],
    ['cKES', 'MPS', '123', 'M-PESA references are 10–12-digit phone numbers.'],
    ['cGHS', '001', fixtures.ghanaBank[0], null],
    ['cGHS', '001', fixtures.ghanaBank[2], null],
    ['cGHS', '001', '1234567890', 'Ghanaian accounts are 13–15 digits.'],
    ['cGHS', 'MTN', fixtures.mobileMoney[0], null],
    ['cGHS', 'MTN', fixtures.mobileMoney[1], null],
    ['cGHS', 'MTN', '123', 'MTN MoMo references are 10–12-digit phone numbers.'],
  ] as const

  it.each(cases)('%s / %s validates %s', (asset, bankCode, accountNumber, expected) => {
    expect(
      validateWithdrawal(
        500_000_000n,
        getWithdrawalAssetConfig(asset),
        1_000_000_000n,
        bankCode,
        accountNumber
      )
    ).toBe(expected)
  })

  it('exposes per-country rules from the bank list', () => {
    expect(getWithdrawalAssetConfig('cKES').accountNumberRule).toMatchObject({
      minLength: 13,
      maxLength: 14,
    })
    expect(getWithdrawalAssetConfig('cGHS').accountNumberRule).toMatchObject({
      minLength: 13,
      maxLength: 15,
    })
  })
})
