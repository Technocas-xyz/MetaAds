/**
 * Reusable synchronous validators. Return an error string or null.
 */

export function required(value) {
  if (value == null) return 'Required'
  if (typeof value === 'string' && value.trim() === '') return 'Required'
  if (Array.isArray(value) && value.length === 0) return 'Select at least one option'
  return null
}

export function minLength(min) {
  return (value) => {
    if (!value) return null
    return String(value).length < min ? `Minimum ${min} characters` : null
  }
}

export function maxLength(max) {
  return (value) => {
    if (!value) return null
    return String(value).length > max ? `Maximum ${max} characters` : null
  }
}

export function isEmail(value) {
  if (!value) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email address'
}

export function isUrl(value) {
  if (!value) return null
  try {
    new URL(value)
    return null
  } catch {
    return 'Enter a valid URL (include https://)'
  }
}

export function isPositiveNumber(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return isNaN(n) || n <= 0 ? 'Must be a positive number' : null
}

export function inRange(min, max) {
  return (value) => {
    if (value === '' || value == null) return null
    const n = Number(value)
    if (isNaN(n)) return 'Must be a number'
    if (n < min || n > max) return `Must be between ${min} and ${max}`
    return null
  }
}

export function compose(...validators) {
  return (value) => {
    for (const v of validators) {
      const err = v(value)
      if (err) return err
    }
    return null
  }
}
