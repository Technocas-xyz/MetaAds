import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import useCountUp from '../../hooks/useCountUp'

export default function KPICard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  trendUp,
  note,
  href,
  onClick,
  active = false,
}) {
  const animated = useCountUp(value)
  const display = typeof value === 'number' ? animated.toLocaleString() : (value ?? '—')
  // A 0% change says nothing — show it only when there is real movement.
  const hasTrend = trend !== undefined && trend !== null && Number(trend) !== 0

  const inner = (
    <div className="flex items-center gap-3">
      {Icon && (
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconBg)}>
          <Icon size={18} className={iconColor} aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-text-secondary" title={title}>{title}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <p className="text-2xl font-semibold leading-tight tracking-tight text-text-primary tabular-nums">
            {display}
          </p>
          {hasTrend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                trendUp ? 'text-success-600' : 'text-danger-600'
              )}
              title="vs previous 7 days"
            >
              {trendUp ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        {note && <p className="mt-0.5 truncate text-xs text-text-tertiary" title={note}>{note}</p>}
      </div>
    </div>
  )

  const clickable = !!href || !!onClick
  const base = cn(
    'block w-full rounded-card border bg-white px-4 py-3.5 text-left shadow-card',
    clickable && 'lift cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
    active ? 'border-primary-400 ring-1 ring-primary-300' : 'border-border-default'
  )

  if (href) {
    return (
      <Link to={href} className={base}>
        {inner}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={base}>
        {inner}
      </button>
    )
  }
  return <div className={base}>{inner}</div>
}
