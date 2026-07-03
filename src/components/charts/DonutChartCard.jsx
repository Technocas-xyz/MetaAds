/**
 * Donut chart card with right-side legend showing dot + label + % + count.
 *
 * @example
 * <DonutChartCard
 *   title="Creative Distribution"
 *   centerLabel="12,842"
 *   data={[
 *     { label: 'Video',      value: 6200, color: 'indigo' },
 *     { label: 'Image',      value: 4100, color: 'blue'   },
 *     { label: 'Carousel',   value: 2542, color: 'teal'   },
 *   ]}
 *   viewAllHref="/ads"
 * />
 */
import { useMemo } from 'react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from 'recharts'
import { ChartCard, ChartLoading, ChartEmpty, resolveColor, PALETTE } from './_shared'
import { cn } from '../../lib/utils'

function LegendRow({ item, total }) {
  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: item._resolved }}
      />
      <span className="min-w-0 flex-1 truncate text-text-secondary">{item.label}</span>
      <span className="shrink-0 font-medium text-text-primary">{pct}%</span>
      <span className="shrink-0 text-text-tertiary">
        {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
      </span>
    </div>
  )
}

export default function DonutChartCard({
  title,
  subtitle,
  data        = [],
  centerLabel,
  centerSub,
  viewAllHref,
  headerRight,
  size        = 160,
  loading     = false,
  className,
}) {
  const resolved = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        _resolved: d.color ? resolveColor(d.color) : PALETTE[i % PALETTE.length],
      })),
    [data]
  )

  const total = resolved.reduce((s, d) => s + (d.value ?? 0), 0)

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      headerRight={headerRight}
      viewAllHref={viewAllHref}
      className={className}
    >
      {loading ? (
        <ChartLoading height={size + 40} />
      ) : !resolved.length ? (
        <ChartEmpty height={size + 40} />
      ) : (
        <div className="flex items-center gap-4">
          {/* Donut */}
          <div className="relative shrink-0" style={{ width: size, height: size }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resolved}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="80%"
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={true}
                  animationDuration={600}
                >
                  {resolved.map((entry, i) => (
                    <Cell key={i} fill={entry._resolved} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : value,
                    name,
                  ]}
                  contentStyle={{
                    background:   '#fff',
                    border:       '1px solid #E2E8F0',
                    borderRadius: 8,
                    fontSize:     12,
                    boxShadow:    '0 1px 3px rgba(0,0,0,.08)',
                    padding:      '5px 10px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center label */}
            {(centerLabel || centerSub) && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                {centerLabel && (
                  <span className="text-lg font-bold leading-tight text-text-primary">
                    {centerLabel}
                  </span>
                )}
                {centerSub && (
                  <span className="text-[10px] text-text-tertiary">{centerSub}</span>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            {resolved.map((item, i) => (
              <LegendRow key={i} item={item} total={total} />
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  )
}
