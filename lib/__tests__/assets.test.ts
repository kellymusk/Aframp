import { STELLAR_ASSETS } from '../assets'
import { WITHDRAWAL_ASSETS } from '../withdraw'

describe('STELLAR_ASSETS', () => {
  it('lists exactly the assets the platform transacts', () => {
    expect(STELLAR_ASSETS.map((asset) => asset.code)).toEqual(['XLM', 'cNGN', 'cKES', 'cGHS'])
  })

  it('covers every withdrawal asset', () => {
    const codes = new Set(STELLAR_ASSETS.map((asset) => asset.code))
    for (const asset of WITHDRAWAL_ASSETS) {
      expect(codes.has(asset)).toBe(true)
    }
  })

  it('excludes USDC, which has no configured issuer', () => {
    expect(STELLAR_ASSETS.some((asset) => asset.code === 'USDC')).toBe(false)
  })

  it('gives every entry display metadata', () => {
    for (const asset of STELLAR_ASSETS) {
      expect(asset.name).toBeTruthy()
      expect(asset.icon).toBeTruthy()
      expect(asset.color).toMatch(/^#/)
    }
  })
})
