import { Server, Asset, Memo, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk'
import type { FreighterNetwork } from '@/lib/wallet'
import { captureError, log } from '@/lib/observability'

const HORIZON_PUBLIC = 'https://horizon.stellar.org'
const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org'

const CNGN_ISSUER = process.env.NEXT_PUBLIC_CNGN_ISSUER || ''

interface BuildOfframpPaymentParams {
  sourcePublicKey: string
  destination: string
  amount: number
  assetCode: string
  network: FreighterNetwork | null
  memo?: string
}

export async function buildOfframpPaymentXdr({
  sourcePublicKey,
  destination,
  amount,
  assetCode,
  network,
  memo,
}: BuildOfframpPaymentParams): Promise<string> {
  const horizonUrl = network === 'TESTNET' ? HORIZON_TESTNET : HORIZON_PUBLIC
  const server = new Server(horizonUrl)

  try {
    const sourceAccount = await server.loadAccount(sourcePublicKey)
    const fee = await server.fetchBaseFee()

    let asset: Asset
    if (assetCode === 'XLM') {
      asset = Asset.native()
    } else if (assetCode === 'cNGN' && CNGN_ISSUER) {
      asset = new Asset('cNGN', CNGN_ISSUER)
    } else {
      // Fallback: treat as native for demo purposes
      asset = Asset.native()
    }

    const builder = new TransactionBuilder(sourceAccount, {
      fee: fee.toString(),
      networkPassphrase: network === 'TESTNET' ? Networks.TESTNET : Networks.PUBLIC,
    }).addOperation(
      Operation.payment({
        destination,
        asset,
        amount: amount.toString(),
      })
    )

    if (memo) {
      builder.addMemo(Memo.text(memo.slice(0, 28)))
    }

    const tx = builder.setTimeout(300).build()

    log.info('stellar.offramp.xdr_built', {
      assetCode,
      amount: amount.toString(),
      network: network ?? 'PUBLIC',
    })

    return tx.toXDR()
  } catch (err) {
    captureError(err, {
      tags: { domain: 'stellar', operation: 'offramp-build-xdr' },
      extra: {
        assetCode,
        amount: amount.toString(),
        network: network ?? 'PUBLIC',
        destination: destination.slice(0, 8) + '…',
      },
    })
    log.error('stellar.offramp.xdr_build.failed', {
      error: err instanceof Error ? err.message : String(err),
      assetCode,
      network: network ?? 'PUBLIC',
    })
    throw err
  }
}
