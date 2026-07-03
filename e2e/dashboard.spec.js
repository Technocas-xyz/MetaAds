import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token')
    })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('renders the main heading / page title', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /dashboard/i }).first()
    await expect(heading).toBeVisible({ timeout: 5000 })
  })

  test('renders KPI cards', async ({ page }) => {
    // At least one card with a numeric value should appear
    const kpiValues = page.locator('[class*="text-3xl"]')
    await expect(kpiValues.first()).toBeVisible({ timeout: 5000 })
  })

  test('renders chart sections', async ({ page }) => {
    // Charts render inside ResponsiveContainer — look for SVGs
    const charts = page.locator('svg')
    await expect(charts.first()).toBeVisible({ timeout: 8000 })
  })

  test('sidebar navigation is visible on desktop', async ({ page }) => {
    const sidebar = page.locator('nav').first()
    await expect(sidebar).toBeVisible()
  })

  test('skip-to-content link is in the DOM', async ({ page }) => {
    const skip = page.getByRole('link', { name: /skip to content/i })
    await expect(skip).toBeAttached()
  })

  test('skip link navigates to main content on Enter', async ({ page }) => {
    // Focus the skip link via keyboard
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: /skip to content/i })
    await expect(skip).toBeFocused({ timeout: 2000 })
    await page.keyboard.press('Enter')
    const main = page.locator('#main-content')
    await expect(main).toBeFocused()
  })
})
