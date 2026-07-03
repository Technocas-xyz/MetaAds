import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../../lib/utils'

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
}) {
  const inner = (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-text-primary">
          {typeof value === 'number' ? value.toLocaleString() : (value ?? '—')}
        </p>
        {trend !== undefined ? (
          <div
            className={cn(
              'mt-2 flex items-center gap-1 text-xs font-medium',
              trendUp ? 'text-success-600' : 'text-danger-600'
            )}
          >
            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>
              {trendUp ? '↑' : '↓'} {Math.abs(trend)}% vs last 7 days
            </span>
          </div>
        ) : note ? (
          <p className="mt-2 text-xs text-text-secondary">{note}</p>
        ) : null}
      </div>
      <div className={cn('flex-shrink-0 rounded-xl p-2.5', iconBg)}>
        <Icon size={22} className={iconColor} />
      </div>
    </div>
  )

  const base = cn(
    'rounded-card border border-border-default bg-white p-5 shadow-card',
    'transition-shadow hover:shadow-card-hover',
    href && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
  )

  if (href) {
    return (
      <Link to={href} className={base}>
        {inner}
      </Link>
    )
  }
  return <div className={base}>{inner}</div>
}
