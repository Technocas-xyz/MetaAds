/**
 * Number and date formatting utilities.
 */

export function formatNumber(n, opts = {}) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US', opts)
}

export function formatCurrency(n, currency = 'USD', compact = false) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatPercent(n, decimals = 1) {
  if (n == null) return '—'
  return `${Number(n).toFixed(decimals)}%`
}

export function formatCompact(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function formatDate(iso, opts = {}) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...opts,
  })
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelative(iso) {
  if (!iso) return 'Never'
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30)  return `${days}d ago`
  return formatDate(iso)
}

export function truncate(str, max = 80) {
  if (!str) return ''
  return str.length > max ? `${str.slice(0, max)}…` : str
}
