Issue1:#236 [Bug] Receipt generator ignores order data — shows hardcoded fixture values

Problem
lib/onramp/receipt.ts — generateReceiptPDF(order) accepts an OnrampOrder argument but uses none of it for the receipt content. Every receipt ever generated shows identical placeholder data:

amount: '₦50,000.00',
asset: '31.17 cNGN',
exchangeRate: '1 NGN = 0.0006235 USDC',
totalTime: '3 minutes 42 seconds',
completedAt: 'Jan 19, 2026 at 14:26 WAT',
transactionHash: '8f3e2d1c...9a1b0c2d',
walletAddress: 'GAXYZ...ABC123',
The order parameter is only used for the receipt number and date.

Fix
Map all receipt fields from the passed order object.

Impact
Critical — all user receipts show wrong transaction data.




Issue2:#237 [Bug] Hardcoded mock Stellar address silently used when wallet not detected

Problem
In components/onramp/onramp-page-client.tsx (approx. L112–114), when no real Stellar address is detected from the wallet, a hardcoded fake address is used as the destination for funds:

const mockAddress = 'GAXYZ123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789ABCDEFG'
Any real onramp order placed without a connected wallet would route funds to this address with no user warning.

Fix
Block order creation and show a wallet-connection prompt if no valid Stellar address is available. Never fall back to a hardcoded address.

Impact
Critical — financial funds could be sent to an address the user does not control.


Issue3:#235 [Bug] useWalletConnect discards real Freighter key — always returns mock address

Problem
In hooks/use-wallet-connect.ts, after successfully calling window.freighterApi.getPublicKey() and receiving the user's real public key, the function discards it and returns a randomly generated mock address:

const publicKey = await window.freighterApi.getPublicKey()
// publicKey is the real key — ignored below
return { address: generateMockAddress(walletId), walletName }
Every connected Freighter user is silently given a fake wallet address for all subsequent operations.

Fix
Return the real publicKey from Freighter instead of the mock.

Impact
Critical — all wallet-dependent operations (balances, onramp, offramp, P2P) use the wrong address.





Issue4:#234 [Bug] Stellar SDK Server imported as default export — TypeError at runtime

Problem
lib/stellar-p2p.ts, lib/offramp/stellar-offramp.ts, and lib/swap/stellar-swap.ts all import Server as the default export:

import Server, { Asset, ... } from '@stellar/stellar-sdk'
Server is not a default export from @stellar/stellar-sdk v14+. This throws TypeError: Server is not a constructor at runtime, silently breaking all P2P transfers, offramp settlements, and DEX swaps.

Fix
import { Server, Asset, Keypair, ... } from '@stellar/stellar-sdk'
Affected files
lib/stellar-p2p.ts
lib/offramp/stellar-offramp.ts
lib/swap/stellar-swap.ts
Impact
Critical — no real on-chain transaction can execute.