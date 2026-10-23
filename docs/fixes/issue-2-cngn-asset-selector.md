# Issue 2 — Charge screen hardcoded XLM, blocking cNGN merchants

## Problem

`app/(app)/charge/page.tsx` hardcoded `const ASSET = 'XLM'` with a comment
explaining that a cNGN request would come back with `sep7_uri: null` because
no issuer address was configured. There was no way for a merchant to charge
in cNGN once an issuer is eventually configured server-side.

## Fix

- Added an asset selector (`Select` from `components/ui/select`) with two
  options, `XLM` and `cNGN`.
- Whether cNGN is selectable is driven entirely by the new
  `NEXT_PUBLIC_CNGN_ISSUER` env var (documented in `.env.example`):
  - Unset (default): the `cNGN` option is disabled in the dropdown and a
    "cNGN coming soon" badge is shown next to the selector.
  - Set: `cNGN` becomes selectable and is sent as the asset on
    `api.createPaymentRequest`.
- Removed the hardcoded `ASSET` constant; the keypad amount label and the
  charge request now use the selected `asset` state.
- **No silent fallback to XLM**: if a non-XLM asset is charged and the
  backend responds without a `sep7_uri`, the UI surfaces an explicit error
  ("`<asset>` isn't ready for scannable charges yet.") instead of proceeding
  as if it were XLM.

## Files changed

- `app/(app)/charge/page.tsx`
- `.env.example`
