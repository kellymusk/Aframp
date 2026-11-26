# Sentry Session Replay – Masking Policy

Aframp handles balances, transaction amounts, wallet addresses and KYC
documents, so Session Replay is configured to be privacy-first. The
configuration lives in `sentry.client.config.ts`.

## Policy

| Setting | Value | Why |
| --- | --- | --- |
| `replaysSessionSampleRate` | `0` | No random-session recording. |
| `replaysOnErrorSampleRate` | `1.0` | A replay is only captured when an error occurs, to help debugging. |
| `maskAllText` | `true` | All rendered text (balances, amounts, addresses) is replaced with `*`. |
| `maskAllInputs` | `true` | Input values are never recorded. |
| `blockAllMedia` | `true` | Images, video, canvas and SVG are never recorded. |
| `block` | selector list | Sensitive elements are replaced by a blank placeholder. |
| `ignore` | selector list | Input events on these elements are not tracked. |
| `networkDetailAllowUrls` | `[]` | Request/response bodies and headers are never captured. |

## Marking sensitive UI

Add one of these attributes to any element that renders sensitive data; the
element is then excluded from replays entirely:

- `data-sentry-block` (generic)
- `data-sensitive`, `data-balance`, `data-amount`, `data-wallet-address`, `data-kyc`

Use `data-sentry-ignore` to stop tracking input events on a specific element.
The full selector list is `REPLAY_BLOCK_SELECTORS` / `REPLAY_IGNORE_SELECTORS`
in `sentry.client.config.ts`.

Breadcrumbs and event payloads are additionally scrubbed by
`lib/sentry-redact.ts` (see the shared redaction rules).

## Verifying a captured replay

Replay only runs in production builds (`enabled: NODE_ENV === 'production'`).

1. Build and start the app with `NEXT_PUBLIC_SENTRY_DSN` pointing at a test project.
2. Sign in, open a page showing balances/amounts/wallet addresses and a KYC
   upload, then trigger an error (e.g. a throwing test route).
3. Open the resulting replay in Sentry and confirm:
   - text appears as `***`, inputs are masked;
   - balance/amount/address/KYC elements show as blocked placeholders;
   - no images or documents are visible;
   - the network tab shows no request/response bodies.
4. If anything sensitive is visible, add `data-sentry-block` to that element
   (or extend the selector list) and re-verify.
