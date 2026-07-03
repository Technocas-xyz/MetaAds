import { describe, it, expect } from 'vitest'
import {
  required,
  minLength,
  maxLength,
  isEmail,
  isUrl,
  isPositiveNumber,
  inRange,
  compose,
} from '../../../lib/validators'

describe('required', () => {
  it('returns error for empty string', () => {
    expect(required('')).toBeTruthy()
  })

  it('returns error for whitespace-only string', () => {
    expect(required('   ')).toBeTruthy()
  })

  it('returns error for null/undefined', () => {
    expect(required(null)).toBeTruthy()
    expect(required(undefined)).toBeTruthy()
  })

  it('returns error for empty array', () => {
    expect(required([])).toBeTruthy()
  })

  it('returns null for valid string', () => {
    expect(required('hello')).toBeNull()
  })

  it('returns null for non-empty array', () => {
    expect(required(['a'])).toBeNull()
  })
})

describe('minLength', () => {
  it('returns error when value is too short', () => {
    expect(minLength(5)('hi')).toBeTruthy()
  })

  it('returns null when value meets minimum', () => {
    expect(minLength(3)('hello')).toBeNull()
  })

  it('returns null when value is empty (required handles that)', () => {
    expect(minLength(3)('')).toBeNull()
  })
})

describe('maxLength', () => {
  it('returns error when value exceeds max', () => {
    expect(maxLength(5)('too long!')).toBeTruthy()
  })

  it('returns null when under max', () => {
    expect(maxLength(20)('short')).toBeNull()
  })
})

describe('isEmail', () => {
  it('returns null for valid email', () => {
    expect(isEmail('user@example.com')).toBeNull()
    expect(isEmail('a+b@sub.domain.io')).toBeNull()
  })

  it('returns error for invalid email', () => {
    expect(isEmail('not-an-email')).toBeTruthy()
    expect(isEmail('@nodomain.com')).toBeTruthy()
  })

  it('returns null for empty (field not required)', () => {
    expect(isEmail('')).toBeNull()
    expect(isEmail(null)).toBeNull()
  })
})

describe('isUrl', () => {
  it('returns null for valid https URL', () => {
    expect(isUrl('https://example.com/path?q=1')).toBeNull()
  })

  it('returns null for http URL', () => {
    expect(isUrl('http://localhost:3000')).toBeNull()
  })

  it('returns error for non-URL string', () => {
    expect(isUrl('not a url')).toBeTruthy()
    expect(isUrl('example.com')).toBeTruthy()
  })

  it('returns null for empty (field not required)', () => {
    expect(isUrl('')).toBeNull()
    expect(isUrl(null)).toBeNull()
  })
})

describe('isPositiveNumber', () => {
  it('returns null for valid positive', () => {
    expect(isPositiveNumber(5)).toBeNull()
    expect(isPositiveNumber(0.01)).toBeNull()
  })

  it('returns error for zero', () => {
    expect(isPositiveNumber(0)).toBeTruthy()
  })

  it('returns error for negative', () => {
    expect(isPositiveNumber(-1)).toBeTruthy()
  })

  it('returns null for empty/null (required handles that)', () => {
    expect(isPositiveNumber('')).toBeNull()
    expect(isPositiveNumber(null)).toBeNull()
  })
})

describe('inRange', () => {
  it('returns null when in range', () => {
    expect(inRange(0, 100)(50)).toBeNull()
  })

  it('returns error when below min', () => {
    expect(inRange(0, 100)(-1)).toBeTruthy()
  })

  it('returns error when above max', () => {
    expect(inRange(0, 100)(101)).toBeTruthy()
  })
})

describe('compose', () => {
  it('returns null when all validators pass', () => {
    expect(compose(required, isEmail)('user@test.com')).toBeNull()
  })

  it('returns first error when one fails', () => {
    expect(compose(required, isEmail)('')).toBeTruthy()
  })

  it('stops at first error', () => {
    const alwaysErr = () => 'always fails'
    const neverRun  = () => 'never reached'
    expect(compose(alwaysErr, neverRun)('x')).toBe('always fails')
  })
})
