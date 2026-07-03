/**
 * Stacked (or grouped) bar chart for Confidence Score Distribution, Audience Breakdown, etc.
 *
 * @example
 * // Stacked — confidence distribution
 * <StackedBarChartCard
 *   title="Confidence Distribution"
 *   series={[
 *     { key: 'high',   label: 'High',   color: 'green'  },
 *     { key: 'medium', label: 'Medium', color: 'amber'  },
 *     { key: 'low',    label: 'Low',    color: 'red'    },
 *   ]}
 *   data={[{ x: 'Week 1', high: 40, medium: 35, low: 25 }]}
 * />
 *
 * // Grouped
 * <StackedBarChartCard
 *   title="Audience Breakdown"
 *   series={[...]}
 *   data={[...]}
 *   stacked={false}
 * />
 */
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts'
import { ChartCard, ChartLoading, ChartEmpty, CustomTooltip, resolveColor, PALETTE } from './_shared'

export default function StackedBarChartCard({
  title,
  subtitle,
  series      = [],
  data        = [],
  stacked     = true,
  height      = 240,
  headerRight,
  viewAllHref,
  loading     = false,
  formatter,
  xFormatter,
  yFormatter,
  showLegend  = true,
  normalize   = false,
  className,
}) {
  const stackId = stacked ? 'stack' : undefined

  // Normalise to 100% if requested
  const chartData = normalize
    ? data.map((row) => {
        const total = series.reduce((s, ser) => s + (Number(row[ser.key]) || 0), 0)
        const out   = { x: row.x }
        series.forEach((ser) => {
          out[ser.key] = total > 0 ? +((row[ser.key] / total) * 100).toFixed(1) : 0
        })
        return out
      })
    : data

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      headerRight={headerRight}
      viewAllHref={viewAllHref}
      className={className}
    >
      {loading ? (
        <ChartLoading height={height} />
      ) : !chartData.length ? (
        <ChartEmpty height={height} />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 0, left: -10 }}
          >
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
              tickFormatter={normalize ? (v) => `${v}%` : yFormatter}
              domain={normalize ? [0, 100] : undefined}
            />
            <Tooltip content={<CustomTooltip formatter={formatter} />} />

            {showLegend && (
              <Legend
                iconType="square"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#64748B' }}
              />
            )}

            {series.map((s, i) => {
              const color  = s.color ? resolveColor(s.color) : PALETTE[i % PALETTE.length]
              // Rounded corners only on top of the last stacked bar
              const isLast = stacked && i === series.length - 1
              return (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label ?? s.key}
                  stackId={stackId}
                  fill={color}
                  maxBarSize={48}
                  radius={isLast ? [4, 4, 0, 0] : !stacked ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={600}
                />
              )
            })}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
