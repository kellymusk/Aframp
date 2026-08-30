# Issue 3: Consolidated multi-asset view on the wallet page

## Problem

The wallet page showed balances as a flat list, one line per asset. Merchants
holding both XLM and cNGN had no per-asset context (history, cash-out) beyond
the number itself.

## What changed

- **`components/wallet/asset-cards.tsx`** (new) — replaces the flat balance
  list with a card grid, one card per asset:
  - Each card shows the asset's available + pending balance via the shared
    `BalanceFigure` component from [[issue-1-pending-balance]].
  - Renders a `Sparkline` (`components/ui/sparkline.tsx`, pre-existing) for
    7-day balance history when a `history` prop supplies it. The balances API
    doesn't return history data yet, so `history` is optional and the
    sparkline simply doesn't render until it does — this was implemented as
    "wire it up when the data exists" rather than fabricating fake history.
  - Adds a "Cash out" button on cards for assets with a real withdraw path
    (currently cNGN only, matching the existing `/withdraw` page which is
    cNGN-only server-side) linking to `/withdraw`.

- **`app/(app)/wallet/page.tsx`** — swaps the plain `<ul>` of `BalanceFigure`
  rows (added in issue 1) for `<AssetCards balances={balances} />`, and widens
  the page's content column from `max-w-xl` to `max-w-2xl` so two cards fit
  side by side on wider screens.

## Acceptance criteria

- [x] Each asset shown as a card with available + pending balance
- [x] Sparkline shows 7-day balance history if the API provides it (wired to
      an optional `history` prop; renders once the API exposes the data)
- [x] "Cash out" button on each cNGN card links to the withdraw flow
