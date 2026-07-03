/**
 * Multi-series line chart with optional dual Y-axis, time filter chips, and custom tooltip.
 *
 * @example
 * // Single series
 * <LineChartCard
 *   title="Leads Over Time"
 *   series={[{ key: 'leads', label: 'Leads', color: 'indigo' }]}
 *   data={[{ x: 'Jan 1', leads: 42 }, { x: 'Jan 2', leads: 58 }]}
 *   height={260}
 * />
 *
 * // Dual axis
 * <LineChartCard
 *   title="Spend vs ROAS"
 *   series={[
 *     { key: 'spend', label: 'Spend ($)',  color: 'indigo', yAxis: 'left'  },
 *     { key: 'roas',  label: 'ROAS (x)',   color: 'amber',  yAxis: 'right' },
 *   ]}
 *   data={spendData}
 *   dualAxis
 * />
 */
import { useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { ChartCard, ChartLoading, ChartEmpty, CustomTooltip, resolveColor, PALETTE } from './_shared'
import { cn } from '../../lib/utils'

export default function LineChartCard({
  title,
  subtitle,
  series       = [],
  data         = [],
  dualAxis     = false,
  height       = 240,
  timeFilter,
  headerRight,
  viewAllHref,
  loading      = false,
  formatter,
  xFormatter,
  yLeftFormatter,
  yRightFormatter,
  showLegend   = true,
  smooth       = true,
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
          {/* Time filter chips */}
          {timeFilter?.options && (
            <div className="flex gap-1">
              {timeFilter.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setActiveFilter(opt.value)
                    timeFilter.onChange?.(opt.value)
                  }}
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
        <>
          <ResponsiveContainer width="100%" height={height}>
            <LineChart
              data={filteredData}
              margin={{ top: 4, right: dualAxis ? 16 : 8, bottom: 0, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="x"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={xFormatter}
              />

              {/* Left Y-axis (always shown) */}
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                width={38}
                tickFormatter={yLeftFormatter}
              />

              {/* Right Y-axis (only when dualAxis) */}
              {dualAxis && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                  tickFormatter={yRightFormatter}
                />
              )}

              <Tooltip
                content={<CustomTooltip formatter={formatter} labelFormatter={xFormatter} />}
              />

              {showLegend && series.length > 1 && (
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#64748B' }}
                />
              )}

              {series.map((s, i) => {
                const color  = s.color ? resolveColor(s.color) : PALETTE[i % PALETTE.length]
                const yId    = dualAxis ? (s.yAxis ?? 'left') : 'left'
                return (
                  <Line
                    key={s.key}
                    type={smooth ? 'monotone' : 'linear'}
                    dataKey={s.key}
                    name={s.label ?? s.key}
                    yAxisId={yId}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={600}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </ChartCard>
  )
}
