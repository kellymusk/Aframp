/**
 * Provider selection and failover.
 *
 * Which vendor is active is an environment decision, not a code one — a market
 * can run Chainalysis while another runs Elliptic, and CI runs neither.
 * Construction is lazy and memoised: a missing key must fail when screening is
 * first attempted, not at module import, or a misconfigured secret takes down
 * the whole app rather than degrading one control.
 *
 * Environment:
 *   COMPLIANCE_WALLET_PROVIDER   chainalysis | elliptic | local   (default: local)
 *   COMPLIANCE_NAME_PROVIDER     complyadvantage | local          (default: local)
 *   CHAINALYSIS_API_KEY
 *   ELLIPTIC_API_KEY / ELLIPTIC_API_SECRET
 *   COMPLYADVANTAGE_API_KEY
 *
 * Defaulting to `local` is chosen so a developer without vendor keys still runs
 * the full code path.  Production must set these explicitly — the admin health
 * endpoint reports the active provider so "we forgot to configure it" is
 * visible rather than assumed.
 */

import { ChainalysisProvider } from './chainalysis'
import { ComplyAdvantageProvider } from './comply-advantage'
import { EllipticProvider } from './elliptic'
import { LocalListNameProvider, LocalListWalletProvider } from './local'
import type { NameScreeningProvider, WalletRiskProvider } from './types'

let _walletProvider: WalletRiskProvider | null = null
let _nameProvider: NameScreeningProvider | null = null

/** The blockchain-analytics provider named by the environment. */
export function getWalletRiskProvider(): WalletRiskProvider {
  if (_walletProvider) return _walletProvider

  const choice = (process.env.COMPLIANCE_WALLET_PROVIDER ?? 'local').toLowerCase()

  switch (choice) {
    case 'chainalysis':
      _walletProvider = new ChainalysisProvider(
        requireEnv('CHAINALYSIS_API_KEY'),
        process.env.CHAINALYSIS_BASE_URL
      )
      break
    case 'elliptic':
      _walletProvider = new EllipticProvider(
        requireEnv('ELLIPTIC_API_KEY'),
        requireEnv('ELLIPTIC_API_SECRET'),
        process.env.ELLIPTIC_BASE_URL
      )
      break
    case 'local':
      _walletProvider = new LocalListWalletProvider()
      break
    default:
      throw new Error(
        `Unknown COMPLIANCE_WALLET_PROVIDER "${choice}" — expected chainalysis, elliptic or local`
      )
  }

  return _walletProvider
}

/** The entity-screening provider named by the environment. */
export function getNameScreeningProvider(): NameScreeningProvider {
  if (_nameProvider) return _nameProvider

  const choice = (process.env.COMPLIANCE_NAME_PROVIDER ?? 'local').toLowerCase()

  switch (choice) {
    case 'complyadvantage':
      _nameProvider = new ComplyAdvantageProvider(
        requireEnv('COMPLYADVANTAGE_API_KEY'),
        process.env.COMPLYADVANTAGE_BASE_URL
      )
      break
    case 'local':
      _nameProvider = new LocalListNameProvider()
      break
    default:
      throw new Error(
        `Unknown COMPLIANCE_NAME_PROVIDER "${choice}" — expected complyadvantage or local`
      )
  }

  return _nameProvider
}

/** Local providers, used as the failover leg when a vendor call fails. */
export const localWalletProvider = new LocalListWalletProvider()
export const localNameProvider = new LocalListNameProvider()

/** True when either half of screening is running without a paid provider. */
export function isRunningOnLocalOnly(): boolean {
  const wallet = (process.env.COMPLIANCE_WALLET_PROVIDER ?? 'local').toLowerCase()
  const name = (process.env.COMPLIANCE_NAME_PROVIDER ?? 'local').toLowerCase()
  return wallet === 'local' || name === 'local'
}

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `${key} is required by the configured compliance provider but is not set`
    )
  }
  return value
}

/** Drops memoised providers so a test can re-read the environment. */
export function _resetProviders(): void {
  _walletProvider = null
  _nameProvider = null
}

export { ProviderError } from './types'
export type { NameScreeningProvider, WalletRiskProvider } from './types'
