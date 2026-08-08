/**
 * Tests for regional mobile money availability.
 */

import { getMobileMoneyOptions, MOBILE_MONEY_AVAILABILITY } from '../regions'

describe('getMobileMoneyOptions', () => {
  it('returns M-Pesa, MTN MoMo, and Flutterwave for Ghana (GH)', () => {
    const options = getMobileMoneyOptions('GH')
    const providers = options.map((o) => o.provider)
    expect(providers).toContain('mpesa')
    expect(providers).toContain('mtn_momo')
    expect(providers).toContain('flutterwave')
    expect(options.length).toBe(3)
  })

  it('returns M-Pesa, MTN MoMo, and Flutterwave for Uganda (UG)', () => {
    const options = getMobileMoneyOptions('UG')
    const providers = options.map((o) => o.provider)
    expect(providers).toContain('mpesa')
    expect(providers).toContain('mtn_momo')
    expect(providers).toContain('flutterwave')
    expect(options.length).toBe(3)
  })

  it('returns M-Pesa and Flutterwave for Kenya (KE)', () => {
    const options = getMobileMoneyOptions('KE')
    const providers = options.map((o) => o.provider)
    expect(providers).toContain('mpesa')
    expect(providers).toContain('flutterwave')
    expect(options.length).toBe(2)
  })

  it('returns M-Pesa and Flutterwave for Tanzania (TZ)', () => {
    const options = getMobileMoneyOptions('TZ')
    const providers = options.map((o) => o.provider)
    expect(providers).toContain('mpesa')
    expect(providers).toContain('flutterwave')
    expect(options.length).toBe(2)
  })

  it('returns MTN MoMo and Flutterwave for Rwanda (RW)', () => {
    const options = getMobileMoneyOptions('RW')
    const providers = options.map((o) => o.provider)
    expect(providers).toContain('mtn_momo')
    expect(providers).toContain('flutterwave')
    expect(options.length).toBe(2)
  })

  it('returns MTN MoMo and Flutterwave for Zambia (ZM) and Cameroon (CM)', () => {
    for (const country of ['ZM', 'CM', 'CI']) {
      const options = getMobileMoneyOptions(country)
      const providers = options.map((o) => o.provider)
      expect(providers).toContain('mtn_momo')
      expect(providers).toContain('flutterwave')
      expect(options.length).toBe(2)
    }
  })

  it('returns an empty array for the US (no mobile money support)', () => {
    const options = getMobileMoneyOptions('US')
    expect(options).toEqual([])
  })

  it('returns an empty array for Nigeria (NG) — not yet supported', () => {
    const options = getMobileMoneyOptions('NG')
    expect(options).toEqual([])
  })

  it('is case-insensitive', () => {
    expect(getMobileMoneyOptions('ke')).toEqual(getMobileMoneyOptions('KE'))
    expect(getMobileMoneyOptions('gh')).toEqual(getMobileMoneyOptions('GH'))
  })

  it('every option has required fields', () => {
    Object.values(MOBILE_MONEY_AVAILABILITY)
      .flat()
      .forEach((option) => {
        expect(option.provider).toBeTruthy()
        expect(option.label).toBeTruthy()
        expect(option.description).toBeTruthy()
        expect(option.dialPrefix).toMatch(/^\+\d+$/)
        expect(option.phonePattern).toBeTruthy()
      })
  })
})
