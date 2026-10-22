import { validateOzowPaymentUrl } from '@/lib/payment-providers'

describe('validateOzowPaymentUrl', () => {
  // --- valid URLs ---
  describe('accepts valid Ozow HTTPS URLs', () => {
    const validUrls = [
      'https://ozow.com/pay/abc123',
      'https://pay.ozow.com/checkout?ref=XYZ',
      'https://secure.pay.ozow.com/session/1',
      'https://ozow.com/',
    ]

    it.each(validUrls)('%s', (url) => {
      expect(() => validateOzowPaymentUrl(url)).not.toThrow()
    })
  })

  // --- invalid scheme ---
  describe('rejects non-HTTPS URLs', () => {
    it('rejects http:// URLs', () => {
      expect(() => validateOzowPaymentUrl('http://ozow.com/pay/abc')).toThrow(
        'Payment URL must use HTTPS.'
      )
    })

    it('rejects javascript: pseudo-URLs', () => {
      expect(() =>
        validateOzowPaymentUrl('javascript:alert(document.cookie)')
      ).toThrow('Payment URL must use HTTPS.')
    })

    it('rejects data: URIs', () => {
      expect(() => validateOzowPaymentUrl('data:text/html,<h1>hi</h1>')).toThrow(
        'Payment URL must use HTTPS.'
      )
    })
  })

  // --- unparseable / empty ---
  describe('rejects malformed URLs', () => {
    it('rejects an empty string', () => {
      expect(() => validateOzowPaymentUrl('')).toThrow(
        'Invalid payment URL received from server.'
      )
    })

    it('rejects a bare string with no scheme', () => {
      expect(() => validateOzowPaymentUrl('ozow.com/pay/abc')).toThrow(
        'Invalid payment URL received from server.'
      )
    })
  })

  // --- wrong domain ---
  describe('rejects URLs not on the ozow.com domain', () => {
    const maliciousUrls = [
      'https://evil.com/pay',
      'https://notOzow.com/pay',
      // subdomain spoofing: the actual hostname is evil.com
      'https://ozow.com.evil.com/pay',
      // extra characters appended to ozow.com
      'https://ozowXcom/pay',
    ]

    it.each(maliciousUrls)('%s', (url) => {
      expect(() => validateOzowPaymentUrl(url)).toThrow(
        'Payment URL does not point to a trusted Ozow domain.'
      )
    })
  })
})
