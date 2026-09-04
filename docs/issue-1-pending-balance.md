# Issue 1: Surface pending balance in the UI

## Problem

`Balance` (see `lib/api.ts`) carries both `available` and `pending` stroop
fields, but only `available` was ever rendered — merchants had no visibility
into funds still awaiting blockchain confirmation.

## What changed

- **`components/wallet/balance-figure.tsx`** (new) — a shared component that
  renders the available balance as the primary figure and, when `pending > 0`,
  a secondary "N pending" line. The pending line is a Radix tooltip trigger;
  hovering/focusing it explains that pending balance is awaiting blockchain
  confirmations and will move into the available balance once confirmed.
  Supports a `size` prop (`lg` for hero figures, `sm` for compact cards) so it
  can be reused across pages.

- **`app/(app)/home/page.tsx`** — the "Available to cash out" balance list now
  renders `BalanceFigure` per asset instead of a bare number, so the home page
  shows pending balance alongside available balance.

- **`app/(app)/wallet/page.tsx`** — the wallet page previously showed only the
  raw address with no balance information at all. It now fetches balances via
  `api.getBalances` alongside the existing wallet/me calls and renders a new
  "Balances" section above the payment address, using the same
  `BalanceFigure` component (in its compact `sm` form).

## Why a shared component

Both the wallet page and home page needed identical available/pending/tooltip
behavior, and issue 3 (asset cards) needs the same figure again inside each
card — centralizing it avoids three divergent implementations of the same
tooltip copy and formatting logic.

## Acceptance criteria

- [x] Wallet page and home page both show pending balance as a secondary figure
- [x] Tooltip explains what "pending" means (awaiting blockchain confirmations)
