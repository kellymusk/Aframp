# ADR-001: Stellar Network as the Settlement Layer

**Status:** Accepted  
**Date:** 2024-01-15  
**Deciders:** Core engineering team  
**Ticket / Issue:** [#523](https://github.com/aframp/aframp/issues/523)

---

## Context

Aframp is a fiat-to-crypto (onramp) and crypto-to-fiat (offramp) payment platform
targeting the African market. The core product is enabling merchants to accept
payments and convert between African fiat currencies (NGN, KES, GHS, ZAR, UGX)
and digital assets.

We need a blockchain settlement layer that:

1. Supports fast, low-cost transactions suitable for everyday payments in
   price-sensitive African markets.
2. Has a mature ecosystem of African stablecoins (cNGN, cKES, cGHS, USDC).
3. Provides a standardised protocol for payment request encoding so that any
   compatible wallet can pay a merchant without bespoke integration.
4. Offers a reliable, battle-tested SDK and public Horizon API.
5. Has existing traction with African fintech projects.

## Decision

We will build Aframp's settlement layer entirely on the **Stellar network**,
using:

- **Stellar accounts** (G… StrKey addresses) as merchant payment addresses.
- **SEP-0007** (URI scheme for payment requests) to encode payment QR codes so
  any SEP-7-capable Stellar wallet (Freighter, LOBSTR, etc.) can pay a merchant
  by scanning.
- **Horizon** as the data layer for balance queries and transaction history
  (`https://horizon.stellar.org` for mainnet,
  `https://horizon-testnet.stellar.org` for testnet/development).
- **Stellar assets** for African stablecoins: cNGN (compliant Nigerian naira),
  cKES (Kenyan shilling), cGHS (Ghanaian cedi), plus USDC and native XLM.
- Both `PUBLIC` (mainnet) and `TESTNET` environments are supported via the
  `TransferNetwork` type (`lib/transfer-qr.ts`).

## Rationale

### Considered alternatives

| Option | Pros | Cons |
|--------|------|------|
| **Stellar (chosen)** | Sub-5-second finality; ~0.00001 XLM fee per tx; native multi-asset support; SEP-0007 payment URI standard; Freighter wallet widely used in Africa; African stablecoin issuers (cNGN, cKES, cGHS) already live on Stellar; USDC natively supported | Smaller global developer pool than Ethereum; not EVM-compatible so Ethereum tooling doesn't transfer directly |
| Ethereum / EVM-compatible chain | Largest global developer ecosystem; many DeFi integrations | Gas fees are prohibitively expensive for small African payment amounts ($0.01–$5 range); 12–15 second block time for finality; no native African stablecoin equivalent with comparable liquidity |
| Solana | High throughput; low fees; growing ecosystem | Limited African stablecoin presence; network outages in 2022 create reliability concerns for payment infrastructure; SEP-7 equivalent not standardised |
| Celo | Mobile-first design; African stablecoin (cUSD, cEUR, cREAL) | Smaller issuer ecosystem for NGN/KES/GHS specifically; fewer wallet integrations in the Nigerian merchant space |
| TRON / BNB Chain | Low fees; USDT widely used | Centralisation concerns; no African stablecoin equivalents; regulatory uncertainty |

### Why SEP-0007 specifically

SEP-0007 lets the backend encode the full payment intent (address, amount, memo,
asset) into a single URI. The frontend renders this as a QR code. The customer's
Stellar wallet decodes the URI, pre-fills all fields, and the customer only needs
to confirm — no copy-paste of addresses. This eliminates the most common source
of user error in crypto payments.

### Why support both PUBLIC and TESTNET

Development and CI run against TESTNET to avoid real funds. The
`NEXT_PUBLIC_CNGN_ISSUER` env var controls which issuer address is used; leaving
it unset gracefully degrades to XLM-only mode without breaking the QR flow.

## Consequences

### Positive

- Transaction fees are negligible (<$0.01), making micro-payments economically
  viable for African merchant use cases.
- Near-instant finality (3–5 seconds) gives a good payment UX — the QR code
  polling interval is 3 seconds, which aligns with Stellar's settlement time.
- SEP-0007 means zero wallet integration work on the frontend; any compliant
  wallet works out of the box.
- Horizon's public API means no infrastructure to run for balance/transaction
  queries during development.
- cNGN and cKES issuers are already in production on Stellar, meaning the
  African stablecoin roadmap doesn't depend on bridging or wrapping.

### Negative / Risks

- **Single-chain risk**: if Stellar experiences an outage or governance issue,
  the payment path is unavailable. Mitigation: monitor Stellar status; design
  the withdrawal layer (Paystack) to be independent of the inbound payment layer.
- **Asset availability**: cNGN withdrawals (cash-out via Paystack) are live, but
  cKES and cGHS are on the roadmap. Until they're available, those balances
  can only be swapped, not cashed out.
- **SEP-0007 adoption**: only Stellar wallets understand SEP-7 URIs. Non-Stellar
  users cannot pay. This is acceptable while the target market is crypto-native
  users; it becomes a constraint if we expand to purely fiat-paying customers
  (who would use the onramp flow instead).

### Neutral

- Engineers unfamiliar with Stellar will need to learn Horizon's API patterns
  and StrKey encoding. The learning curve is shallow compared to EVM.
- The Stellar testnet is reset periodically (approximately annually); CI
  environment setup should not rely on persistent testnet accounts.

## Links

- [Stellar Developer Documentation](https://developers.stellar.org/)
- [SEP-0007: URI Scheme for Transactions](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md)
- [Horizon REST API](https://developers.stellar.org/api/horizon)
- [cNGN on Stellar](https://stellar.expert/explorer/public/asset/cNGN)
- [ADR-003: Payment Providers (Paystack + Flutterwave)](./0003-payment-providers.md)
