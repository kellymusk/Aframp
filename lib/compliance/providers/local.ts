/**
 * Local providers — screening against the bundled list, no network call.
 *
 * These are not a stub.  They are the failover path: when the paid provider
 * times out or errors, the orchestrator still runs these so a designated name
 * or a designated address is caught even during a vendor outage.  A local hit
 * blocks exactly as a vendor hit does.
 *
 * What they cannot do is the part vendors are paid for — attributing an address
 * to a darknet market, spotting adverse media, resolving a PEP's family
 * members.  So a clean local result is never treated as a clean screening when
 * the vendor failed; the orchestrator still raises PROVIDER_UNAVAILABLE and,
 * under FAIL_CLOSED, holds for review.  Silence here means "nothing on the
 * list", not "no risk".
 */

import type { NameScreeningResult, WalletRiskResult } from '../types'
import { screenAddressAgainstLists, screenNameAgainstLists } from '../sanctions/list'
import type {
  NameScreeningOptions,
  NameScreeningProvider,
  WalletRiskProvider,
} from './types'

export class LocalListNameProvider implements NameScreeningProvider {
  readonly name = 'local-list'

  // Synchronous under the hood — the corpus is in process memory.  The Promise
  // is there because the interface is shared with providers that make network
  // calls, and callers must not be able to tell them apart.
  screenName(
    name: string,
    { entity = false }: NameScreeningOptions = {}
  ): Promise<NameScreeningResult> {
    return Promise.resolve({ matches: screenNameAgainstLists(name, { entity }) })
  }
}

export class LocalListWalletProvider implements WalletRiskProvider {
  readonly name = 'local-list'

  screenWallet(address: string, _chain: string): Promise<WalletRiskResult> {
    const hit = screenAddressAgainstLists(address)

    if (!hit) {
      return Promise.resolve({
        address,
        riskScore: 0,
        riskLevel: 'LOW',
        categories: [],
        sanctioned: false,
      })
    }

    return Promise.resolve({
      address,
      riskScore: 100,
      riskLevel: 'SEVERE',
      categories: ['sanctioned_address'],
      sanctioned: true,
      reference: hit.id,
    })
  }
}
