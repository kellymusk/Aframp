import { Server, Asset, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk'
import type { FreighterNetwork } from '@/lib/wallet'
import { captureError, log } from '@/lib/observability'

const { Asset, Networks, Operation, TransactionBuilder } = StellarSdk
// Server is accessed as a named export under the default namespace in the Stellar SDK
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Server: new (url: string) => any = (StellarSdk as any).Horizon?.Server ?? (StellarSdk as any).Server

const HORIZON_PUBLIC = 'https://horizon.stellar.org'
const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org'

// Asset issuers are required env vars — no hardcoded fallbacks.
// Missing values in any environment will cause swaps to target the wrong asset or fail.
// Add NEXT_PUBLIC_CNGN_ISSUER and NEXT_PUBLIC_USDC_ISSUER to your .env.local file.
function requireIssuer(envVar: string, assetCode: string): string {
  const value = typeof process !== 'undefined' ? process.env[envVar] : undefined
  if (!value) {
    throw new Error(
      `${envVar} is not set. ` +
        `Add it to your .env.local file to enable ${assetCode} swaps. ` +
        'Use the testnet issuer for development or contact the AFRAMP team for the production address.'
    )
  }
  return value
}

// Known issuers — configured entirely via NEXT_PUBLIC_ env vars.
// cKES and cGHS issuers are optional and only validated when those assets are actually used.
const ASSET_ISSUERS: Record<string, string | undefined> = {
  cNGN: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_CNGN_ISSUER : undefined,
  USDC: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_USDC_ISSUER : undefined,
  cKES: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_CKES_ISSUER : undefined,
  cGHS: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_CGHS_ISSUER : undefined,
}

export const SWAP_ASSETS = ['cNGN', 'USDC', 'XLM', 'cKES', 'cGHS'] as const
export type SwapAsset = (typeof SWAP_ASSETS)[number]

export interface SwapPath {
  path: StellarSdk.Asset[]
  sourceAmount: string
  destinationAmount: string
}

export interface SwapSimulation {
  fromAsset: SwapAsset
  toAsset: SwapAsset
  fromAmount: string
  toAmount: string
  /** Best path found by Stellar DEX path-finding */
  path: StellarSdk.Asset[]
  /** Minimum received after slippage */
  minReceived: string
  /** Effective exchange rate */
  rate: string
  /** Network fee in XLM stroops */
  fee: string
  slippagePct: number
}

function getAsset(code: SwapAsset): StellarSdk.Asset {
  if (code === 'XLM') return Asset.native()
  if (code === 'cNGN') return new Asset(code, requireIssuer('NEXT_PUBLIC_CNGN_ISSUER', code))
  if (code === 'USDC') return new Asset(code, requireIssuer('NEXT_PUBLIC_USDC_ISSUER', code))
  const issuer = ASSET_ISSUERS[code]
  if (!issuer) throw new Error(`Unknown issuer for ${code}`)
  return new Asset(code, issuer)
}

function getHorizon(network: FreighterNetwork | null) {
  return network === 'TESTNET' ? HORIZON_TESTNET : HORIZON_PUBLIC
}

/**
 * Find the optimal DEX route for a strict-send path payment.
 *
 * Queries Stellar Horizon's `/paths/strict-send` endpoint and returns all
 * candidate paths sorted by best (highest) destination amount first.
 *
 * This is the routing layer — call {@link simulateSwap} for a full quote
 * including slippage math, or call this directly when you need the raw paths.
 */
export async function findSwapPath(
  fromAsset: SwapAsset,
  toAsset: SwapAsset,
  fromAmount: string,
  network: FreighterNetwork | null
): Promise<SwapPath[]> {
  const horizonUrl = getHorizon(network)
  const src = getAsset(fromAsset)
  const dest = getAsset(toAsset)

  const params = new URLSearchParams({
    source_asset_type: src.isNative() ? 'native' : 'credit_alphanum4',
    ...(src.isNative() ? {} : { source_asset_code: src.getCode(), source_asset_issuer: src.getIssuer() }),
    source_amount: fromAmount,
    destination_asset_type: dest.isNative() ? 'native' : 'credit_alphanum4',
    ...(dest.isNative() ? {} : { destination_asset_code: dest.getCode(), destination_asset_issuer: dest.getIssuer() }),
  })

  try {
    const res = await fetch(`${horizonUrl}/paths/strict-send?${params}`)
    if (!res.ok) throw new Error(`Path-finding failed: ${res.status}`)

    const data = await res.json()
    const records: Array<{
      destination_amount: string
      path: Array<{ asset_type: string; asset_code?: string; asset_issuer?: string }>
    }> = data._embedded?.records ?? []

    if (records.length === 0) throw new Error('No swap path found for this pair')

    // Best path = highest destination amount
    const best = records.reduce((a, b) =>
      parseFloat(a.destination_amount) >= parseFloat(b.destination_amount) ? a : b
    )

    const toAmount = best.destination_amount
    const minReceived = (parseFloat(toAmount) * (1 - slippagePct / 100)).toFixed(7)
    const rate = (parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(7)

    const path = best.path.map((p) =>
      p.asset_type === 'native' ? Asset.native() : new Asset(p.asset_code!, p.asset_issuer!)
    )

    log.info('stellar.swap.simulated', {
      fromAsset,
      toAsset,
      fromAmount,
      toAmount,
      rate,
      network: network ?? 'PUBLIC',
    })

    return {
      fromAsset,
      toAsset,
      fromAmount,
      toAmount,
      path,
      minReceived,
      rate,
      fee: '100', // base fee in stroops
      slippagePct,
    }
  } catch (err) {
    captureError(err, {
      tags: { domain: 'stellar', operation: 'swap-simulate' },
      extra: { fromAsset, toAsset, fromAmount, network: network ?? 'PUBLIC' },
    })
    log.error('stellar.swap.simulate.failed', {
      error: err instanceof Error ? err.message : String(err),
      fromAsset,
      toAsset,
      network: network ?? 'PUBLIC',
    })
    throw err
  }
}

/**
 * Build a PathPaymentStrictSend XDR for signing via Freighter.
 * Uses the optimal path from simulateSwap / findSwapPath.
 */
export async function buildSwapXdr(
  sourcePublicKey: string,
  sim: SwapSimulation,
  network: FreighterNetwork | null
): Promise<string> {
  const horizonUrl = getHorizon(network)
  const server = new Server(horizonUrl)

  try {
    const sourceAccount = await server.loadAccount(sourcePublicKey)
    const fee = await server.fetchBaseFee()

    const sendAsset = getAsset(sim.fromAsset)
    const destAsset = getAsset(sim.toAsset)

    const tx = new TransactionBuilder(sourceAccount, {
      fee: fee.toString(),
      networkPassphrase: network === 'TESTNET' ? Networks.TESTNET : Networks.PUBLIC,
    })
      .addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset,
          sendAmount: sim.fromAmount,
          destination: sourcePublicKey, // self-swap (swap to own wallet)
          destAsset,
          destMin: sim.minReceived,
          path: sim.path,
        })
      )
      .setTimeout(300)
      .build()

    log.info('stellar.swap.xdr_built', {
      fromAsset: sim.fromAsset,
      toAsset: sim.toAsset,
      fromAmount: sim.fromAmount,
      network: network ?? 'PUBLIC',
    })

    return tx.toXDR()
  } catch (err) {
    captureError(err, {
      tags: { domain: 'stellar', operation: 'swap-build-xdr' },
      extra: {
        fromAsset: sim.fromAsset,
        toAsset: sim.toAsset,
        fromAmount: sim.fromAmount,
        network: network ?? 'PUBLIC',
      },
    })
    log.error('stellar.swap.xdr_build.failed', {
      error: err instanceof Error ? err.message : String(err),
      fromAsset: sim.fromAsset,
      toAsset: sim.toAsset,
    })
    throw err
  }
}
