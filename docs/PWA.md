# PWA install prompt

Aframp is installable as a PWA.

- `app/manifest.ts` - web app manifest (served at `/manifest.webmanifest`).
- `public/sw.js` - service worker, registered by `app/layout.tsx`. It only
  loads the push-notification handler and does **not** cache anything, so
  financial data is never stale.
- `hooks/use-install-prompt.ts` - captures `beforeinstallprompt`, counts visits
  in `localStorage`, detects iOS (which has no install prompt API, so it gets
  instructions instead), and exposes `eligible`, `platform`, `install()` and
  `dismiss()`.
- `components/pwa/install-prompt-banner.tsx` - the banner, mounted in
  `app/layout.tsx`.

## Behaviour

The banner appears from the **2nd visit** (`MIN_VISITS_BEFORE_PROMPT` in the
hook), only when the app is not already running standalone and the user has
not dismissed it.

Notes:

- `beforeinstallprompt` is Chromium-only; iOS Safari users get add-to-home-screen instructions instead.
- The icon is a single SVG; add 192/512 PNGs to the manifest for broader support.
