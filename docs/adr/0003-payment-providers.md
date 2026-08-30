# ADR-003: Payment Providers — Paystack (primary) and Flutterwave (secondary)

**Status:** Accepted  
**Date:** 2024-01-15  
**Deciders:** Core engineering team  
**Ticket / Issue:** [#523](https://github.com/aframp/aframp/issues/523)

---

## Context

Aframp's offramp product allows merchants to cash out crypto balances (starting
with cNGN) to a Nigerian bank account. This requires a fiat payment gateway that
can:

1. Receive a disbursement instruction from the Aframp backend.
2. Push funds to a named Nigerian bank account (any bank in the NIBSS network).
3. Provide a callback / polling mechanism to report transfer status.
4. Expose an API that can be called server-side (from the Rust/Axum backend)
   without any browser involvement.

Additionally, the onramp product (fiat-to-crypto) may need to accept card
payments, bank transfers, and mobile money across multiple African countries
(Nigeria, Kenya, Ghana, South Africa, Uganda).

The frontend holds only the public API key for each provider
(`NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY`); all
secret keys and sensitive operations are kept server-side in the Rust backend.

## Decision

We will use **Paystack as the primary provider** for NGN withdrawals (cash-out
to Nigerian bank accounts), and **Flutterwave as the secondary provider** for
broader African market coverage (mobile money, additional currencies, multi-country
card payments).

Specific responsibilities:

- **Paystack** — cNGN withdrawals to Nigerian bank accounts via Paystack Transfer
  API. The minimum withdrawal floor follows Paystack's own floor (NGN 50, i.e.,
  500,000,000 stroops in our precision). The backend calls Paystack server-side
  and proxies the response to the frontend. Error messages from Paystack (e.g.,
  "invalid account number") are surfaced directly to the user.
- **Flutterwave** — multi-country payouts, mobile money (MTN MoMo, M-Pesa),
  and card-acceptance flows where Paystack is not supported. Currently configured
  via env vars but not yet active in production routes.

## Rationale

### Considered alternatives

| Option | Pros | Cons |
|--------|------|------|
| **Paystack (chosen for NGN)** | Market leader in Nigeria; excellent Nigerian bank transfer API with real-time status; well-documented Transfers API; webhook signature (`X-Paystack-Signature`) for secure callbacks; NGN minimum floor well-matched to our minimum; strong regulatory standing (CBN-licensed) | Nigeria-only coverage without additional products; no mobile money in Francophone Africa |
| **Flutterwave (chosen for multi-country)** | 30+ African countries; mobile money (MTN MoMo, M-Pesa, Airtel, Orange Money); card acquiring in NGN, KES, GHS, ZAR, UGX; webhook with `verif-hash` signature verification | Slightly less mature Nigerian bank transfer reliability than Paystack; higher API complexity |
| Stripe | Best developer experience globally; very reliable | Limited African coverage; no NGN bank transfer disbursements; not licensed in most African countries |
| Remita | Deep CBN/Nigerian government integration | Complex integration; API less developer-friendly; no multi-country support |
| Interswitch | Strong Nigerian interbank reach | Enterprise-focused; no self-service API for startups; no multi-country support |
| Mono / Stitch | Open banking / account verification | Disbursement-only is not their primary product; limited coverage |

### Why two providers rather than one

No single provider covers the full African footprint Aframp needs:

- **Nigeria**: Paystack has the most reliable NGN bank transfer API and the deepest
  NIBSS integration. It is the correct default for all NGN cash-outs.
- **Rest of Africa**: Flutterwave's multi-currency and mobile money coverage
  (M-Pesa in Kenya, MTN MoMo in Ghana/Uganda) is essential for the full
  onramp/offramp roadmap. Paystack's non-Nigerian coverage is limited.

Maintaining two integrations is a deliberate cost paid to avoid single-provider
lock-in and to serve the full target geography.

### Frontend responsibility boundary

The frontend's only direct interaction with payment providers is:

1. Rendering Paystack's inline JS widget for card tokenisation (using
   `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`) if card-based onramp is implemented.
2. Rendering Flutterwave's inline widget (using
   `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY`) for mobile money flows.

All actual transfer instructions, secret key usage, and webhook handling are
server-side concerns in the Rust backend. The frontend never sees secret keys.

### Webhook security

Per `SECURITY.md` contributor guidelines:

- Paystack webhooks must be verified with `X-Paystack-Signature` (HMAC-SHA512).
- Flutterwave webhooks must be verified with `verif-hash`.

Both verifications happen in the Rust backend. The frontend has no webhook
surface.

## Consequences

### Positive

- Paystack gives Aframp best-in-class Nigerian bank disbursement reliability
  from day one.
- Flutterwave provides an expansion path to mobile money and 30+ African
  countries without a new provider integration.
- Both providers have public API keys that are safe to embed in the frontend
  bundle; all sensitive operations are server-side only.
- Paystack's NGN floor (NGN 50) is well above the minimum practical
  cash-out amount, simplifying our own validation logic.

### Negative / Risks

- **Dual integration maintenance**: each provider has its own API versioning,
  SDK updates, and breaking changes. Engineering must track both.
- **Provider outages**: if Paystack's transfer API is down, NGN cash-outs
  are unavailable. Mitigation: the withdrawal status model
  (`pending → processing → completed/failed`) allows the backend to queue
  and retry; the frontend surfaces Paystack's failure messages directly.
- **KYC / compliance**: both providers require merchant KYC at certain
  transaction volumes. This is an operational dependency outside the frontend's
  scope.
- **Flutterwave encryption key** (`FLUTTERWAVE_ENCRYPTION_KEY`) must be
  stored server-side only and never exposed in a `NEXT_PUBLIC_` variable.

### Neutral

- Adding a third provider (e.g., Stripe for international card acceptance,
  Chipper Cash for peer transfers) is an additive change that does not affect
  this decision.
- The `provider` field on the `Withdrawal` type in `lib/api.ts` is nullable,
  which accommodates future providers without a schema migration.

## Links

- [`app/(app)/withdraw/page.tsx`](../../app/(app)/withdraw/page.tsx) — withdrawal UI
- [`lib/api.ts`](../../lib/api.ts) — `createWithdrawal` and `Withdrawal` type
- [`lib/banks.ts`](../../lib/banks.ts) — Nigerian bank code list (used with Paystack Transfer API)
- [Paystack Transfer API](https://paystack.com/docs/transfers/)
- [Flutterwave Transfer API](https://developer.flutterwave.com/docs/transfers)
- [SECURITY.md — Webhook Signature Verification](../../SECURITY.md)
- [ADR-001: Stellar Network](./0001-stellar-network.md)
