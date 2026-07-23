import { cn } from '../../../lib/utils'

export function formatCurrency(val) {
  if (val === null || val === undefined || val === '') return '—'
  return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
export function formatPercent(val) {
  if (val === null || val === undefined || val === '') return '—'
  return `${Number(val).toFixed(2)}%`
}
export function formatCount(val) {
  if (val === null || val === undefined || val === '') return '—'
  return Number(val).toLocaleString()
}
export function formatFreq(val) {
  if (val === null || val === undefined || val === '') return '—'
  return Number(val).toFixed(2)
}

export default function MetricCard({ label, value, format = 'raw', className }) {
  let display = value ?? '—'
  if (value !== null && value !== undefined && value !== '') {
    if (format === 'currency') display = formatCurrency(value)
    else if (format === 'percent') display = formatPercent(value)
    else if (format === 'count') display = formatCount(value)
    else if (format === 'freq') display = formatFreq(value)
  } else {
    display = '—'
  }

  return (
    <div className={cn('rounded-lg border border-border-default bg-white p-3 text-center', className)}>
      <p className="text-[10px] text-text-tertiary uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-bold text-text-primary">{display}</p>
    </div>
  )
}
