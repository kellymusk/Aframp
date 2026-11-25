import { hero, supportedCountryCodes, supportedCountryCount, tiers } from '@/lib/landing-data'
import { SUPPORTED_FIAT_CURRENCIES } from '@/types/onramp'

describe('landing page country claims', () => {
  const countriesStat = hero.stats.find((stat) => stat.label === 'Countries')

  it('reports a country count that matches the configured country set', () => {
    expect(countriesStat).toBeDefined()
    expect(countriesStat?.value).toBe(String(SUPPORTED_FIAT_CURRENCIES.length))
    expect(supportedCountryCount).toBe(SUPPORTED_FIAT_CURRENCIES.length)
    expect(supportedCountryCodes).toHaveLength(SUPPORTED_FIAT_CURRENCIES.length)
  })

  it('marks the unverifiable user and volume figures as illustrative', () => {
    const illustrativeLabels = hero.stats
      .filter((stat) => stat.illustrative)
      .map((stat) => stat.label)

    expect(illustrativeLabels).toEqual(['Active Users', 'Processed Daily'])
    expect(countriesStat?.illustrative).toBeFalsy()
  })

  it('keeps the pricing copy in step with the supported country set', () => {
    const personal = tiers.find((tier) => tier.name === 'Personal')

    expect(personal?.features).toContain(`Send to ${supportedCountryCount} countries`)
  })
})
