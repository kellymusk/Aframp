import { STELLAR_ASSETS } from '../assets'
import { STELLAR_NETWORK, type StellarNetwork } from '../config/network'
import { networks } from '../landing-data'

const SUPPORTED_STELLAR_NETWORKS: readonly StellarNetwork[] = ['MAINNET', 'TESTNET', 'FUTURENET']

describe('landing networks', () => {
  it('only advertises networks and tickers the app supports', () => {
    const supportedTickers = STELLAR_ASSETS.map(({ code }) => code)

    expect(networks.length).toBeGreaterThan(0)
    expect(SUPPORTED_STELLAR_NETWORKS).toContain(STELLAR_NETWORK)

    for (const { name, ticker, blurb } of networks) {
      expect(name).toBe('Stellar')
      expect(supportedTickers).toContain(ticker)
      expect(blurb.trim()).not.toBe('')
    }
  })

  it('does not advertise Starknet or Lightning Network', () => {
    const advertised = networks.map(({ name, ticker }) => `${name}:${ticker}`)

    expect(advertised).not.toContain('Starknet:STRK')
    expect(advertised).not.toContain('Lightning Network:BTC')
    expect(networks.some(({ ticker }) => ticker === 'STRK' || ticker === 'BTC')).toBe(false)
  })

  it('advertises Stellar (XLM) with non-empty metadata', () => {
    const stellar = networks.find(({ name, ticker }) => name === 'Stellar' && ticker === 'XLM')

    expect(stellar).toBeDefined()
    expect(stellar?.name).toBe('Stellar')
    expect(stellar?.ticker).toBe('XLM')
    expect(stellar?.blurb.trim()).not.toBe('')
  })
})
