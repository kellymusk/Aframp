// LHCI puppeteer script: seed an authenticated session for protected pages.
//
// Mirrors the e2e session mock (e2e/payment-request.spec.ts): the app reads
// the session from the httpOnly /api/session cookie, so public pages render
// a spinner/redirect without one. This script POSTs a seeded session from a
// same-origin page before Lighthouse navigates, so /home, /charge and
// /withdraw audit their authenticated shells instead of the login redirect.
//
// Runs before every collected URL; public pages skip seeding.

const SEEDED_SESSION = {
  token: 'lhci-seed-token',
  userId: 'lhci-user',
  merchantId: 'lhci-merchant',
}

const AUTHENTICATED_PATHS = ['/home', '/charge', '/withdraw']

module.exports = async (browser, context) => {
  const { url } = context
  const { pathname } = new URL(url)
  if (!AUTHENTICATED_PATHS.includes(pathname)) {
    return
  }

  const page = await browser.newPage()
  try {
    await page.goto(new URL('/login', url).toString(), { waitUntil: 'domcontentloaded' })
    await page.evaluate(
      (session) =>
        fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(session),
        }).then((res) => {
          if (!res.ok) {
            throw new Error(`seed session failed: ${res.status}`)
          }
        }),
      SEEDED_SESSION
    )
  } finally {
    await page.close()
  }
}
