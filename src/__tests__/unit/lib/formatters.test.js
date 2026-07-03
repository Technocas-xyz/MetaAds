import { describe, it, expect } from 'vitest'
import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatCompact,
  formatDate,
  formatRelative,
  truncate,
} from '../../../lib/formatters'

describe('formatNumber', () => {
  it('formats integers with locale separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('returns "—" for null/undefined', () => {
    expect(formatNumber(null)).toBe('—')
    expect(formatNumber(undefined)).toBe('—')
  })
})

describe('formatCurrency', () => {
  it('formats USD values', () => {
    expect(formatCurrency(49.99)).toBe('$49.99')
  })

  it('returns "—" for null', () => {
    expect(formatCurrency(null)).toBe('—')
  })
})

describe('formatPercent', () => {
  it('formats with 1 decimal by default', () => {
    expect(formatPercent(73.456)).toBe('73.5%')
  })

  it('respects custom decimals', () => {
    expect(formatPercent(73.456, 0)).toBe('73%')
  })

  it('returns "—" for null', () => {
    expect(formatPercent(null)).toBe('—')
  })
})

describe('formatCompact', () => {
  it('formats millions', () => {
    expect(formatCompact(1_500_000)).toBe('1.5M')
  })

  it('formats thousands', () => {
    expect(formatCompact(2500)).toBe('2.5K')
  })

  it('formats small numbers as-is', () => {
    expect(formatCompact(42)).toBe('42')
  })

  it('returns "—" for null', () => {
    expect(formatCompact(null)).toBe('—')
  })
})

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2026-05-01T00:00:00Z')
    expect(result).toMatch(/May/)
    expect(result).toMatch(/2026/)
  })

  it('returns "—" for null/empty', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('')).toBe('—')
  })
})

describe('formatRelative', () => {
  it('returns "Never" for null', () => {
    expect(formatRelative(null)).toBe('Never')
  })

  it('returns "Just now" for < 1 minute ago', () => {
    const recent = new Date(Date.now() - 30_000).toISOString()
    expect(formatRelative(recent)).toBe('Just now')
  })

  it('returns minutes for < 1 hour ago', () => {
    const ago = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatRelative(ago)).toMatch(/5m ago/)
  })

  it('returns hours for < 24 hours ago', () => {
    const ago = new Date(Date.now() - 3 * 3_600_000).toISOString()
    expect(formatRelative(ago)).toMatch(/3h ago/)
  })
})

describe('truncate', () => {
  it('returns string unchanged if under max', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates and appends ellipsis', () => {
    expect(truncate('hello world', 5)).toBe('hello…')
  })

  it('returns empty string for null/undefined', () => {
    expect(truncate(null)).toBe('')
    expect(truncate(undefined)).toBe('')
  })
})
