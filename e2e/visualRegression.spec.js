/**
 * Visual regression tests — snapshot key pages at desktop (1440px) and mobile (375px).
 * Run with: npx playwright test e2e/visualRegression.spec.js --update-snapshots
 * on first run to generate baseline screenshots.
 */
import { test, expect } from '@playwright/test'

const PAGES = [
  { name: 'dashboard',   path: '/dashboard' },
  { name: 'ads-library', path: '/ads' },
  { name: 'review',      path: '/review' },
  { name: 'settings',    path: '/settings' },
  { name: 'users',       path: '/users' },
]

test.describe('Visual regression — desktop (1440px)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  for (const { name, path } of PAGES) {
    test(`${name} page matches snapshot`, async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('auth_token', 'mock-jwt-token')
      })
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      // Allow charts and lazy-loaded content to settle
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot(`${name}-desktop.png`, {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      })
    })
  }
})

test.describe('Visual regression — mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  for (const { name, path } of PAGES) {
    test(`${name} page matches mobile snapshot`, async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('auth_token', 'mock-jwt-token')
      })
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot(`${name}-mobile.png`, {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      })
    })
  }
})
