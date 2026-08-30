# SEP-0007 payment request QR — implementation & manual test plan

## What changed

`app/request/[id]/page.tsx` renders the `sep7_uri` returned by
`GET /payment-requests/:id` as a scannable QR code.

- **`lib/sep7.ts`** — added `isValidSep7Uri()`, which confirms a value is a
  non-empty `web+stellar:` URI before it's trusted for rendering. The page
  previously did a bare truthiness check (`request.sep7_uri ?`); it now uses
  this helper so a malformed or empty-payload URI falls back to the "no
  scannable code" message instead of rendering a QR code that can't be
  scanned.
- **QR block** — when the URI is valid, the page now also shows:
  - An **"Open in wallet"** link using the same `web+stellar:` URI. Both
    Freighter and Lobstr register this scheme as a protocol handler, so on
    the customer's own device (not just via camera scan) tapping this link
    opens the payment confirmation directly.
  - A **"Copy link"** button, for cases where neither scanning nor a
    registered handler is available (e.g. testing on desktop without a
    camera).
- **Fallback** — unchanged in behavior, still shown whenever `sep7_uri` is
  null (e.g. cNGN with no configured issuer): explains the customer must
  send the exact amount to the address/memo shown below.
- **`lib/__tests__/sep7.test.ts`** — unit coverage for `isValidSep7Uri()`
  (null, undefined, empty string, bare scheme, non-SEP-7 URL, valid URI).

## What still needs a human with real wallets

The acceptance criteria for this issue call for scanning a real request with
Freighter and Lobstr — that can't be done from this environment. Test plan
for whoever picks this up:

1. Create a payment request for an asset with a configured issuer (XLM works
   on testnet) via the charge flow, and open `/request/<id>` on a phone and
   on desktop.
2. **Freighter (mobile browser or extension-aware browser):**
   - Scan the QR with a phone camera → should prompt to open in Freighter →
     confirm the destination, memo, and amount match the request exactly.
   - Tap "Open in wallet" from the same device Freighter is installed on →
     should deep-link straight into Freighter's confirmation screen.
3. **Lobstr (mobile app):**
   - Scan the QR from within the Lobstr app's built-in scanner.
   - Scan with the system camera app and confirm it offers to open Lobstr
     (since Lobstr registers `web+stellar:`).
4. **Fallback path:** create/simulate a request for an asset with no
   configured issuer and confirm the "No scannable code" alert renders
   instead of a broken QR code, and that the address/memo fields below are
   correct.
5. Confirm "Copy link" produces a URI that, when pasted into a browser with
   Freighter installed, triggers the same confirmation prompt.

Record pass/fail per wallet in the PR before merging — this doc is not a
substitute for that sign-off.
