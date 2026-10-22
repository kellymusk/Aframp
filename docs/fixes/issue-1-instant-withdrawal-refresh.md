# Issue 1 — Recent withdrawals list didn't refresh after a cash-out

## Problem

After submitting a valid withdrawal on `/withdraw`, the "Recent cash-outs"
list did not show the new entry until the user manually reloaded the page.

## Root cause

`submit()` in `app/(app)/withdraw/page.tsx` awaited `api.createWithdrawal`
and then awaited a full `load()` (balances + withdrawals) before clearing
the submitting state. In practice the freshly-created withdrawal is not
guaranteed to be reflected by the very next `listWithdrawals` read (it's a
separate request against a separate read path), so the UI could render a
list that still didn't contain the withdrawal the user just created —
appearing to "not refresh" until a later manual reload happened to catch it.

## Fix

- `api.createWithdrawal` already returns the created `Withdrawal` object.
  `submit()` now prepends that object to local state immediately
  (`setWithdrawals((current) => [created, ...current])`), so the new entry
  is guaranteed to appear the instant the request succeeds — no dependency
  on a subsequent list fetch racing the write.
- The form fields (`amount`, `bankCode`, `accountNumber`) are reset after a
  successful submission.
- A background reconciliation `load()` still runs after submit (and now
  also on a 15s interval) so the entry's status (`pending` → `processing` →
  `completed`/`failed`) keeps updating without a manual reload, since a
  payout provider can flip that status asynchronously with no client action.

## Files changed

- `app/(app)/withdraw/page.tsx`
