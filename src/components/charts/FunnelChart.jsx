/**
 * Custom SVG funnel chart for Performance by Funnel Stage.
 * Renders trapezoidal stages with percentage drop-off indicators between them.
 *
 * @example
 * <FunnelChart
 *   title="Performance Funnel"
 *   stages={[
 *     { label: 'Impressions', value: 125000, secondary: '100%',  color: 'indigo',  percentage: 100 },
 *     { label: 'Clicks',      value: 8750,   secondary: '7.0%',  color: 'blue',    percentage: 70  },
 *     { label: 'Leads',       value: 1240,   secondary: '14.2%', color: 'sky',     percentage: 50  },
 *     { label: 'Conversions', value: 186,    secondary: '15.0%', color: 'green',   percentage: 32  },
 *   ]}
 * />
 */
import { ChartCard, ChartEmpty, ChartLoading, resolveColor } from './_shared'
import { cn } from '../../lib/utils'

// ── Single CSS trapezoid stage ─────────────────────────────────────────────────

function FunnelStage({ stage, isLast, maxWidth = 100 }) {
  const width    = `${stage.percentage ?? maxWidth}%`
  const color    = resolveColor(stage.color ?? 'indigo')
  const fmt      = (v) =>
    typeof v === 'number'
      ? v >= 1_000_000
        ? `${(v / 1_000_000).toFixed(1)}M`
        : v >= 1_000
        ? `${(v / 1_000).toFixed(1)}K`
        : v.toLocaleString()
      : v

  return (
    <div className="flex flex-col items-center">
      {/* Trapezoid bar */}
      <div
        className="flex items-center justify-center rounded-md py-2.5 transition-all"
        style={{
          width,
          background: color,
          minWidth: 80,
        }}
      >
        <span className="px-3 text-xs font-bold text-white drop-shadow">
          {fmt(stage.value)}
        </span>
      </div>

      {/* Label row */}
      <div className="mt-1.5 flex w-full items-center justify-center gap-2">
        <span className="text-xs font-medium text-text-primary">{stage.label}</span>
        {stage.secondary && (
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
            {stage.secondary}
          </span>
        )}
      </div>

      {/* Drop-off connector */}
      {!isLast && (
        <div className="mt-1 flex flex-col items-center">
          <div className="h-4 w-px bg-gray-200" />
        </div>
      )}
    </div>
  )
}

export default function FunnelChart({
  title,
  subtitle,
  stages      = [],
  headerRight,
  viewAllHref,
  loading     = false,
  orientation = 'vertical',
  className,
}) {
  if (!stages.length && !loading) {
    return (
      <ChartCard title={title} subtitle={subtitle} className={className}>
        <ChartEmpty />
      </ChartCard>
    )
  }

  // Compute percentage relative to first stage if not provided
  const firstVal = stages[0]?.value ?? 1
  const enriched = stages.map((s) => ({
    ...s,
    percentage: s.percentage ?? Math.round((s.value / firstVal) * 100),
  }))

  if (orientation === 'horizontal') {
    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        headerRight={headerRight}
        viewAllHref={viewAllHref}
        className={className}
      >
        {loading ? <ChartLoading height={80} /> : (
          <div className="flex items-stretch gap-0">
            {enriched.map((stage, i) => {
              const color    = resolveColor(stage.color ?? 'indigo')
              const isLast   = i === enriched.length - 1
              const nextPct  = enriched[i + 1]?.percentage ?? 0
              const dropOff  = isLast ? null : (100 - Math.round((nextPct / (stage.percentage || 1)) * 100))

              const fmt = (v) =>
                typeof v === 'number'
                  ? v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1_000     ? `${(v / 1_000).toFixed(1)}K`
                  : v.toLocaleString()
                  : v

              return (
                <div key={i} className="flex flex-1 items-center">
                  {/* Stage box */}
                  <div
                    className="flex flex-1 flex-col items-center justify-center rounded-lg py-4 text-center"
                    style={{ background: color + '18', borderLeft: `3px solid ${color}` }}
                  >
                    <span className="text-base font-bold" style={{ color }}>
                      {fmt(stage.value)}
                    </span>
                    <span className="mt-0.5 text-[11px] font-medium text-text-primary">{stage.label}</span>
                    {stage.secondary && (
                      <span className="text-[10px] text-text-tertiary">{stage.secondary}</span>
                    )}
                  </div>

                  {/* Drop-off arrow */}
                  {!isLast && (
                    <div className="flex flex-col items-center px-1">
                      <span className="text-[10px] text-text-tertiary">
                        {dropOff != null ? `-${dropOff}%` : ''}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M6 4l4 4-4 4" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ChartCard>
    )
  }

  // Default: vertical funnel
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      headerRight={headerRight}
      viewAllHref={viewAllHref}
      className={className}
    >
      {loading ? (
        <ChartLoading height={enriched.length * 70} />
      ) : (
        <div className="flex flex-col items-center gap-0 py-2">
          {enriched.map((stage, i) => (
            <FunnelStage
              key={i}
              stage={stage}
              isLast={i === enriched.length - 1}
            />
          ))}
        </div>
      )}
    </ChartCard>
  )
}
