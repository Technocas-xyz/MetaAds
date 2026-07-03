import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const PALETTE = [
  '#6366F1', // indigo  — Price
  '#10B981', // emerald — Quality
  '#3B82F6', // blue    — Speed
  '#8B5CF6', // violet  — Convenience
  '#EC4899', // pink    — Innovation
  '#F59E0B', // amber   — Trust
  '#22C55E', // green   — Sustainability
  '#94A3B8', // slate   — Other
]

function Shimmer() {
  return (
    <div className="flex animate-pulse items-center gap-6">
      <div className="h-44 w-44 flex-shrink-0 rounded-full bg-gray-200" />
      <div className="flex-1 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-gray-200" />
            <div className="h-3 flex-1 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border-default bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-text-primary">{d.name}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color: d.fill }}>
        {d.value} ads · {d.pct}%
      </p>
    </div>
  )
}

export default function DonutChartCard({
  title,
  data,
  centerLabel,
  viewAllHref,
  isLoading,
}) {
  const [centerValue, ...centerRest] = centerLabel?.split(' ') ?? []

  return (
    <div className="rounded-card border border-border-default bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
          >
            View all <ArrowRight size={12} />
          </Link>
        )}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <Shimmer />
        ) : !data?.length ? (
          <div className="flex h-44 items-center justify-center text-sm text-text-tertiary">
            No data available
          </div>
        ) : (
          <div className="flex items-center gap-5">
            {/* Donut */}
            <div className="relative h-44 w-44 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {data.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PALETTE[i % PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {centerLabel && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold leading-none text-text-primary">
                    {centerValue}
                  </span>
                  <span className="mt-0.5 text-xs text-text-secondary">
                    {centerRest.join(' ')}
                  </span>
                </div>
              )}
            </div>

            {/* Legend */}
            <ul className="flex-1 space-y-2 overflow-hidden">
              {data.map((item, i) => (
                <li key={item.name} className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                  />
                  <span className="flex-1 truncate text-xs text-text-secondary">
                    {item.name}
                  </span>
                  <span className="text-xs font-semibold text-text-primary">
                    {item.pct}%
                  </span>
                  <span className="w-8 text-right text-xs text-text-tertiary">
                    {item.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
