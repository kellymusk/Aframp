import { validateAmount, isValidStellarAddress } from '../validation'

describe('Amount Validation', () => {
  describe('NGN validation', () => {
    it('validates minimum amount (₦1,000)', () => {
      expect(validateAmount(999, 'NGN')).toContain('Minimum')
      expect(validateAmount(1000, 'NGN')).toBe('')
      expect(validateAmount(1001, 'NGN')).toBe('')
    })

    it('validates maximum amount (₦500,000)', () => {
      expect(validateAmount(500000, 'NGN')).toBe('')
      expect(validateAmount(500001, 'NGN')).toContain('Maximum')
    })

    it('rejects zero and negative amounts', () => {
      expect(validateAmount(0, 'NGN')).toContain('Enter an amount')
      expect(validateAmount(-100, 'NGN')).toContain('Enter an amount')
    })
  })

  describe('Other currencies', () => {
    it('validates KES limits', () => {
      expect(validateAmount(99, 'KES')).toContain('Minimum')
      expect(validateAmount(100, 'KES')).toBe('')
      expect(validateAmount(50000, 'KES')).toBe('')
      expect(validateAmount(50001, 'KES')).toContain('Maximum')
    })

    it('validates GHS limits', () => {
      expect(validateAmount(9, 'GHS')).toContain('Minimum')
      expect(validateAmount(10, 'GHS')).toBe('')
    })
  })
})

describe('Wallet Address Validation', () => {
  it('validates correct Stellar addresses (56 chars, starts with G)', () => {
    const validAddress = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H'
    expect(isValidStellarAddress(validAddress)).toBe(true)
    expect(validAddress.length).toBe(56)
    expect(validAddress[0]).toBe('G')
  })

  it('rejects invalid addresses', () => {
    expect(isValidStellarAddress('')).toBe(false)
    expect(isValidStellarAddress('ABRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H')).toBe(
      false
    )
    expect(isValidStellarAddress('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2')).toBe(
      false
    )
    expect(isValidStellarAddress('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2HX')).toBe(
      false
    )
  })

  it('rejects addresses with invalid characters', () => {
    expect(isValidStellarAddress('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2!')).toBe(
      false
    )
    expect(isValidStellarAddress('gbrpyhil2ci3fnq4bxlfmndlfjunpu2hy3zmfshonuceoasw7qc7ox2h')).toBe(
      false
    )
  })
})
