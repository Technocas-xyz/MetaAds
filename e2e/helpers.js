/**
 * Shared E2E helpers for authentication and common interactions.
 */

export async function loginAs(page, { email = 'test@decoinks.com', password = 'password123' } = {}) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  // Wait for redirect away from /login
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
}

export async function seedLocalStorage(page, token = 'mock-jwt-token') {
  await page.addInitScript((t) => {
    localStorage.setItem('auth_token', t)
  }, token)
}
