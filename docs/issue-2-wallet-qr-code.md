# Issue 2: QR code for the wallet address

## Problem

The wallet page only showed the raw Stellar address as text. Customers and
merchants sharing the address in person had to copy/paste or hand-type it —
error-prone for a 56-character Stellar public key.

## What changed

- **`package.json`** — added `qrcode` (pinned to `1.5.4`) as a dependency and
  `@types/qrcode` (pinned to `1.5.5`) as a dev dependency. `qrcode` renders
  directly to a `<canvas>`, which is what makes the PNG download possible
  without a second conversion step or an external image service.

- **`components/wallet/wallet-qr-code.tsx`** (new) — a client component that:
  - Generates the QR code entirely in the browser via `QRCode.toCanvas`,
    encoding `wallet.address` directly — the address never leaves the client
    to produce the image.
  - Renders the canvas with an accessible `role="img"` and a descriptive
    `aria-label` so screen readers announce what the code encodes.
  - Provides a "Download QR as PNG" button that reads the canvas back out via
    `canvas.toDataURL('image/png')` and triggers a browser download — no
    server round-trip.
  - Surfaces generation failures as inline text instead of a broken image.

- **`app/(app)/wallet/page.tsx`** — renders `<WalletQrCode address={wallet.address} />`
  directly below the address text in the "Your payment address" card.

## Acceptance criteria

- [x] QR code generated client-side from `wallet.address`
- [x] Download-as-PNG button below the QR code
- [x] Uses an accessible, dependency-pinned QR library (`qrcode`, pinned exact
      version, `role="img"` + `aria-label` on the rendered canvas)
