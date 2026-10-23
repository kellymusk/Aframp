/** Each case loads the module fresh, because the network is read at import time. */
function loadWith(network: string | undefined) {
  const previous = process.env.NEXT_PUBLIC_STELLAR_NETWORK
  if (network === undefined) delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
  else process.env.NEXT_PUBLIC_STELLAR_NETWORK = network
  let mod: typeof import('../config/network') | undefined
  jest.isolateModules(() => {
    mod = jest.requireActual<typeof import('../config/network')>('../config/network')
  })
  if (previous === undefined) delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
  else process.env.NEXT_PUBLIC_STELLAR_NETWORK = previous
  return mod!
}

describe('lib/config/network', () => {
  it.each(['MAINNET', 'PUBLIC', ' public '])('treats %p as mainnet', (value) => {
    const network = loadWith(value)
    expect(network.STELLAR_NETWORK).toBe('MAINNET')
    expect(network.isMainnet()).toBe(true)
    expect(network.getTransactionExplorerUrl('abc')).toBe(
      'https://stellar.expert/explorer/public/tx/abc'
    )
  })

  it('supports futurenet', () => {
    const network = loadWith('FUTURENET')
    expect(network.isMainnet()).toBe(false)
    expect(network.getExplorerBaseUrl()).toBe('https://stellar.expert/explorer/futurenet')
  })

  it.each([undefined, '', 'TESTNET', 'nonsense'])('falls back to testnet for %p', (value) => {
    const network = loadWith(value)
    expect(network.STELLAR_NETWORK).toBe('TESTNET')
    expect(network.getExplorerNetworkPath()).toBe('testnet')
  })
})
