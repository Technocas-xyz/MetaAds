import '@testing-library/jest-dom'
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { toHaveNoViolations } from 'jest-axe'
import { server } from './mocks/server'

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations)

// MSW lifecycle
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => { server.resetHandlers(); cleanup() })
afterAll(() => server.close())

// Browser API mocks missing from jsdom
window.matchMedia = vi.fn((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

// ResizeObserver / IntersectionObserver — must be real constructors (used by Radix + floating-ui)
class MockResizeObserver {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}
class MockIntersectionObserver {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}
global.ResizeObserver    = MockResizeObserver
global.IntersectionObserver = MockIntersectionObserver

// scrollIntoView used by some Radix components
window.HTMLElement.prototype.scrollIntoView = vi.fn()
window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()

// Silence specific warnings from Radix UI portals
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Not implemented: navigation') ||
       args[0].includes('Error: Could not parse CSS stylesheet'))
    ) return
    originalError(...args)
  }
})
afterAll(() => { console.error = originalError })
