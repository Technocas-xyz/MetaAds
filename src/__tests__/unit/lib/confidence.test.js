import { describe, it, expect } from 'vitest'
import {
  getConfidenceLevel,
  getConfidenceColor,
  getConfidenceBadgeColor,
} from '../../../lib/confidence'

// Thresholds from constants.js: HIGH=70, MEDIUM=40
describe('getConfidenceLevel', () => {
  it('returns "High" for score >= 70', () => {
    expect(getConfidenceLevel(70)).toBe('High')
    expect(getConfidenceLevel(100)).toBe('High')
    expect(getConfidenceLevel(87)).toBe('High')
  })

  it('returns "Medium" for score in [40, 69]', () => {
    expect(getConfidenceLevel(40)).toBe('Medium')
    expect(getConfidenceLevel(69)).toBe('Medium')
    expect(getConfidenceLevel(55)).toBe('Medium')
  })

  it('returns "Low" for score < 40', () => {
    expect(getConfidenceLevel(0)).toBe('Low')
    expect(getConfidenceLevel(39)).toBe('Low')
    expect(getConfidenceLevel(20)).toBe('Low')
  })
})

describe('getConfidenceColor', () => {
  it('returns emerald class for High', () => {
    expect(getConfidenceColor('High')).toMatch(/emerald/)
  })

  it('returns amber class for Medium', () => {
    expect(getConfidenceColor('Medium')).toMatch(/amber/)
  })

  it('returns red class for Low', () => {
    expect(getConfidenceColor('Low')).toMatch(/red/)
  })

  it('returns gray for unknown level', () => {
    expect(getConfidenceColor('Unknown')).toMatch(/gray/)
  })
})

describe('getConfidenceBadgeColor', () => {
  it('returns ring-based emerald class for High', () => {
    const cls = getConfidenceBadgeColor('High')
    expect(cls).toMatch(/emerald/)
    expect(cls).toMatch(/ring/)
  })

  it('returns ring-based amber class for Medium', () => {
    expect(getConfidenceBadgeColor('Medium')).toMatch(/amber/)
  })

  it('returns ring-based red class for Low', () => {
    expect(getConfidenceBadgeColor('Low')).toMatch(/red/)
  })

  it('returns gray fallback for unknown', () => {
    expect(getConfidenceBadgeColor('?')).toMatch(/gray/)
  })
})
