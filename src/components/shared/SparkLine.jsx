/**
 * Tiny sparkline chart with no axes or grid, for use inside KPI cards and table cells.
 * data can be number[] or {value: number}[].
 *
 * @example
 * // Number array
 * <SparkLine data={[12, 18, 14, 22, 20, 25, 30]} color="#4F46E5" />
 *
 * // Object array
 * <SparkLine data={[{value:12},{value:18}]} width={80} height={32} color="green" />
 *
 * // With gradient fill
 * <SparkLine data={data} filled />
 */
import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, Area, AreaChart, Tooltip,
} from 'recharts'
import { cn } from '../../lib/utils'

const COLOR_MAP = {
  indigo: '#4F46E5',
  green:  '#16A34A',
  red:    '#DC2626',
  amber:  '#D97706',
  blue:   '#2563EB',
  purple: '#7C3AED',
  teal:   '#0D9488',
  gray:   '#94A3B8',
}

export default function SparkLine({
  data      = [],
  color     = 'indigo',
  filled    = false,
  height    = 28,
  width,
  className,
  showTooltip = false,
}) {
  const resolvedColor = COLOR_MAP[color] ?? color

  const normalised = useMemo(
    () => data.map((d) => (typeof d === 'number' ? { value: d } : d)),
    [data]
  )

  const chartId = `spark-${Math.random().toString(36).slice(2, 7)}`

  const ChartComponent = filled ? AreaChart : LineChart
  const DataComponent  = filled ? Area      : Line

  const commonProps = {
    data:   normalised,
    margin: { top: 2, right: 2, bottom: 2, left: 2 },
  }

  const dataProps = filled
    ? {
        type: 'monotone',
        dataKey: 'value',
        stroke: resolvedColor,
        fill: resolvedColor,
        fillOpacity: 0.15,
        strokeWidth: 1.5,
        dot: false,
        activeDot: showTooltip ? { r: 3, fill: resolvedColor } : false,
        isAnimationActive: false,
      }
    : {
        type: 'monotone',
        dataKey: 'value',
        stroke: resolvedColor,
        strokeWidth: 1.5,
        dot: false,
        activeDot: showTooltip ? { r: 3, fill: resolvedColor } : false,
        isAnimationActive: false,
      }

  const inner = (
    <ChartComponent {...commonProps}>
      {showTooltip && (
        <Tooltip
          contentStyle={{ fontSize: 11, padding: '2px 6px', borderRadius: 4 }}
          itemStyle={{ color: resolvedColor }}
          cursor={false}
        />
      )}
      <DataComponent {...dataProps} />
    </ChartComponent>
  )

  if (width) {
    return (
      <div className={cn('shrink-0', className)} style={{ width, height }}>
        <ResponsiveContainer width="100%" height={height}>
          {inner}
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        {inner}
      </ResponsiveContainer>
    </div>
  )
}
