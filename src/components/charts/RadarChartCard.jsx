/**
 * Radar / spider-web chart for multi-axis comparisons (e.g. creative similarity, competitor scoring).
 * Wraps Recharts RadarChart.
 *
 * @example
 * <RadarChartCard
 *   title="Creative Similarity"
 *   axes={['Hook', 'Angle', 'Offer', 'Format', 'CTA', 'Audience']}
 *   datasets={[
 *     { label: 'Your Ad',     color: 'indigo', values: [80, 70, 90, 75, 65, 85] },
 *     { label: 'Competitor',  color: 'red',    values: [65, 80, 55, 90, 70, 60] },
 *   ]}
 *   height={280}
 * />
 */
import {
  ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, Legend,
} from 'recharts'
import { ChartCard, ChartLoading, ChartEmpty, CustomTooltip, resolveColor, PALETTE } from './_shared'

export default function RadarChartCard({
  title,
  subtitle,
  axes        = [],
  datasets    = [],
  height      = 260,
  headerRight,
  viewAllHref,
  loading     = false,
  fillOpacity = 0.12,
  showLegend  = true,
  className,
}) {
  // Transform axes + datasets → Recharts format
  // data: [{ subject: 'Hook', Dataset0: 80, Dataset1: 65 }, ...]
  const chartData = axes.map((axis, axisIdx) => {
    const row = { subject: axis }
    datasets.forEach((ds, dsIdx) => {
      row[`ds_${dsIdx}`] = ds.values?.[axisIdx] ?? 0
    })
    return row
  })

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
      ) : !chartData.length || !datasets.length ? (
        <ChartEmpty height={height} />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: '#CBD5E1' }}
              tickCount={4}
              axisLine={false}
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v, name) => {
                    const idx = parseInt(name.replace('ds_', ''), 10)
                    return [v, datasets[idx]?.label ?? name]
                  }}
                />
              }
            />
            {showLegend && (
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#64748B' }}
                formatter={(value) => {
                  const idx = parseInt(value.replace('ds_', ''), 10)
                  return datasets[idx]?.label ?? value
                }}
              />
            )}
            {datasets.map((ds, i) => {
              const color = ds.color ? resolveColor(ds.color) : PALETTE[i % PALETTE.length]
              return (
                <Radar
                  key={i}
                  name={`ds_${i}`}
                  dataKey={`ds_${i}`}
                  stroke={color}
                  fill={color}
                  fillOpacity={fillOpacity}
                  strokeWidth={1.5}
                  dot={{ fill: color, r: 3 }}
                  activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                />
              )
            })}
          </RadarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
