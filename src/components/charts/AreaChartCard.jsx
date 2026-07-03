/**
 * Area chart card with gradient fill for performance-over-time style charts.
 *
 * @example
 * <AreaChartCard
 *   title="Performance Over Time"
 *   series={[
 *     { key: 'leads',     label: 'Leads',     color: 'indigo' },
 *     { key: 'clicks',    label: 'Clicks',    color: 'sky'    },
 *   ]}
 *   data={[{ x: 'May 1', leads: 120, clicks: 980 }]}
 *   height={260}
 *   stacked={false}
 * />
 */
import { useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, defs, linearGradient, stop,
} from 'recharts'
import { ChartCard, ChartLoading, ChartEmpty, CustomTooltip, resolveColor, PALETTE } from './_shared'
import { cn } from '../../lib/utils'

export default function AreaChartCard({
  title,
  subtitle,
  series      = [],
  data        = [],
  stacked     = false,
  height      = 240,
  timeFilter,
  headerRight,
  viewAllHref,
  loading     = false,
  formatter,
  xFormatter,
  yFormatter,
  showLegend  = true,
  className,
}) {
  const [activeFilter, setActiveFilter] = useState(
    timeFilter?.options?.[0]?.value ?? null
  )

  const filteredData = timeFilter?.onFilter
    ? timeFilter.onFilter(data, activeFilter)
    : data

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      viewAllHref={viewAllHref}
      headerRight={
        <div className="flex items-center gap-2">
          {timeFilter?.options && (
            <div className="flex gap-1">
              {timeFilter.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setActiveFilter(opt.value); timeFilter.onChange?.(opt.value) }}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                    activeFilter === opt.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {headerRight}
        </div>
      }
      className={className}
    >
      {loading ? (
        <ChartLoading height={height} />
      ) : !filteredData.length ? (
        <ChartEmpty height={height} />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={filteredData}
            margin={{ top: 4, right: 8, bottom: 0, left: -10 }}
          >
            <defs>
              {series.map((s, i) => {
                const id    = `area-grad-${s.key}`
                const color = s.color ? resolveColor(s.color) : PALETTE[i % PALETTE.length]
                return (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                )
              })}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="x"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={xFormatter}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              width={38}
              tickFormatter={yFormatter}
            />
            <Tooltip content={<CustomTooltip formatter={formatter} />} />

            {showLegend && series.length > 1 && (
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#64748B' }}
              />
            )}

            {series.map((s, i) => {
              const color = s.color ? resolveColor(s.color) : PALETTE[i % PALETTE.length]
              return (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label ?? s.key}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#area-grad-${s.key})`}
                  dot={false}
                  activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
                  stackId={stacked ? 'stack' : undefined}
                  isAnimationActive={true}
                  animationDuration={600}
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
