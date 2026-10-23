import { expect, test, type Page } from '@playwright/test'

async function signedIn(page: Page) {
  // The session lives in an httpOnly cookie behind /api/session.
  await page.route('**/api/session', (route) =>
    route.fulfill({
      json:
        route.request().method() === 'GET'
          ? { token: 'e2e-token', userId: 'e2e-user', merchantId: 'e2e-merchant' }
          : { ok: true },
    })
  )
  await page.route('**/backend/me', (route) =>
    route.fulfill({
      json: {
        id: 'e2e-user',
        email: 'merchant@example.com',
        name: 'E2E',
        kyc_status: 'approved',
        is_admin: false,
      },
    })
  )
  for (const path of ['balance', 'transactions*', 'payment-requests*']) {
    await page.route(`**/backend/${path}`, (route) => route.fulfill({ json: [] }))
  }
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

test.beforeEach(async ({ page }) => {
  await signedIn(page)
  await page.goto('/home')
  // Don't interact with server-rendered markup before React hydrates it.
  await page.waitForLoadState('networkidle')
})

test('the sidebar is collapsed behind a menu button on a phone', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
  // The desktop sidebar is hidden, so its links are not on screen yet.
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Cash out' })
  ).toBeHidden()
  await expectNoHorizontalScroll(page)
})

test('opens the menu, navigates, and closes the drawer', async ({ page }) => {
  await page.getByRole('button', { name: 'Open menu' }).click()
  const drawer = page.getByRole('dialog', { name: 'Menu' })
  await expect(drawer).toBeVisible()

  await drawer.getByRole('link', { name: 'Cash out' }).click()

  await expect(page).toHaveURL(/\/withdraw$/)
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden()
  await expectNoHorizontalScroll(page)
})

test('Escape closes the menu', async ({ page }) => {
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden()
})

for (const route of ['/home', '/charge', '/transactions', '/settings']) {
  test(`${route} has no horizontal scroll`, async ({ page }) => {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    await expectNoHorizontalScroll(page)
  })
}
