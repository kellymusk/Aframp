# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Aframp
frontend. ADRs document significant design decisions — not what was built, but
*why* it was built that way, what alternatives were considered, and what
trade-offs were accepted.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0000](./0000-adr-template.md) | ADR template | — |
| [0001](./0001-stellar-network.md) | Stellar Network as the Settlement Layer | Accepted |
| [0002](./0002-no-bff-api-layer.md) | Browser-to-Backend Direct API Calls (No BFF Layer) | Accepted |
| [0003](./0003-payment-providers.md) | Payment Providers — Paystack (primary) and Flutterwave (secondary) | Accepted |
| [0004](./0004-csrf-protection.md) | CSRF Protection and Auth Token Storage | Accepted |

## How to use

- **Reading**: start with the ADR most relevant to the area you're working in.
  Cross-links at the bottom of each ADR point to related decisions.
- **Writing**: copy `0000-adr-template.md`, increment the number, fill in all
  sections, and add a row to the index above. Use status `Proposed` until the
  decision is merged; change to `Accepted` in the same PR.
- **Superseding**: if a later decision reverses an earlier one, set the old
  ADR's status to `Superseded by ADR-XXXX` and reference the old ADR in the
  new one's Context section.

## Format

These ADRs follow the
[joelparkerhenderson ADR template](https://github.com/joelparkerhenderson/architecture-decision-record).
Each record has: **Context** (the forces at play), **Decision** (what we chose),
**Rationale** (why, with alternatives), **Consequences** (positive, negative,
neutral), and **Links**.
