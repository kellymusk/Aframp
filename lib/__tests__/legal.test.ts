import { PRIVACY_PATH, TERMS_PATH, TERMS_VERSION } from '@/lib/legal'

describe('legal constants', () => {
  it('uses a simple version label the backend can store and compare', () => {
    expect(TERMS_VERSION).toMatch(/^v\d+$/)
  })

  it('links to absolute, distinct paths for the terms and the privacy policy', () => {
    expect(TERMS_PATH).toBe('/terms')
    expect(PRIVACY_PATH).toBe('/privacy')
    expect(TERMS_PATH).not.toBe(PRIVACY_PATH)
  })
})
