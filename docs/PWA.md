# PWA install prompt

Aframp is installable as a PWA.

- `app/manifest.ts` - web app manifest (served at `/manifest.webmanifest`).
- `public/sw.js` - minimal service worker, registered in production by
  `components/pwa/service-worker-register.tsx`. It does **not** cache anything,
  so financial data is never stale.
- `hooks/use-install-prompt.ts` - captures `beforeinstallprompt`, counts visits
  (once per browser session, in `localStorage`), and exposes `canInstall`,
  `install()` and `dismiss()`.
- `components/pwa/install-prompt-banner.tsx` - the banner, mounted in
  `app/layout.tsx`.

## Behaviour

The banner appears from the **2nd visit**, only when the browser supports
install, the app is not already running standalone, and the user has not
dismissed it in the last **14 days**. Tunables are exported constants in the
hook (`MIN_VISITS`, `DISMISS_COOLDOWN_MS`).

Notes:

- `beforeinstallprompt` is Chromium-only; Safari/iOS users will not see the banner.
- The icon is a single SVG; add 192/512 PNGs to the manifest for broader support.
