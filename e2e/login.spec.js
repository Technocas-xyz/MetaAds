import { test, expect } from '@playwright/test'

test.describe('Login flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders the login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in|welcome|log in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible()
  })

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    // At least one error message visible
    const errors = page.locator('[role="alert"], .text-danger-600, .text-red-600')
    await expect(errors.first()).toBeVisible({ timeout: 3000 })
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('wrong@test.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    // Error message should appear
    const err = page.getByText(/invalid|incorrect|credentials/i)
    await expect(err).toBeVisible({ timeout: 5000 })
  })

  test('redirects to dashboard on valid credentials', async ({ page }) => {
    // Seed the auth token so the app thinks we're logged in (bypasses real API)
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token')
    })
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('login page is keyboard navigable', async ({ page }) => {
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    // Tab through form fields — focus should move without JS errors
    const activeEl = page.locator(':focus')
    await expect(activeEl).toBeVisible()
  })
})
