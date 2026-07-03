import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, LabelList, ResponsiveContainer,
} from 'recharts'

function Shimmer() {
  return (
    <div className="flex h-full animate-pulse items-end justify-around gap-2 px-2 pb-4">
      {[45, 70, 55, 30, 65, 40].map((h, i) => (
        <div key={i} className="flex-1 rounded-t-sm bg-gray-200" style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  return (
    <div className="rounded-lg border border-border-default bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-text-primary">{name}</p>
      <p className="mt-0.5 text-sm font-bold text-primary-500">{value} ads</p>
    </div>
  )
}

export default function BarChartCard({ title, data, viewAllHref, isLoading }) {
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

      <div className="mt-4 h-52">
        {isLoading ? (
          <Shimmer />
        ) : !data?.length ? (
          <div className="flex h-full items-center justify-center text-sm text-text-tertiary">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 4, left: -22, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E2E8F0"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: '#F8F9FB' }}
              />
              <Bar
                dataKey="value"
                fill="#6366F1"
                radius={[4, 4, 0, 0]}
                maxBarSize={42}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  style={{ fontSize: 10, fill: '#4F46E5', fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
