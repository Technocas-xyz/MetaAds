/**
 * Domain KPI card with icon tile, value, title and trend.
 *
 * @example
 * <KPICard
 *   title="Total Ads"
 *   value={12842}
 *   subtitle="Across all campaigns"
 *   icon={BarChart2}
 *   iconBg="indigo"
 *   trend={{ value: 18.6, direction: 'up', label: 'vs last 7 days' }}
 *   onClick={() => navigate('/ads')}
 * />
 */
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../../lib/utils'

const ICON_BG = {
  indigo: 'bg-primary-50  text-primary-600',
  green:  'bg-success-50  text-success-600',
  amber:  'bg-warning-50  text-warning-600',
  red:    'bg-danger-50   text-danger-600',
  blue:   'bg-blue-50     text-blue-600',
  purple: 'bg-purple-50   text-purple-600',
  pink:   'bg-pink-50     text-pink-600',
  teal:   'bg-teal-50     text-teal-600',
  gray:   'bg-gray-100    text-gray-600',
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg   = 'indigo',
  trend,
  onClick,
  className,
}) {
  const iconCls  = ICON_BG[iconBg] ?? ICON_BG.indigo
  const isUp     = trend?.direction === 'up'
  const TrendIcon = isUp ? TrendingUp : TrendingDown

  const inner = (
    <div className="flex items-start gap-4">
      {/* Icon tile */}
      {Icon && (
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            iconCls
          )}
          aria-hidden="true"
        >
          <Icon size={20} />
        </div>
      )}

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary">{title}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-text-primary">
          {typeof value === 'number' ? value.toLocaleString() : (value ?? '—')}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-text-tertiary">{subtitle}</p>
        )}
        {trend && (
          <div
            className={cn(
              'mt-1.5 flex items-center gap-1 text-xs font-medium',
              isUp ? 'text-success-600' : 'text-danger-600'
            )}
          >
            <TrendIcon size={12} aria-hidden="true" />
            <span>
              {isUp ? '+' : '−'}{Math.abs(trend.value)}%
              {trend.label && <span className="ml-1 font-normal text-text-tertiary">{trend.label}</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  )

  const base = cn(
    'rounded-card border border-border-default bg-white p-5 shadow-card transition-shadow',
    onClick && 'cursor-pointer hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
    className
  )

  if (onClick) {
    return (
      <button type="button" className={base} onClick={onClick}>
        {inner}
      </button>
    )
  }
  return <div className={base}>{inner}</div>
}
