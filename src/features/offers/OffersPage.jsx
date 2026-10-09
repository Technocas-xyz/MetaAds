import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Download, Search, Filter, TrendingUp,
  Tag, MessageSquare, Percent, BarChart2, Eye,
  ChevronLeft, ChevronRight, X, ExternalLink,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTip,
  PieChart, Pie, Cell,
  LineChart, Line,
  LabelList,
} from 'recharts'
import Breadcrumb from '../../components/layout/Breadcrumb'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import HookTypeBadge from '../../components/ui/HookTypeBadge'
import DateRangePicker from '../../components/ui/DateRangePicker'
import KPICard from '../../components/ui/KPICard'
import {
  useOffersSummary,
  useOffersTypeDist,
  useOffersPerf,
  useOffersTrend,
  useOffersTable,
  useOffersFilterOptions,
} from '../../hooks/queries/useLibraries'
import { cn } from '../../lib/utils'

// Deterministic avatar color from any id string (works for UUIDs; Number(id)
// was NaN for UUIDs and left avatars invisible).
function avatarColor(key) {
  const s = String(key ?? '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_BG[h % AVATAR_BG.length]
}

// Trending can be a number (percent), the string "New", or null (dash).
function TrendingValue({ value }) {
  if (value === 'New') {
    return <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary-600">New</span>
  }
  if (value === null || value === undefined) {
    return <span className="text-xs font-semibold text-text-tertiary">—</span>
  }
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', value >= 0 ? 'text-success-600' : 'text-danger-600')}>
      {value >= 0 ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  )
}

const PAGE_SIZE_OPTIONS = [10, 25, 50]
const TREND_TYPES       = ['Discount', 'Bundle', 'Free Shipping', 'BOGO']
const ALL_OFFER_TYPES   = ['Discount', 'Bundle', 'Free Shipping', 'BOGO', 'Limited Time', 'Guarantee']
const HOOK_TYPES        = ['Pain', 'Benefit', 'Curiosity', 'Urgency', 'How To', 'Social Proof', 'Trust']
const AVATAR_BG         = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']

const OFFER_HEX = {
  Discount:       '#EF4444',
  Bundle:         '#8B5CF6',
  'Free Shipping':'#3B82F6',
  BOGO:           '#F97316',
  'Limited Time': '#F59E0B',
  Guarantee:      '#22C55E',
  Other:          '#94A3B8',
}

// ── Shared card ───────────────────────────────────────────────────────────────
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

// ── Skeletons ─────────────────────────────────────────────────────────────────
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

// ── Offer type pill ───────────────────────────────────────────────────────────
function OfferTypePill({ type }) {
  const hex = OFFER_HEX[type] ?? '#94A3B8'
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${hex}18`,
        color: hex,
        boxShadow: `inset 0 0 0 1px ${hex}40`,
      }}
    >
      {type}
    </span>
  )
}

// ── Donut — Offer Type Distribution ──────────────────────────────────────────
function DonutTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border-default bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-text-primary">{d.name}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color: OFFER_HEX[d.name] ?? '#94A3B8' }}>
        {d.value.toLocaleString()} · {d.pct}%
      </p>
    </div>
  )
}

function OfferDonutCard({ data, total, isLoading }) {
  return (
    <Card title="Offer Type Distribution">
      {isLoading ? (
        <div className="animate-pulse flex items-center gap-5">
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
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((d, i) => (
                    <Cell key={i} fill={OFFER_HEX[d.name] ?? '#94A3B8'} />
                  ))}
                </Pie>
                <RechartsTip content={<DonutTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-base font-bold leading-tight text-text-primary">
                {total.toLocaleString()}
              </span>
              <span className="text-[11px] text-text-secondary">Mentions</span>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5 overflow-hidden">
            {data.map((item) => (
              <li key={item.name} className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: OFFER_HEX[item.name] ?? '#94A3B8' }}
                />
                <span className="flex-1 truncate text-xs text-text-secondary">{item.name}</span>
                <span className="text-xs font-semibold text-text-primary">{item.pct}%</span>
                <span className="w-14 text-right text-xs text-text-tertiary">
                  {item.value.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

// ── Bar — Offer Longevity (Avg Days Running) ──────────────────────────────────
function PerfBarTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border-default bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-text-primary">{d.type}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color: d.color }}>
        Avg. {d.avg_days} days
      </p>
      <p className="mt-0.5 text-[11px] text-text-secondary">
        {d.ads} ad{d.ads !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

function OfferPerfBarCard({ data, isLoading }) {
  return (
    <Card title="Offer Longevity (Avg. Days Running)">
      {isLoading ? (
        <div className="h-52 animate-pulse rounded-lg bg-gray-100" />
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal vertical={false} />
              <XAxis
                dataKey="type"
                tick={{ fontSize: 9, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <RechartsTip content={<PerfBarTip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="avg_days" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                <LabelList
                  dataKey="avg_days"
                  position="top"
                  formatter={(v) => `${v}d`}
                  style={{ fontSize: 9, fontWeight: 600, fill: '#64748B' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

// ── Line — Offer Trend ────────────────────────────────────────────────────────
function TrendLineTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border-default bg-white px-3 py-2 shadow-lg text-xs">
      <p className="mb-1.5 font-semibold text-text-primary">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: p.color }} />
          <span className="text-text-secondary">{p.dataKey}:</span>
          <span className="font-medium text-text-primary">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function OfferTrendLineCard({ data, isLoading }) {
  return (
    <Card title="Offer Trend (Mentions Over Time)">
      {isLoading ? (
        <div className="h-52 animate-pulse rounded-lg bg-gray-100" />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-3">
            {TREND_TYPES.map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <span className="h-2.5 w-4 flex-shrink-0 rounded-sm" style={{ background: OFFER_HEX[t] }} />
                <span className="text-xs text-text-secondary">{t}</span>
              </div>
            ))}
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <RechartsTip content={<TrendLineTip />} cursor={{ stroke: '#E2E8F0' }} />
                {TREND_TYPES.map((t, i) => (
                  <Line
                    key={t}
                    type="monotone"
                    dataKey={t}
                    stroke={OFFER_HEX[t]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    strokeDasharray={i === 0 ? undefined : i === 1 ? '5 2' : i === 2 ? '3 3' : '2 4'}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  )
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
// This page filters by its own dimension (Offer Type) plus Competitor and Confidence.
const CONFIDENCE_OPTIONS = ['All', 'High (80%+)', 'Medium (50–79%)', 'Low (<50%)']

function FilterBar({ filters, onChange, onApply, onClear, options }) {
  const offerOpts      = ['All Types', ...(options?.offer_types ?? [])]
  const competitorOpts = options?.competitors ?? []

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-card border border-border-default bg-white p-4 shadow-card">
      <div className="relative min-w-[180px] flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          placeholder="Search offers…"
          value={filters.search}
          onChange={(e) => onChange('search', e.target.value)}
          className="h-9 w-full rounded-btn border border-border-default bg-white pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Offer Type (this page's dimension) */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary">Offer Type</label>
        <select
          value={filters.offerType}
          onChange={(e) => onChange('offerType', e.target.value)}
          className="h-9 rounded-btn border border-border-default bg-white px-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {offerOpts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Competitor — value is the competitor id, label is the name */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary">Competitor</label>
        <select
          value={filters.competitor}
          onChange={(e) => onChange('competitor', e.target.value)}
          className="h-9 rounded-btn border border-border-default bg-white px-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="All Competitors">All Competitors</option>
          {competitorOpts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Confidence */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary">Confidence</label>
        <select
          value={filters.confidence}
          onChange={(e) => onChange('confidence', e.target.value)}
          className="h-9 rounded-btn border border-border-default bg-white px-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {CONFIDENCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" icon={X} onClick={onClear}>Clear</Button>
        <Button variant="primary" size="sm" icon={Filter} onClick={onApply}>Apply Filters</Button>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ConfScore({ score }) {
  const color = score >= 80 ? 'text-success-700' : score >= 50 ? 'text-warning-700' : 'text-danger-700'
  const bg    = score >= 80 ? 'bg-success-50'    : score >= 50 ? 'bg-warning-50'    : 'bg-danger-50'
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', bg, color)}>
      {score}%
    </span>
  )
}

function CompetitorAvatars({ competitors, extra }) {
  return (
    <div className="flex -space-x-1.5">
      {competitors.map((c, i) => (
        <div
          key={c.id}
          title={c.name}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white"
          style={{
            backgroundColor: avatarColor(c.id),
            zIndex: competitors.length - i,
          }}
        >
          {c.initials}
        </div>
      ))}
      {extra > 0 && (
        <div
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-[10px] font-bold text-gray-600"
          style={{ zIndex: 0 }}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}

// ── Offers Table ──────────────────────────────────────────────────────────────
function OffersTable({ rows, total, page, pageSize, onPageChange, onPageSizeChange, onSelectOffer }) {
  const totalPages = Math.ceil(total / pageSize)
  const rangeStart = (page - 1) * pageSize + 1
  const rangeEnd   = Math.min(page * pageSize, total)

  const pageBtns = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const range = []
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) range.push(i)
    const out = [1]
    if (range[0] > 2) out.push('…')
    out.push(...range)
    if (range[range.length - 1] < totalPages - 1) out.push('…')
    out.push(totalPages)
    return out
  }, [page, totalPages])

  return (
    <div className="rounded-card border border-border-default bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-border-default px-5 py-3.5">
        <h3 className="text-sm font-semibold text-text-primary">All Offers</h3>
        <span className="text-xs text-text-tertiary">{total.toLocaleString()} offers</span>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[1020px] text-sm">
          <thead>
            <tr className="border-b border-border-default bg-gray-50/50">
              {[
                { label: '#',               align: 'left',   cls: 'w-10' },
                { label: 'Offer',           align: 'left'  },
                { label: 'Type',            align: 'left'  },
                { label: 'Mentions ↓',      align: 'right' },
                { label: 'Avg. Confidence', align: 'center'},
                { label: 'Top Competitors', align: 'left'  },
                { label: 'Trending',        align: 'right' },
                { label: 'Example Ads',     align: 'left'  },
                { label: 'Actions',         align: 'center'},
              ].map(({ label, align, cls }) => (
                <th
                  key={label}
                  className={cn('px-4 py-3 text-xs font-semibold text-text-secondary', `text-${align}`, cls)}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-gray-50/60">
                {/* # */}
                <td className="px-4 py-3 text-xs font-medium text-text-tertiary">{row.rank}</td>

                {/* Offer text */}
                <td className="px-4 py-3">
                  <div className="flex max-w-[240px] items-start gap-1.5">
                    <span className="text-sm font-medium leading-snug text-text-primary">
                      {row.text}
                    </span>
                    {row.rank === 1 && (
                      <span className="mt-0.5 inline-flex flex-shrink-0 items-center rounded-full bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700 ring-1 ring-primary-200">
                        Top
                      </span>
                    )}
                  </div>
                </td>

                {/* Type */}
                <td className="px-4 py-3">
                  <OfferTypePill type={row.type} />
                </td>

                {/* Mentions */}
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-text-primary">
                    {row.mentions.toLocaleString()}
                  </span>
                </td>

                {/* Avg Confidence */}
                <td className="px-4 py-3 text-center">
                  <ConfScore score={row.avg_confidence} />
                </td>

                {/* Competitors */}
                <td className="px-4 py-3">
                  <CompetitorAvatars competitors={row.competitors} extra={row.extra_competitors} />
                </td>

                {/* Trending */}
                <td className="px-4 py-3 text-right">
                  <TrendingValue value={row.trending} />
                </td>

                {/* Example Ads — 4 thumbnails */}
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {row.example_ads.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="h-8 w-8 rounded-md border border-border-default object-cover"
                      />
                    ))}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectOffer(row)}
                      className="rounded-btn p-1.5 text-text-tertiary transition-colors hover:bg-gray-100 hover:text-text-primary"
                      title="View details"
                    >
                      <Eye size={15} />
                    </button>
                    <Link
                      to="/ai-analysis"
                      className="rounded-btn p-1.5 text-text-tertiary transition-colors hover:bg-gray-100 hover:text-text-primary"
                      title="View in analysis"
                    >
                      <BarChart2 size={15} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border-default sm:hidden">
        {rows.map((row) => (
          <div key={row.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-xs text-text-tertiary">#{row.rank}</span>
                  <div>
                    <p className="text-sm font-medium leading-snug text-text-primary">{row.text}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <OfferTypePill type={row.type} />
                      {row.rank === 1 && (
                        <span className="inline-flex items-center rounded-full bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700 ring-1 ring-primary-200">
                          Top
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectOffer(row)}
                className="rounded-btn p-1.5 text-text-tertiary hover:bg-gray-100"
              >
                <Eye size={15} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-text-secondary">{row.mentions.toLocaleString()} mentions</span>
              <ConfScore score={row.avg_confidence} />
              <TrendingValue value={row.trending} />
            </div>
            <div className="flex gap-1">
              {row.example_ads.map((url, i) => (
                <img key={i} src={url} alt="" className="h-8 w-8 rounded-md border border-border-default object-cover" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary">
            Showing {rangeStart.toLocaleString()} to {rangeEnd.toLocaleString()} of{' '}
            {total.toLocaleString()} offers
          </span>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-text-tertiary">Per page:</label>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded-btn border border-border-default bg-white px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="rounded-btn p-1.5 text-text-secondary hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          {pageBtns.map((p, i) =>
            p === '…' ? (
              <span key={`d${i}`} className="px-1 text-xs text-text-tertiary">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={cn(
                  'h-7 min-w-[28px] rounded-btn px-1 text-xs font-medium',
                  p === page ? 'bg-primary-600 text-white' : 'text-text-secondary hover:bg-gray-100',
                )}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="rounded-btn p-1.5 text-text-secondary hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Offer Detail Drawer ───────────────────────────────────────────────────────
function OfferDetailDrawer({ offer, onClose }) {
  return (
    <Dialog.Root open={!!offer} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
          aria-describedby={undefined}
        >
          {offer && (
            <>
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-default bg-white px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <OfferTypePill type={offer.type} />
                  <Dialog.Title className="text-sm font-semibold text-text-primary">
                    Offer Details
                  </Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-btn p-1.5 text-text-tertiary transition-colors hover:bg-gray-100 hover:text-text-primary"
                  >
                    <X size={16} />
                  </button>
                </Dialog.Close>
              </div>

              {/* Body */}
              <div className="flex-1 space-y-5 p-5">
                {/* Offer text */}
                <div>
                  <p className="text-base font-semibold leading-snug text-text-primary">
                    "{offer.text}"
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {offer.description}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Mentions',        value: offer.mentions.toLocaleString(), colorCls: null },
                    { label: 'Avg. Confidence', value: `${offer.avg_confidence}%`,      colorCls: null },
                    {
                      label:    'Trend',
                      value:    offer.trending === 'New'
                        ? 'New'
                        : (offer.trending === null || offer.trending === undefined)
                          ? '—'
                          : `${offer.trending >= 0 ? '+' : ''}${offer.trending}%`,
                      colorCls: typeof offer.trending === 'number'
                        ? (offer.trending >= 0 ? 'text-success-600' : 'text-danger-600')
                        : null,
                    },
                  ].map(({ label, value, colorCls }) => (
                    <div key={label} className="rounded-lg border border-border-default p-3 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                        {label}
                      </p>
                      <p className={cn('mt-1 text-xl font-bold text-text-primary', colorCls)}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Meta */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-28 flex-shrink-0 text-xs text-text-tertiary">First Seen</span>
                    <span className="text-xs font-medium text-text-primary">{offer.first_seen}</span>
                  </div>
                </div>

                {/* Related Hooks */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Related Hook Types
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {offer.related_hooks.map((h) => (
                      <HookTypeBadge key={h} type={h} />
                    ))}
                  </div>
                </div>

                {/* Top Competitors */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Competitors Using This Offer
                  </p>
                  <div className="space-y-2">
                    {offer.competitors.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 rounded-lg border border-border-default p-2.5"
                      >
                        <div
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: avatarColor(c.id) }}
                        >
                          {c.initials}
                        </div>
                        <span className="text-sm font-medium text-text-primary">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Example Ads */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Ads Using This Offer
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {offer.example_ads.map((url, i) => (
                      <div
                        key={i}
                        className="group relative overflow-hidden rounded-lg border border-border-default"
                      >
                        <img src={url} alt="" className="h-20 w-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <Link to="/ads" className="rounded-full bg-white/90 p-1.5 text-text-primary">
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-border-default bg-white p-4">
                <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
                <Button variant="primary" size="sm" to="/ads">View All Ads</Button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  search:     '',
  offerType:  'All Types',
  competitor: 'All Competitors',
  confidence: 'All',
  days:       null,          // date-range picker; null = All time (no date filter), the default
}

const CONFIDENCE_RANGE = {
  'High (80%+)':     { min_confidence: 80 },
  'Medium (50–79%)': { min_confidence: 50, max_confidence: 79.999 },
  'Low (<50%)':      { max_confidence: 49.999 },
}

// One shared param set for every endpoint (cards, charts, table).
function buildParams(a) {
  const p = {}
  if (a.search) p.search = a.search
  if (a.offerType && a.offerType !== 'All Types') p.offer_type = a.offerType
  if (a.competitor && a.competitor !== 'All Competitors') p.competitor_id = a.competitor
  Object.assign(p, CONFIDENCE_RANGE[a.confidence] ?? {})
  if (a.days) {
    const from = new Date()
    from.setUTCDate(from.getUTCDate() - (Number(a.days) - 1))
    p.date_from = from.toISOString().slice(0, 10)
    p.days = Number(a.days)
  }
  return p
}

function filtersFromSearchParams(sp) {
  const f = { ...DEFAULT_FILTERS }
  for (const key of Object.keys(DEFAULT_FILTERS)) {
    const v = sp.get(key)
    if (v !== null && v !== '') f[key] = key === 'days' ? Number(v) : v
  }
  return f
}

function searchParamsFromFilters(f) {
  const out = {}
  for (const key of Object.keys(DEFAULT_FILTERS)) {
    if (String(f[key]) !== String(DEFAULT_FILTERS[key])) out[key] = String(f[key])
  }
  return out
}

export default function OfferLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters]           = useState(() => filtersFromSearchParams(searchParams))
  const [applied, setApplied]           = useState(() => filtersFromSearchParams(searchParams))
  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(10)
  const [selectedOffer, setSelectedOffer] = useState(null)

  const { data: options } = useOffersFilterOptions()

  const queryParams = useMemo(() => buildParams(applied), [applied])

  const { data: summary,   isLoading: sumLoading   } = useOffersSummary(queryParams)
  const { data: typeDist,  isLoading: distLoading  } = useOffersTypeDist(queryParams)
  const { data: perfData,  isLoading: perfLoading  } = useOffersPerf(queryParams)
  const { data: trendData, isLoading: trendLoading } = useOffersTrend(queryParams)
  const { data: tableData, isLoading: tableLoading } = useOffersTable(queryParams)

  const changeFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }))

  const applyFilters = () => {
    setApplied(filters)
    setSearchParams(searchParamsFromFilters(filters), { replace: true })
    setPage(1)
  }
  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setApplied(DEFAULT_FILTERS)
    setSearchParams({}, { replace: true })
    setPage(1)
  }
  const handlePageSizeChange = (n) => { setPageSize(n); setPage(1) }

  // All filtering is server-side; the table reflects queryParams directly.
  const filtered = tableData ?? []

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  )

  const donutTotal = typeDist?.reduce((s, d) => s + d.value, 0) ?? 0
  const discShare  = summary?.discount_heavy_share ?? 0

  return (
    <div className="space-y-5">
      <Breadcrumb />

      <PageHeader
        title="Offer Library"
        subtitle="Track every promotional offer format across your competitive ad landscape."
        rightSlot={
          <div className="flex items-center gap-2">
            <DateRangePicker
              value={filters.days}
              onChange={(preset) => {
                const next = { ...filters, days: preset.days }
                setFilters(next)
                setApplied(next)
                setSearchParams(searchParamsFromFilters(next), { replace: true })
                setPage(1)
              }}
            />
            <Button variant="outline" size="sm" icon={Download}>Export</Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-5">
        {sumLoading
          ? Array.from({ length: 5 }).map((_, i) => <KPIShimmer key={i} />)
          : (
            <>
              <KPICard
                title="Total Unique Offers"
                value={summary?.total_unique}
                icon={Tag}
                iconBg="bg-primary-50"
                iconColor="text-primary-600"
                note="Across all tracked competitors"
              />
              <KPICard
                title="Total Offer Mentions"
                value={summary?.total_mentions}
                icon={MessageSquare}
                iconBg="bg-red-50"
                iconColor="text-red-600"
                trend={summary?.mentions_trend}
                trendUp
              />
              <KPICard
                title="Top Offer Type"
                value={summary?.top_offer_type}
                icon={BarChart2}
                iconBg="bg-red-50"
                iconColor="text-red-600"
                note={`${summary?.top_offer_type_pct}% of all mentions`}
              />

              {/* Discount-Heavy Share — custom with mini progress bar */}
              <div className="rounded-card border border-border-default bg-white px-4 py-3.5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 w-full">
                    <p className="text-xs font-medium text-text-secondary">Discount-Heavy Share</p>
                    <p className="mt-0.5 text-2xl font-semibold leading-tight tracking-tight tabular-nums text-text-primary">
                      {discShare}%
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-red-500 transition-all"
                          style={{ width: `${discShare}%` }}
                        />
                      </div>
                      <span className="flex-shrink-0 text-xs text-text-tertiary">of all mentions</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 rounded-lg bg-red-50 p-2">
                    <Percent size={22} className="text-red-500" />
                  </div>
                </div>
              </div>

              {/* Trending Offer Format — custom */}
              <div className="rounded-card border border-border-default bg-white px-4 py-3.5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-secondary">Trending Offer Format</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <OfferTypePill type={summary?.trending_offer?.type ?? ''} />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs font-medium text-text-primary">
                      {summary?.trending_offer?.text ?? '—'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-semibold text-success-700 ring-1 ring-success-200">
                        <TrendingUp size={9} />
                        Trending
                      </span>
                      <span className="text-xs font-semibold text-success-600">
                        ↑ {summary?.trending_offer?.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 rounded-lg bg-success-50 p-2">
                    <TrendingUp size={18} className="text-success-600" />
                  </div>
                </div>
              </div>
            </>
          )}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 xl:grid-cols-3">
        {distLoading  ? <ChartShimmer h={220} /> : <OfferDonutCard    data={typeDist  ?? []} total={donutTotal} isLoading={false} />}
        {perfLoading  ? <ChartShimmer h={220} /> : <OfferPerfBarCard  data={perfData  ?? []} isLoading={false} />}
        {trendLoading ? <ChartShimmer h={220} /> : <OfferTrendLineCard data={trendData ?? []} isLoading={false} />}
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        options={options}
        onChange={changeFilter}
        onApply={applyFilters}
        onClear={clearFilters}
      />

      {/* Table */}
      {tableLoading ? (
        <ChartShimmer h={300} />
      ) : (
        <OffersTable
          rows={paginated}
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          onSelectOffer={setSelectedOffer}
        />
      )}

      {/* Detail drawer */}
      <OfferDetailDrawer offer={selectedOffer} onClose={() => setSelectedOffer(null)} />
    </div>
  )
}
