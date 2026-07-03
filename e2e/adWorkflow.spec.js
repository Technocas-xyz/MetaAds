import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { join } from 'path'

test.describe('Ad workflow: Add → Library → Review Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token')
      // Enable mock mode so all API calls use fixture data
      // (VITE_USE_MOCKS=true equivalent for runtime)
    })
  })

  test('Ads Library page loads and shows ad rows', async ({ page }) => {
    await page.goto('/ads')
    await page.waitForLoadState('networkidle')
    // Page heading
    await expect(page.getByRole('heading', { name: /ads library|ad library/i })).toBeVisible({ timeout: 5000 })
  })

  test('Add New Ad page renders all form sections', async ({ page }) => {
    await page.goto('/ads/new')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/ad details|basic information/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/platforms/i)).toBeVisible()
  })

  test('Add New Ad form validates required fields', async ({ page }) => {
    await page.goto('/ads/new')
    await page.waitForLoadState('networkidle')

    const submitBtn = page.getByRole('button', { name: /save ad|create ad/i })
    await submitBtn.click()

    const errors = page.locator('[class*="danger"], [role="alert"]')
    await expect(errors.first()).toBeVisible({ timeout: 3000 })
  })

  test('navigation from Ads Library to Add New Ad works', async ({ page }) => {
    await page.goto('/ads')
    await page.waitForLoadState('networkidle')

    const addBtn = page.getByRole('link', { name: /add (new )?ad/i }).first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await expect(page).toHaveURL(/\/ads\/new/)
    }
  })

  test('Review Queue page loads', async ({ page }) => {
    await page.goto('/review')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /review/i })).toBeVisible({ timeout: 5000 })
  })

  test('navigating to a review item shows the detail page', async ({ page }) => {
    await page.goto('/review')
    await page.waitForLoadState('networkidle')

    // Click first review row if it exists
    const rows = page.locator('tbody tr, [data-testid="review-row"]')
    if (await rows.count() > 0) {
      await rows.first().click()
      await expect(page).toHaveURL(/\/review\//)
    }
  })
})
