import {
  getStellarNetwork,
  getStellarExplorerBase,
  getStellarAccountUrl,
  getStellarTransactionUrl,
  getStellarHorizonUrl,
} from '../stellar-network'

describe('stellar-network', () => {
  const originalEnv = process.env.NEXT_PUBLIC_STELLAR_NETWORK

  afterEach(() => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = originalEnv
  })

  describe('getStellarNetwork', () => {
    it('returns testnet when env is testnet (lowercase)', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet'
      expect(getStellarNetwork()).toBe('testnet')
    })

    it('returns testnet when env is TESTNET (uppercase)', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'TESTNET'
      expect(getStellarNetwork()).toBe('testnet')
    })

    it('returns testnet when env is TeStNeT (mixed case)', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'TeStNeT'
      expect(getStellarNetwork()).toBe('testnet')
    })

    it('returns public when env is public (lowercase)', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'public'
      expect(getStellarNetwork()).toBe('public')
    })

    it('returns public when env is PUBLIC (uppercase)', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'PUBLIC'
      expect(getStellarNetwork()).toBe('public')
    })

    it('returns public when env is mainnet (lowercase)', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'mainnet'
      expect(getStellarNetwork()).toBe('public')
    })

    it('returns public when env is MAINNET (uppercase)', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'MAINNET'
      expect(getStellarNetwork()).toBe('public')
    })

    it('returns testnet when env is undefined', () => {
      delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
      expect(getStellarNetwork()).toBe('testnet')
    })

    it('returns testnet when env is empty string', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = ''
      expect(getStellarNetwork()).toBe('testnet')
    })

    it('returns testnet for invalid values', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'invalid'
      expect(getStellarNetwork()).toBe('testnet')
    })
  })

  describe('getStellarExplorerBase', () => {
    it('returns testnet explorer URL when network is testnet', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet'
      expect(getStellarExplorerBase()).toBe('https://stellar.expert/explorer/testnet')
    })

    it('returns public explorer URL when network is public', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'public'
      expect(getStellarExplorerBase()).toBe('https://stellar.expert/explorer/public')
    })

    it('returns public explorer URL when network is MAINNET', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'MAINNET'
      expect(getStellarExplorerBase()).toBe('https://stellar.expert/explorer/public')
    })
  })

  describe('getStellarAccountUrl', () => {
    it('returns testnet account URL', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet'
      const address = 'GABC123XYZ'
      expect(getStellarAccountUrl(address)).toBe(
        'https://stellar.expert/explorer/testnet/account/GABC123XYZ'
      )
    })

    it('returns public account URL', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'public'
      const address = 'GABC123XYZ'
      expect(getStellarAccountUrl(address)).toBe(
        'https://stellar.expert/explorer/public/account/GABC123XYZ'
      )
    })
  })

  describe('getStellarTransactionUrl', () => {
    it('returns testnet transaction URL', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet'
      const txHash = 'abc123def456'
      expect(getStellarTransactionUrl(txHash)).toBe(
        'https://stellar.expert/explorer/testnet/tx/abc123def456'
      )
    })

    it('returns public transaction URL', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'PUBLIC'
      const txHash = 'abc123def456'
      expect(getStellarTransactionUrl(txHash)).toBe(
        'https://stellar.expert/explorer/public/tx/abc123def456'
      )
    })
  })

  describe('getStellarHorizonUrl', () => {
    it('returns testnet Horizon URL when network is testnet', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet'
      expect(getStellarHorizonUrl()).toBe('https://horizon-testnet.stellar.org')
    })

    it('returns public Horizon URL when network is public', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'public'
      expect(getStellarHorizonUrl()).toBe('https://horizon.stellar.org')
    })

    it('returns public Horizon URL when network is MAINNET', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'MAINNET'
      expect(getStellarHorizonUrl()).toBe('https://horizon.stellar.org')
    })

    it('returns testnet Horizon URL by default', () => {
      delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
      expect(getStellarHorizonUrl()).toBe('https://horizon-testnet.stellar.org')
    })
  })

  describe('case-insensitive behavior', () => {
    it('handles all variations of testnet', () => {
      const variations = ['testnet', 'TESTNET', 'TestNet', 'tEsTnEt']
      variations.forEach((variant) => {
        process.env.NEXT_PUBLIC_STELLAR_NETWORK = variant
        expect(getStellarNetwork()).toBe('testnet')
      })
    })

    it('handles all variations of mainnet/public', () => {
      const variations = ['mainnet', 'MAINNET', 'MainNet', 'public', 'PUBLIC', 'Public']
      variations.forEach((variant) => {
        process.env.NEXT_PUBLIC_STELLAR_NETWORK = variant
        expect(getStellarNetwork()).toBe('public')
      })
    })
  })
})
