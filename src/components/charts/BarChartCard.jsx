/**
 * Vertical bar chart card.
 *
 * @example
 * <BarChartCard
 *   title="Spend by Campaign"
 *   subtitle="Last 30 days"
 *   data={[{ label: 'Jan', value: 4200 }, { label: 'Feb', value: 5100 }]}
 *   color="indigo"
 *   valueLabels
 *   height={240}
 *   viewAllHref="/campaigns"
 * />
 */
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LabelList, Cell,
} from 'recharts'
import { ChartCard, ChartLoading, ChartEmpty, CustomTooltip, resolveColor } from './_shared'
import { cn } from '../../lib/utils'

export default function BarChartCard({
  title,
  subtitle,
  data         = [],
  color        = 'indigo',
  colors,
  valueLabels  = false,
  height       = 220,
  viewAllHref,
  headerRight,
  loading      = false,
  formatter,
  xFormatter,
  yFormatter,
  horizontal   = false,
  className,
}) {
  const fill = resolveColor(color)

  const chartData = data.map((d) => ({ ...d, name: d.label ?? d.name }))

  const AxisX = horizontal ? YAxis : XAxis
  const AxisY = horizontal ? XAxis : YAxis
  const ChartType = BarChart

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
          <ChartType
            data={chartData}
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: valueLabels ? 18 : 4, right: 8, bottom: 0, left: horizontal ? 80 : -10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E2E8F0"
              vertical={!horizontal}
              horizontal={horizontal}
            />
            <AxisX
              dataKey={horizontal ? 'value' : 'name'}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={horizontal ? yFormatter : xFormatter}
            />
            <AxisY
              dataKey={horizontal ? 'name' : undefined}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={horizontal ? undefined : yFormatter}
              width={horizontal ? undefined : 36}
            />
            <Tooltip
              content={<CustomTooltip formatter={formatter} />}
              cursor={{ fill: 'rgba(79,70,229,.06)' }}
            />
            <Bar
              dataKey="value"
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={48}
            >
              {colors
                ? chartData.map((_, i) => (
                    <Cell key={i} fill={resolveColor(colors[i % colors.length])} />
                  ))
                : chartData.map((_, i) => <Cell key={i} fill={fill} />)}
              {valueLabels && (
                <LabelList
                  dataKey="value"
                  position={horizontal ? 'right' : 'top'}
                  style={{ fontSize: 10, fill: '#64748B' }}
                  formatter={formatter ? (v) => formatter(v, 'value')[0] : undefined}
                />
              )}
            </Bar>
          </ChartType>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
