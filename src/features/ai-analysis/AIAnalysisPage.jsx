import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Download, TrendingUp, TrendingDown, ArrowRight,
  Eye, ChevronLeft, ChevronRight, Info,
} from 'lucide-react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTip,
  PieChart, Pie, Cell,
  BarChart, Bar, Cell as BarCell, LabelList,
} from 'recharts'
import Breadcrumb from '../../components/layout/Breadcrumb'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ConfidenceBadge from '../../components/ui/ConfidenceBadge'
import HookTypeBadge from '../../components/ui/HookTypeBadge'
import DateRangePicker from '../../components/ui/DateRangePicker'
import KPICard from '../../components/ui/KPICard'
import MarketOverview from './components/MarketOverview'
import CompetitorBreakdown from './components/CompetitorBreakdown'
import {
  useAISummary,
  usePerformanceTimeline,
  useTopAnglesDonut,
  useConfidenceDist,
  useWinningAds,
} from '../../hooks/queries/useAIAnalysis'
import { cn } from '../../lib/utils'

// ── Shared card wrapper ────────────────────────────────────────────────────────
function Card({ title, rightSlot, children, className }) {
  return (
    <div className={cn('rounded-card border border-border-default bg-white shadow-card', className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-border-default px-5 py-3.5">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {rightSlot}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Shimmer helpers ────────────────────────────────────────────────────────────
function ChartShimmer({ h = 200 }) {
  return (
    <div className="animate-pulse rounded-card border border-border-default bg-white p-5 shadow-card">
      <div className="mb-4 h-4 w-36 rounded bg-gray-200" />
      <div className="rounded-lg bg-gray-100" style={{ height: h }} />
    </div>
  )
}

function KPIShimmer() {
  return (
    <div className="animate-pulse rounded-card border border-border-default bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-gray-200" />
          <div className="h-8 w-16 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}

// ── "Est." label with tooltip ─────────────────────────────────────────────────
const EST_MSG = 'Estimated based on derived signals like ad duration, repetition frequency, and engagement patterns. Not actual platform metrics.'

function EstLabel({ children }) {
  return (
    <TooltipPrimitive.Provider delayDuration={100}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span className="inline-flex cursor-help items-center gap-0.5 border-b border-dashed border-text-tertiary">
            {children}
            <Info size={11} className="text-text-tertiary" />
          </span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="z-50 max-w-[240px] rounded-lg border border-border-default bg-white px-3 py-2 text-xs leading-relaxed text-text-secondary shadow-lg"
          >
            {EST_MSG}
            <TooltipPrimitive.Arrow className="fill-white stroke-border-default stroke-[0.5]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

// ── Line chart — Performance Over Time ────────────────────────────────────────
const TIME_FILTERS = ['Daily', 'Weekly', 'Monthly']
const LINE_COLORS  = { winning_ads: '#6366F1', engagement_rate: '#06B6D4', roas: '#22C55E' }

function LineChartCustomTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border-default bg-white px-3 py-2 shadow-lg text-xs">
      <p className="mb-1.5 font-semibold text-text-primary">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-text-secondary capitalize">{p.dataKey.replace(/_/g, ' ')}:</span>
          <span className="font-medium text-text-primary">
            {p.dataKey === 'winning_ads' ? p.value : `${p.value}${p.dataKey === 'roas' ? 'x' : '%'}`}
          </span>
        </div>
      ))}
    </div>
  )
}

function LineChartCard({ data, isLoading }) {
  const [filter, setFilter] = useState('Daily')

  return (
    <Card
      title="Performance Over Time"
      rightSlot={
        <div className="flex rounded-btn border border-border-default overflow-hidden">
          {TIME_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium transition-colors',
                f === filter
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-text-secondary hover:bg-gray-50'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      }
    >
      {isLoading ? (
        <div className="h-52 animate-pulse rounded-lg bg-gray-100" />
      ) : (
        <>
          {/* Legend */}
          <div className="mb-3 flex flex-wrap gap-3">
            {Object.entries(LINE_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-5 rounded-sm" style={{ background: color }} />
                <span className="text-xs capitalize text-text-secondary">
                  {key === 'winning_ads' ? 'Winning Ads' : key === 'engagement_rate' ? (
                    <EstLabel>Engagement Rate</EstLabel>
                  ) : (
                    <EstLabel>ROAS</EstLabel>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 32, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  tickFormatter={(v) => `${v}%`}
                />
                <RechartsTip content={<LineChartCustomTip />} cursor={{ stroke: '#E2E8F0' }} />
                <Line yAxisId="left"  type="monotone" dataKey="winning_ads"     stroke={LINE_COLORS.winning_ads}     strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="engagement_rate" stroke={LINE_COLORS.engagement_rate} strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="4 2" />
                <Line yAxisId="right" type="monotone" dataKey="roas"            stroke={LINE_COLORS.roas}            strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="2 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  )
}

// ── Donut — Top Performing Angles ─────────────────────────────────────────────
const DONUT_PALETTE = ['#6366F1','#10B981','#3B82F6','#8B5CF6','#EC4899','#F59E0B','#94A3B8']

function DonutTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border-default bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-text-primary">{d.name}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color: d.fill }}>
        {d.value.toLocaleString()} ads · {d.pct}%
      </p>
    </div>
  )
}

function AnglesDonutCard({ data, isLoading }) {
  const total = data?.reduce((s, d) => s + d.value, 0) ?? 0

  return (
    <Card
      title="Top Performing Angles"
      rightSlot={
        <Link to="/angles" className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline">
          View All <ArrowRight size={12} />
        </Link>
      }
    >
      {isLoading ? (
        <div className="flex animate-pulse items-center gap-5">
          <div className="h-44 w-44 flex-shrink-0 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                <div className="h-3 flex-1 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative h-44 w-44 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {data.map((_, i) => <Cell key={i} fill={DONUT_PALETTE[i % DONUT_PALETTE.length]} />)}
                </Pie>
                <RechartsTip content={<DonutTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold leading-none text-text-primary">
                {(total / 1000).toFixed(1)}k
              </span>
              <span className="mt-0.5 text-[10px] text-text-secondary">Total Ads</span>
            </div>
          </div>

          <ul className="flex-1 space-y-1.5 overflow-hidden">
            {data.map((item, i) => (
              <li key={item.name} className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: DONUT_PALETTE[i % DONUT_PALETTE.length] }} />
                <span className="flex-1 truncate text-xs text-text-secondary">{item.name}</span>
                <span className="text-xs font-semibold text-text-primary">{item.pct}%</span>
                <span className="w-10 text-right text-xs text-text-tertiary">{item.value.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

// ── Bar chart — Confidence Score Distribution ──────────────────────────────────
function ConfBarTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const total = payload[0].payload._total
  return (
    <div className="rounded-lg border border-border-default bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-text-primary">{d.range} — {d.label}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color: d.color }}>
        {d.count} ads ({total ? ((d.count / total) * 100).toFixed(1) : 0}%)
      </p>
    </div>
  )
}

function ConfidenceBarCard({ data, isLoading }) {
  const total = data?.reduce((s, d) => s + d.count, 0) ?? 0
  const enriched = data?.map((d) => ({ ...d, _total: total })) ?? []

  const low    = data?.filter((d) => ['0–20','21–40'].includes(d.range)).reduce((s, d) => s + d.count, 0) ?? 0
  const medium = data?.find((d) => d.range === '41–60')?.count ?? 0
  const high   = data?.filter((d) => ['61–80','81–100'].includes(d.range)).reduce((s, d) => s + d.count, 0) ?? 0

  return (
    <Card title="Confidence Score Distribution">
      {isLoading ? (
        <div className="h-52 animate-pulse rounded-lg bg-gray-100" />
      ) : (
        <>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enriched} margin={{ top: 16, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <RechartsTip content={<ConfBarTip />} cursor={{ fill: '#F8F9FB' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={42}>
                  {enriched.map((d, i) => <BarCell key={i} fill={d.color} />)}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 9, fontWeight: 600, fill: '#64748B' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary row */}
          <div className="mt-3 grid grid-cols-3 divide-x divide-border-default rounded-lg bg-gray-50 py-2">
            {[
              { label: 'Low',    count: low,    pct: total ? ((low / total) * 100).toFixed(0) : 0,    color: 'text-danger-600'  },
              { label: 'Medium', count: medium, pct: total ? ((medium / total) * 100).toFixed(0) : 0, color: 'text-warning-600' },
              { label: 'High',   count: high,   pct: total ? ((high / total) * 100).toFixed(0) : 0,   color: 'text-success-600' },
            ].map(({ label, count, pct, color }) => (
              <div key={label} className="text-center">
                <p className={cn('text-base font-bold', color)}>{pct}%</p>
                <p className="text-[10px] text-text-tertiary">{label} ({count})</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

// ── Winning ads table ──────────────────────────────────────────────────────────
const PLATFORM_DOT = { Facebook: 'bg-blue-500', Instagram: 'bg-pink-500', TikTok: 'bg-black', YouTube: 'bg-red-500' }
const TIER_COLOR   = { 1: 'red', 2: 'amber', 3: 'slate' }

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-50">
      {[24, 80, 160, 120, 80, 64, 72, 72, 80, 40].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3.5 animate-pulse rounded bg-gray-200" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

function MobileAdCard({ ad }) {
  return (
    <div className="rounded-card border border-border-default bg-white p-4 shadow-card">
      <div className="flex gap-3">
        <img src={ad.media_url} alt={ad.headline} className="h-16 w-12 flex-shrink-0 rounded-md object-cover border border-border-default" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-text-primary line-clamp-1">{ad.headline}</p>
              <p className="text-xs text-text-secondary">{ad.competitor?.name}</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-success-600">
              {ad.est_roas}x ROAS
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {ad.hook_type && <HookTypeBadge type={ad.hook_type} />}
            <ConfidenceBadge score={ad.confidence_score} />
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-text-tertiary">
            <span className={cn('h-1.5 w-1.5 rounded-full', PLATFORM_DOT[ad.platform] ?? 'bg-gray-400')} />
            <span>{ad.platform}</span>
            <span>·</span>
            <span>{ad.est_engagement}% eng.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Pagination({ page, perPage, total, onPage }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const start = (page - 1) * perPage + 1
  const end   = Math.min(page * perPage, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default px-5 py-3">
      <p className="text-xs text-text-secondary">
        Showing <span className="font-medium text-text-primary">{total > 0 ? start : 0}</span>–<span className="font-medium text-text-primary">{end}</span> of <span className="font-medium text-text-primary">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-white text-text-secondary disabled:opacity-40 hover:bg-gray-50">
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
          <button key={p} onClick={() => onPage(p)} className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-sm', p === page ? 'bg-primary-600 font-medium text-white' : 'border border-border-default bg-white text-text-primary hover:bg-gray-50')}>
            {p}
          </button>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-white text-text-secondary disabled:opacity-40 hover:bg-gray-50">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

const PER_PAGE = 5

function WinningAdsTable({ data, isLoading }) {
  const [page, setPage] = useState(1)
  const paged = data?.slice((page - 1) * PER_PAGE, page * PER_PAGE) ?? []

  return (
    <Card
      title="Top Winning Ads"
      rightSlot={
        <Link to="/ads" className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline">
          View All <ArrowRight size={12} />
        </Link>
      }
    >
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block -mx-5 -mb-5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              {[
                { label: '#',            cls: 'w-10 text-center' },
                { label: 'Ad Preview',   cls: '' },
                { label: 'Competitor',   cls: '' },
                { label: 'Hook / Angle', cls: '' },
                { label: 'Offer',        cls: '' },
                { label: '',             cls: '', est: 'Est. ROAS' },
                { label: '',             cls: '', est: 'Engagement' },
                { label: 'Confidence',   cls: '' },
                { label: 'First Seen',   cls: 'hidden lg:table-cell' },
                { label: '',             cls: 'text-right' },
              ].map((col, i) => (
                <th key={i} className={cn('px-4 py-3 text-left text-xs font-medium text-text-secondary whitespace-nowrap', col.cls)}>
                  {col.est ? <EstLabel>{col.est}</EstLabel> : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: PER_PAGE }).map((_, i) => <TableRowSkeleton key={i} />)
              : paged.map((ad) => (
                  <tr key={ad.id} className="border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-xs font-semibold text-text-tertiary">#{ad.rank}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="relative h-14 w-10 overflow-hidden rounded-md border border-border-default bg-gray-50">
                        <img src={ad.media_url} alt={ad.headline} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="max-w-[120px] truncate text-sm font-medium text-text-primary">{ad.competitor?.name}</p>
                      <div className="mt-0.5 flex items-center gap-1">
                        <Badge color={TIER_COLOR[ad.competitor?.tier] ?? 'gray'} className="text-[10px]">
                          T{ad.competitor?.tier}
                        </Badge>
                        <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', PLATFORM_DOT[ad.platform] ?? 'bg-gray-400')} title={ad.platform} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <HookTypeBadge type={ad.hook_type} />
                      <p className="mt-1 text-xs text-text-secondary">{ad.angle}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {ad.offer_type
                        ? <Badge color="indigo">{ad.offer_type}</Badge>
                        : <span className="text-xs text-text-tertiary">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-success-600">{ad.est_roas}x</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-text-primary">{ad.est_engagement}%</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <ConfidenceBadge score={ad.confidence_score} />
                    </td>
                    <td className="hidden px-4 py-3.5 lg:table-cell">
                      <span className="text-xs text-text-secondary">{fmtDate(ad.captured_at)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        to={`/ads/${ad.id}`}
                        className="inline-flex items-center gap-1 rounded-md p-1.5 text-text-tertiary hover:bg-gray-100 hover:text-text-primary"
                        title="View ad"
                      >
                        <Eye size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
        {!isLoading && data?.length > PER_PAGE && (
          <Pagination page={page} perPage={PER_PAGE} total={data.length} onPage={setPage} />
        )}
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-card border border-border-default bg-white p-4">
                <div className="flex gap-3">
                  <div className="h-16 w-12 rounded-md bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-40 rounded bg-gray-200" />
                    <div className="h-3 w-24 rounded bg-gray-200" />
                  </div>
                </div>
              </div>
            ))
          : paged.map((ad) => <MobileAdCard key={ad.id} ad={ad} />)
        }
        {!isLoading && data?.length > PER_PAGE && (
          <Pagination page={page} perPage={PER_PAGE} total={data.length} onPage={setPage} />
        )}
      </div>
    </Card>
  )
}

// ── KPI definitions ────────────────────────────────────────────────────────────
import { Brain, Trophy, BarChart2, Zap, TrendingUp as TrendUp } from 'lucide-react'

function buildKPIs(s) {
  if (!s) return []
  return [
    {
      title:     'Total Ads Analyzed',
      value:     s.total_analyzed,
      icon:      Brain,
      iconBg:    'bg-primary-50',
      iconColor: 'text-primary-500',
      trend:     s.avg_conf_trend,
      trendUp:   true,
    },
    {
      title:     'Winning Ads',
      value:     s.winning_ads,
      icon:      Trophy,
      iconBg:    'bg-success-50',
      iconColor: 'text-success-600',
      trend:     s.winning_ads_trend,
      trendUp:   true,
    },
    {
      title:     'Avg Confidence Score',
      value:     `${s.avg_confidence}%`,
      icon:      BarChart2,
      iconBg:    'bg-blue-50',
      iconColor: 'text-blue-600',
      trend:     s.avg_conf_trend,
      trendUp:   true,
    },
    {
      title:     'Est. Engagement Rate',
      value:     `${s.engagement_rate}%`,
      icon:      Zap,
      iconBg:    'bg-warning-50',
      iconColor: 'text-warning-600',
      trend:     s.engagement_trend,
      trendUp:   true,
      isEst:     true,
    },
    {
      title:     'Est. ROAS',
      value:     `${s.roas_est}x`,
      icon:      TrendUp,
      iconBg:    'bg-emerald-50',
      iconColor: 'text-emerald-600',
      trend:     s.roas_trend,
      trendUp:   true,
      isEst:     true,
    },
  ]
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AIAnalysisPage() {
  const { data: summary,  isLoading: sumLoading  } = useAISummary()
  const { data: timeline, isLoading: tlLoading   } = usePerformanceTimeline()
  const { data: angles,   isLoading: angLoading  } = useTopAnglesDonut()
  const { data: confDist, isLoading: cdLoading   } = useConfidenceDist()
  const { data: winning,  isLoading: winLoading  } = useWinningAds()

  const kpis = buildKPIs(summary)

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Dashboard',   to: '/dashboard' },
        { label: 'AI Analysis' },
      ]} />

      <PageHeader
        title="AI Analysis"
        subtitle="Deep insights and performance analysis across your ad intelligence data"
        rightSlot={
          <div className="flex items-center gap-2">
            <DateRangePicker />
            <Button variant="outline" icon={Download}>Export Report</Button>
          </div>
        }
      />

      {/* Market Overview + Recommendation */}
      <MarketOverview />

      {/* Per-Competitor Breakdown */}
      <CompetitorBreakdown />

      {/* Overall Charts (existing) */}
      <h2 className="text-base font-bold text-text-primary pt-4 border-t border-border-default">Overall Ad Analysis Charts</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {sumLoading
          ? Array.from({ length: 5 }).map((_, i) => <KPIShimmer key={i} />)
          : kpis.map((kpi) => (
              <div key={kpi.title} className="rounded-card border border-border-default bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-secondary">
                      {kpi.isEst ? <EstLabel>{kpi.title}</EstLabel> : kpi.title}
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-text-primary">
                      {kpi.value}
                    </p>
                    {kpi.trend !== undefined && (
                      <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', kpi.trendUp ? 'text-success-600' : 'text-danger-600')}>
                        {kpi.trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span>{kpi.trendUp ? '↑' : '↓'} {Math.abs(kpi.trend)}% vs last 7 days</span>
                      </div>
                    )}
                  </div>
                  <div className={cn('flex-shrink-0 rounded-xl p-2.5', kpi.iconBg)}>
                    <kpi.icon size={22} className={kpi.iconColor} />
                  </div>
                </div>
              </div>
            ))
        }
      </div>

      {/* Charts grid — 3 columns on lg+ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {tlLoading  ? <ChartShimmer h={240} /> : <LineChartCard   data={timeline ?? []} isLoading={false} />}
        {angLoading ? <ChartShimmer h={240} /> : <AnglesDonutCard  data={angles   ?? []} isLoading={false} />}
        {cdLoading  ? <ChartShimmer h={240} /> : <ConfidenceBarCard data={confDist ?? []} isLoading={false} />}
      </div>

      {/* Winning ads table */}
      <WinningAdsTable data={winning} isLoading={winLoading} />
    </div>
  )
}
