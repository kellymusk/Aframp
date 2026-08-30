# Issue 4 — QR receipt page didn't warn customers of imminent expiry

## Problem

`PaymentRequest.expires_at` exists, and the receipt page
(`app/request/[id]/page.tsx`) rendered a plain countdown string, but:

- It never turned amber as time ran low.
- The page only flipped to an "expired" state once the 3s background poll
  caught up with the backend's `status: 'expired'`, not the instant the
  local clock hit zero.
- There was no way to get a new code from the expired screen other than
  navigating back to the keypad and re-entering the amount.

## Fix

- **Reused** `components/onramp/countdown-timer.tsx`'s `<CountdownTimer />`
  in place of the page's own inline `secondsUntil`/`formatCountdown` logic.
- Reworked `CountdownTimer` internally to track total seconds remaining
  (rather than only mod-60 minutes/seconds), and changed the "urgent" amber
  state to trigger at **under 60 seconds** remaining (previously under 5
  minutes), per the acceptance criteria.
- The receipt page now passes `onExpire` to flip a local `clientExpired`
  flag the moment the client-side clock reaches 0, so the expired view
  shows up immediately instead of waiting on the next poll tick.
- The expired view now reads **"This payment code has expired"** and adds
  a **"Generate new code"** button. If the viewer has a merchant session
  (the common case — this page is shown from the merchant's own device),
  it calls `api.createPaymentRequest` again with the same amount, asset,
  and memo and navigates to the freshly created request. Without a
  session, it falls back to sending the viewer back to `/charge`.

## Files changed

- `components/onramp/countdown-timer.tsx`
- `app/request/[id]/page.tsx`
