import { cn } from '../../lib/utils'

function Shimmer({ className }) {
  return (
    <div
      className={cn('animate-pulse rounded bg-gray-200', className)}
      aria-hidden="true"
    />
  )
}

// ── Primitive variants ────────────────────────────────────────────────────────

export function SkeletonText({ lines = 1, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          className={cn('h-3.5', i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  )
}

export function SkeletonRect({ className }) {
  return <Shimmer className={cn('h-24 w-full', className)} />
}

export function SkeletonCircle({ size = 40, className }) {
  return (
    <Shimmer
      className={cn('shrink-0 rounded-full', className)}
      style={{ width: size, height: size }}
    />
  )
}

// ── Composite presets ─────────────────────────────────────────────────────────

export function SkeletonKPI({ className }) {
  return (
    <div
      className={cn(
        'rounded-card border border-border-default bg-white p-5 shadow-card',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Shimmer className="h-3 w-28" />
          <Shimmer className="h-8 w-20" />
          <Shimmer className="h-3 w-24" />
        </div>
        <Shimmer className="h-10 w-10 shrink-0 rounded-xl" />
      </div>
    </div>
  )
}

export function SkeletonChart({ className }) {
  return (
    <div
      className={cn(
        'rounded-card border border-border-default bg-white p-5 shadow-card',
        className
      )}
    >
      <Shimmer className="mb-4 h-4 w-40" />
      <div className="flex items-end gap-2 pt-2">
        {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
          <Shimmer key={i} className="flex-1 rounded-t" style={{ height: h }} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonTableRow({ cols = 5, className }) {
  return (
    <div className={cn('flex items-center gap-4 px-4 py-3', className)}>
      {Array.from({ length: cols }).map((_, i) => (
        <Shimmer
          key={i}
          className={cn('h-3.5', i === 0 ? 'w-32' : i === cols - 1 ? 'w-16' : 'w-24')}
        />
      ))}
    </div>
  )
}

// ── Default export: generic skeleton with variant prop ─────────────────────

export default function Skeleton({ variant = 'rect', ...props }) {
  const map = {
    text:      SkeletonText,
    rect:      SkeletonRect,
    circle:    SkeletonCircle,
    kpi:       SkeletonKPI,
    chart:     SkeletonChart,
    'table-row': SkeletonTableRow,
  }
  const Component = map[variant] ?? SkeletonRect
  return <Component {...props} />
}
