/**
 * Shared primitives reused across all chart cards.
 * Not a public component — import from individual chart files.
 */
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import EmptyState from '../ui/EmptyState'
import { SkeletonChart } from '../ui/Skeleton'

// ── Design-system color palette exposed to charts ─────────────────────────────

export const CHART_COLORS = {
  indigo:  '#4F46E5',
  violet:  '#7C3AED',
  blue:    '#2563EB',
  sky:     '#0284C7',
  teal:    '#0D9488',
  green:   '#16A34A',
  emerald: '#059669',
  amber:   '#D97706',
  orange:  '#EA580C',
  red:     '#DC2626',
  pink:    '#DB2777',
  gray:    '#64748B',
  slate:   '#475569',
}

export const PALETTE = Object.values(CHART_COLORS)

export function resolveColor(color) {
  return CHART_COLORS[color] ?? color ?? CHART_COLORS.indigo
}

// ── Shared tooltip style (matches bg-card / shadow-card / border-default) ─────

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#ffffff',
    border:     '1px solid #E2E8F0',
    borderRadius: 8,
    boxShadow:  '0 1px 3px 0 rgba(0,0,0,.08), 0 1px 2px -1px rgba(0,0,0,.06)',
    fontSize:   12,
    padding:    '6px 10px',
  },
  itemStyle:   { color: '#0F172A', padding: '1px 0' },
  labelStyle:  { color: '#64748B', marginBottom: 2, fontWeight: 600 },
  cursor:      { fill: 'rgba(79,70,229,.06)' },
}

// ── Card shell ─────────────────────────────────────────────────────────────────

export function ChartCard({
  title,
  subtitle,
  headerRight,
  viewAllHref,
  children,
  className,
  noPad,
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-card border border-border-default bg-white shadow-card',
        className
      )}
    >
      {/* Header */}
      {(title || headerRight || viewAllHref) && (
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border-default px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerRight}
            {viewAllHref && (
              <Link
                to={viewAllHref}
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
              >
                View all <ArrowRight size={12} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      <div className={cn('flex min-h-0 flex-1 flex-col', !noPad && 'px-4 pb-4 pt-3')}>
        {children}
      </div>
    </div>
  )
}

// ── Loading / empty guards ─────────────────────────────────────────────────────

export function ChartLoading({ height = 200 }) {
  return <SkeletonChart className="h-full w-full" style={{ height }} />
}

export function ChartEmpty({ height = 200 }) {
  return (
    <EmptyState
      title="No data available"
      description="There's nothing to display for the selected period."
      className="border-0 shadow-none"
      style={{ minHeight: height }}
    />
  )
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

export function CustomTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null
  const displayLabel = labelFormatter ? labelFormatter(label) : label

  return (
    <div
      className="rounded-lg border border-border-default bg-white px-3 py-2 shadow-card"
      style={{ minWidth: 120 }}
    >
      {displayLabel && (
        <p className="mb-1.5 text-xs font-semibold text-text-secondary">{displayLabel}</p>
      )}
      {payload.map((entry, i) => {
        const [val, name] = formatter
          ? formatter(entry.value, entry.name, entry)
          : [entry.value, entry.name]
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: entry.color ?? entry.fill }}
            />
            <span className="text-text-secondary">{name}</span>
            <span className="ml-auto font-semibold text-text-primary">{val}</span>
          </div>
        )
      })}
    </div>
  )
}
