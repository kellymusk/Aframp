# Stellar Testnet Setup Guide

This guide walks contributors through setting up a Stellar Testnet environment for local
development on Aframp: creating a funded testnet account, installing and configuring
Freighter, finding the right testnet asset issuers for `cNGN`, `USDC`, and `cKES`, and
inspecting transactions with Stellar Laboratory.

Aframp talks to Stellar via `@stellar/stellar-sdk` and `@stellar/freighter-api` (see
`lib/stellar-p2p.ts`, `lib/offramp/stellar-offramp.ts`, and `lib/swap/stellar-swap.ts`),
against the Testnet Horizon server (`https://horizon-testnet.stellar.org`) whenever
`NEXT_PUBLIC_STELLAR_NETWORK=TESTNET` (see `.env.example` and `next.config.mjs`).

## 1. Create a testnet account with Friendbot

Stellar accounts need a minimum XLM balance before they exist on the network. On
Testnet, [Friendbot](https://friendbot.stellar.org) funds new accounts for free.

1. Generate a keypair. The quickest way is via
   [Stellar Laboratory](https://lab.stellar.org/account/create) ("Generate keypair"), or
   with the SDK:

   ```ts
   import { Keypair } from '@stellar/stellar-sdk'

   const keypair = Keypair.random()
   console.log('Public key:', keypair.publicKey()) // G...
   console.log('Secret key:', keypair.secret())     // S... — keep this out of source control
   ```

2. Fund the public key with Friendbot:

   ```bash
   curl "https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY"
   ```

   This is equivalent to visiting
   `https://horizon-testnet.stellar.org/friendbot?addr=YOUR_PUBLIC_KEY` in a browser, or
   using the "Fund account" button on the
   [Stellar Laboratory account page](https://lab.stellar.org/account/fund).

3. Confirm the account exists and check its balance:

   ```bash
   curl "https://horizon-testnet.stellar.org/accounts/YOUR_PUBLIC_KEY"
   ```

   A successful response includes a `balances` array with `10000` XLM (Friendbot's
   default funding amount).

Never fund a mainnet (`G...`) key with Friendbot — it only works against
`horizon-testnet.stellar.org` and the funds have no real value.

## 2. Install and configure Freighter for testnet

[Freighter](https://freighter.app) is the browser wallet extension Aframp uses for
signing (see `hooks/use-stellar-payment-stream.ts` and the `@stellar/freighter-api`
calls throughout `lib/`).

1. Install the extension from [freighter.app](https://freighter.app) (Chrome, Firefox,
   or Brave) and follow the prompts to create a new wallet or import the secret key you
   generated in step 1.
2. Open the Freighter extension, click the network selector, and switch it from
   **Mainnet** to **Testnet**.
3. Click **Fund with Friendbot** in the extension (visible when the account balance is
   zero on Testnet) — this calls the same Friendbot endpoint as above.
4. Point the app at Testnet locally by setting the following in your `.env.local`
   (see `.env.example`):

   ```env
   NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
   ```

5. When Aframp calls `requestAccess()` / `signTransaction()` from `@stellar/freighter-api`,
   Freighter will prompt you to approve the connection and each transaction signature.
   Verify the network shown in the Freighter popup matches Testnet before approving —
   signing a mainnet transaction by mistake is the most common local setup error.

## 3. Testnet asset issuers for cNGN, USDC, cKES

Custom Stellar assets are identified by an `(asset_code, issuer)` pair. Aframp reads
issuer addresses from environment variables at `lib/swap/stellar-swap.ts` and
`lib/offramp/stellar-offramp.ts`:

| Asset  | Env var                       | Local dev value                                             |
|--------|--------------------------------|--------------------------------------------------------------|
| cNGN   | `NEXT_PUBLIC_CNGN_ISSUER`      | `GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG`   |
| USDC   | `NEXT_PUBLIC_USDC_ISSUER`      | Circle's official Testnet USDC issuer (below)                |
| cKES   | `NEXT_PUBLIC_CKES_ISSUER`      | not publicly issued — self-issue for local dev (below)        |

- **cNGN** — the address above matches the value already used in `QUICK_START.md` for
  local development. Add a trustline to it before attempting a swap or offramp in the
  app, or the balance/asset lookups in `hooks/use-offramp-balances.ts` will silently
  skip it.
- **USDC** — Circle publishes an official Testnet USDC issuer:
  `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` (verify current issuer
  addresses on [Stellar Expert](https://stellar.expert/explorer/testnet) before relying
  on it, since faucet/issuer addresses can rotate).
- **cKES** — there is no canonical public Testnet issuer for cKES yet. For local
  development, self-issue a test token: create a second Friendbot-funded keypair to act
  as the issuer, then create a trustline from your distribution/test account to
  `cKES:<issuer public key>` and send yourself a payment of that asset using Stellar
  Laboratory (see step 4). Set `NEXT_PUBLIC_CKES_ISSUER` to that issuer's public key.

Add a trustline (required before you can hold or receive a non-native asset) either
through Stellar Laboratory's "Change Trust" operation, or with the SDK:

```ts
import { Asset, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk'

const changeTrustOp = Operation.changeTrust({
  asset: new Asset('cNGN', 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG'),
})
```

## 4. Using Stellar Laboratory for transaction inspection

[Stellar Laboratory](https://lab.stellar.org) is the SDF's web UI for building
transactions, funding testnet accounts, and inspecting Horizon/RPC responses without
writing code — useful for debugging a transaction that failed when submitted from the
app.

- **Build & submit a transaction**: [lab.stellar.org/transaction/build](https://lab.stellar.org/transaction/build),
  set the network to Testnet, add operations (payment, change trust, path payment,
  etc.), sign with your secret key, and submit directly to `horizon-testnet.stellar.org`.
- **Inspect a transaction**: paste a transaction hash into the
  [Endpoint Explorer](https://lab.stellar.org/endpoints) against the `GET /transactions/{hash}`
  Horizon endpoint, or use the `getTransaction` RPC method, to see its result codes,
  operations, and ledger effects — this is the fastest way to see *why* a payment or
  swap failed (e.g. `op_underfunded`, `op_no_trust`, `op_src_no_trust`).
- **Inspect an account**: `GET /accounts/{public_key}` shows current balances,
  trustlines, and signers — useful for confirming a trustline or Friendbot funding
  actually landed before debugging further up the stack.

## Troubleshooting

- **`op_no_trust` / `op_src_no_trust`** — the sending or receiving account hasn't
  established a trustline for that asset yet. Add one via Stellar Laboratory or the
  SDK (step 3) before retrying.
- **Friendbot returns an error for an already-funded account** — Friendbot only funds
  an account once; check its balance instead of re-funding.
- **Freighter shows no accounts / wrong network** — confirm the extension's network
  selector is set to Testnet and that `NEXT_PUBLIC_STELLAR_NETWORK=TESTNET` is set in
  your `.env.local`; a mismatch here is the most common cause of silent signing
  failures.
