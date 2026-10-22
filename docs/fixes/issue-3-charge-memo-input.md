# Issue 3 — No way for merchants to set a memo on a charge

## Problem

`PaymentRequest` already carries a `memo` field in the API response, and the
QR receipt page (`app/request/[id]/page.tsx`) already rendered it under
"Reference (memo)" — but the charge UI never let a merchant set one, so it
was always whatever the backend auto-generated.

## Fix

- `api.createPaymentRequest` (`lib/api.ts`) now accepts an optional `memo`
  argument and includes it in the POST body when present.
- The charge screen (`app/(app)/charge/page.tsx`) gained an optional
  "Note / memo" text input, capped at 28 characters (Stellar's memo-text
  limit is 28 bytes). The trimmed value is passed through to
  `api.createPaymentRequest`; an empty memo is omitted so the backend falls
  back to its own auto-generated reference, same as before.
- No changes were needed on the receipt page — it already renders
  `request.memo`, so a merchant-supplied note now shows up there
  automatically.

## Files changed

- `app/(app)/charge/page.tsx`
- `lib/api.ts`
