import { getPhoneCountry, normalizePhone } from '@/lib/phone'

const NG = getPhoneCountry('NG')

describe('normalizePhone', () => {
  it.each([
    ['08011122233', '+2348011122233'],
    ['0801 112 2233', '+2348011122233'],
    ['+234 801 112 2233', '+2348011122233'],
    ['+234 (0) 801-112-2233', '+2348011122233'],
    ['2348011122233', '+2348011122233'],
    ['002348011122233', '+2348011122233'],
    ['8011122233', '+2348011122233'],
  ])('normalises %s', (input, e164) => {
    expect(normalizePhone(input, NG)).toEqual({ ok: true, e164 })
  })

  it.each(['', '0801112223', '080111222333', 'abc', '0601 112 2233', '+254712345678'])(
    'rejects %p',
    (input) => {
      expect(normalizePhone(input, NG).ok).toBe(false)
    }
  )

  it('handles other countries', () => {
    expect(normalizePhone('0712 345 678', getPhoneCountry('KE'))).toEqual({
      ok: true,
      e164: '+254712345678',
    })
  })
})
