import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Download, Search, Filter, TrendingUp, Hash,
  MessageSquare, Award, BarChart2, Eye,
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
  useHooksSummary,
  useHooksTypeDist,
  useHooksPerf,
  useHooksTrend,
  useHooksTable,
} from '../../hooks/queries/useLibraries'
import { cn } from '../../lib/utils'

const PAGE_SIZE = 10

const TYPE_HEX = {
  Pain:           '#EF4444',
  Benefit:        '#22C55E',
  Curiosity:      '#8B5CF6',
  Urgency:        '#F97316',
  'How To':       '#14B8A6',
  'Social Proof': '#6366F1',
  Trust:          '#3B82F6',
}
const ALL_TYPES   = ['Pain', 'Benefit', 'Curiosity', 'Urgency', 'How To', 'Social Proof', 'Trust']
const TREND_TYPES = ['Pain', 'Benefit', 'Curiosity', 'Urgency']
const AVATAR_BG   = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']

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

// ── Shimmer skeletons ──────────────────────────────────────────────────────────
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

// ── Donut — Hook Type Distribution ────────────────────────────────────────────
function DonutTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border-default bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-text-primary">{d.name}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color: TYPE_HEX[d.name] ?? '#94A3B8' }}>
        {d.value.toLocaleString()} · {d.pct}%
      </p>
    </div>
  )
}

function HookTypeDonutCard({ data, isLoading }) {
  const total = data?.reduce((s, d) => s + d.value, 0) ?? 0
  return (
    <Card title="Hook Type Distribution">
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
                    <Cell key={i} fill={TYPE_HEX[d.name] ?? '#94A3B8'} />
                  ))}
                </Pie>
                <RechartsTip content={<DonutTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold leading-none text-text-primary">
                {(total / 1000).toFixed(1)}k
              </span>
              <span className="mt-0.5 text-[10px] text-text-secondary">Total</span>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5 overflow-hidden">
            {data.map((item) => (
              <li key={item.name} className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: TYPE_HEX[item.name] ?? '#94A3B8' }}
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

// ── Bar — Hook Performance (Avg Confidence) ───────────────────────────────────
function PerfBarTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border-default bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-text-primary">{d.type}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color: d.color }}>
        Avg. {d.avg_score}%
      </p>
    </div>
  )
}

function HookPerfBarCard({ data, isLoading }) {
  return (
    <Card title="Hook Performance (Avg. Confidence Score)">
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
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                width={32}
              />
              <RechartsTip content={<PerfBarTip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="avg_score" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                <LabelList
                  dataKey="avg_score"
                  position="top"
                  formatter={(v) => `${v}%`}
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

// ── Line — Hook Trend (Mentions Over Time) ────────────────────────────────────
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

function HookTrendLineCard({ data, isLoading }) {
  return (
    <Card title="Hook Trend (Mentions Over Time)">
      {isLoading ? (
        <div className="h-52 animate-pulse rounded-lg bg-gray-100" />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-3">
            {TREND_TYPES.map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-4 flex-shrink-0 rounded-sm"
                  style={{ background: TYPE_HEX[t] }}
                />
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
                    stroke={TYPE_HEX[t]}
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
const OFFER_OPTIONS      = ['All Offers', 'Discount 40%', 'Free Shipping', 'Bundle Deal', 'BOGO', 'Limited Time']
const COMPETITOR_OPTIONS = ['All Competitors', 'PrintMagic Pro', 'DTFworld', 'PrintZone', 'ThreadBeast', 'VividPrints']
const CONFIDENCE_OPTIONS = ['All', 'High (80%+)', 'Medium (50–79%)', 'Low (<50%)']

function FilterBar({ filters, onChange, onApply, onClear }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-card border border-border-default bg-white p-4 shadow-card">
      <div className="relative min-w-[180px] flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          placeholder="Search hooks…"
          value={filters.search}
          onChange={(e) => onChange('search', e.target.value)}
          className="h-9 w-full rounded-btn border border-border-default bg-white pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {[
        { key: 'hookType',   label: 'Hook Type',   options: ['All Types', ...ALL_TYPES] },
        { key: 'offerType',  label: 'Offer Type',  options: OFFER_OPTIONS },
        { key: 'competitor', label: 'Competitor',  options: COMPETITOR_OPTIONS },
        { key: 'confidence', label: 'Confidence',  options: CONFIDENCE_OPTIONS },
      ].map(({ key, label, options }) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary">{label}</label>
          <select
            value={filters[key]}
            onChange={(e) => onChange(key, e.target.value)}
            className="h-9 rounded-btn border border-border-default bg-white px-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" icon={X} onClick={onClear}>Clear</Button>
        <Button variant="primary" size="sm" icon={Filter} onClick={onApply}>Apply</Button>
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
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
          style={{
            backgroundColor: AVATAR_BG[Number(c.id) % AVATAR_BG.length],
            zIndex: competitors.length - i,
          }}
        >
          {c.initials}
        </div>
      ))}
      {extra > 0 && (
        <div
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-[9px] font-bold text-gray-600"
          style={{ zIndex: 0 }}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}

// ── Hooks Table ───────────────────────────────────────────────────────────────
function HooksTable({ rows, total, page, onPageChange, onSelectHook }) {
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="rounded-card border border-border-default bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-border-default px-5 py-3.5">
        <h3 className="text-sm font-semibold text-text-primary">All Hooks</h3>
        <span className="text-xs text-text-tertiary">{total} hook{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-border-default bg-gray-50/50">
              {['#', 'Hook', 'Description', 'Mentions ↓', 'Avg. Confidence', 'Top Competitors', 'Trending', 'Example Ads', 'Actions'].map((h) => (
                <th
                  key={h}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold text-text-secondary',
                    ['Mentions ↓', 'Trending'].includes(h) ? 'text-right' : 'text-left',
                    h === 'Avg. Confidence' && 'text-center',
                    h === 'Actions' && 'text-center',
                    h === '#' && 'w-10',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-gray-50/60">
                {/* # */}
                <td className="px-4 py-3 text-xs font-medium text-text-tertiary">{row.rank}</td>

                {/* Hook */}
                <td className="px-4 py-3">
                  <div className="flex max-w-[220px] flex-col gap-1.5">
                    <div className="flex items-start gap-1.5">
                      <span className="text-sm font-medium leading-snug text-text-primary">
                        {row.text}
                      </span>
                      {row.rank === 1 && (
                        <span className="mt-0.5 inline-flex flex-shrink-0 items-center rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700 ring-1 ring-primary-200">
                          Top
                        </span>
                      )}
                    </div>
                    <HookTypeBadge type={row.type} />
                  </div>
                </td>

                {/* Description */}
                <td className="max-w-[180px] px-4 py-3">
                  <p className="line-clamp-2 text-xs leading-relaxed text-text-secondary">
                    {row.description}
                  </p>
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
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 text-xs font-semibold',
                      row.trending >= 0 ? 'text-success-600' : 'text-danger-600',
                    )}
                  >
                    {row.trending >= 0 ? '↑' : '↓'} {Math.abs(row.trending)}%
                  </span>
                </td>

                {/* Example Ads */}
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {row.example_ads.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="h-9 w-9 rounded-md border border-border-default object-cover"
                      />
                    ))}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectHook(row)}
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
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <HookTypeBadge type={row.type} />
                      {row.rank === 1 && (
                        <span className="inline-flex items-center rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700 ring-1 ring-primary-200">
                          Top
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectHook(row)}
                className="rounded-btn p-1.5 text-text-tertiary hover:bg-gray-100"
              >
                <Eye size={15} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-text-secondary">{row.mentions.toLocaleString()} mentions</span>
              <ConfScore score={row.avg_confidence} />
              <span className={cn('font-semibold', row.trending >= 0 ? 'text-success-600' : 'text-danger-600')}>
                {row.trending >= 0 ? '↑' : '↓'} {Math.abs(row.trending)}%
              </span>
            </div>
            <div className="flex gap-1">
              {row.example_ads.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="h-9 w-9 rounded-md border border-border-default object-cover"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border-default px-5 py-3.5">
          <span className="text-xs text-text-secondary">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="rounded-btn p-1.5 text-text-secondary hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={cn(
                  'h-7 w-7 rounded-btn text-xs font-medium',
                  p === page
                    ? 'bg-primary-600 text-white'
                    : 'text-text-secondary hover:bg-gray-100',
                )}
              >
                {p}
              </button>
            ))}
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
      )}
    </div>
  )
}

// ── Hook Detail Drawer ─────────────────────────────────────────────────────────
function HookDetailDrawer({ hook, onClose }) {
  return (
    <Dialog.Root open={!!hook} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
          aria-describedby={undefined}
        >
          {hook && (
            <>
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-default bg-white px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <HookTypeBadge type={hook.type} />
                  <Dialog.Title className="text-sm font-semibold text-text-primary">
                    Hook Details
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
                {/* Hook text */}
                <div>
                  <p className="text-base font-semibold leading-snug text-text-primary">
                    "{hook.text}"
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {hook.description}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Mentions',        value: hook.mentions.toLocaleString(), plain: true },
                    { label: 'Avg. Confidence', value: `${hook.avg_confidence}%`,      plain: true },
                    {
                      label: 'Trend',
                      value: `${hook.trending >= 0 ? '+' : ''}${hook.trending}%`,
                      color: hook.trending >= 0 ? 'text-success-600' : 'text-danger-600',
                    },
                  ].map(({ label, value, plain, color }) => (
                    <div
                      key={label}
                      className="rounded-lg border border-border-default p-3 text-center"
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                        {label}
                      </p>
                      <p className={cn('mt-1 text-xl font-bold text-text-primary', color)}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Meta */}
                <div className="space-y-2">
                  {hook.offer_type && (
                    <div className="flex items-center gap-3">
                      <span className="w-28 flex-shrink-0 text-xs text-text-tertiary">Offer Type</span>
                      <Badge color="gray">{hook.offer_type}</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="w-28 flex-shrink-0 text-xs text-text-tertiary">First Seen</span>
                    <span className="text-xs font-medium text-text-primary">{hook.first_seen}</span>
                  </div>
                </div>

                {/* Related Angles */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Related Angles
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {hook.related_angles.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 ring-1 ring-primary-200"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Top Competitors */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Top Competitors Using This Hook
                  </p>
                  <div className="space-y-2">
                    {hook.competitors.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 rounded-lg border border-border-default p-2.5"
                      >
                        <div
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: AVATAR_BG[Number(c.id) % AVATAR_BG.length] }}
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
                    Example Ads Using This Hook
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {hook.example_ads.map((url, i) => (
                      <div
                        key={i}
                        className="group relative overflow-hidden rounded-lg border border-border-default"
                      >
                        <img src={url} alt="" className="h-24 w-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <Link
                            to="/ads"
                            className="rounded-full bg-white/90 p-1.5 text-text-primary"
                          >
                            <ExternalLink size={13} />
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
  hookType:   'All Types',
  offerType:  'All Offers',
  competitor: 'All Competitors',
  confidence: 'All',
}

export default function HookLibraryPage() {
  const [filters, setFilters]       = useState(DEFAULT_FILTERS)
  const [applied, setApplied]       = useState(DEFAULT_FILTERS)
  const [page, setPage]             = useState(1)
  const [selectedHook, setSelectedHook] = useState(null)

  const { data: summary,   isLoading: sumLoading   } = useHooksSummary()
  const { data: typeDist,  isLoading: distLoading  } = useHooksTypeDist()
  const { data: perfData,  isLoading: perfLoading  } = useHooksPerf()
  const { data: trendData, isLoading: trendLoading } = useHooksTrend()
  const { data: tableData, isLoading: tableLoading } = useHooksTable()

  const changeFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }))

  const applyFilters = () => {
    setApplied(filters)
    setPage(1)
  }

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setApplied(DEFAULT_FILTERS)
    setPage(1)
  }

  const filtered = useMemo(() => {
    if (!tableData) return []
    return tableData.filter((row) => {
      const q = applied.search.toLowerCase()
      if (q && !row.text.toLowerCase().includes(q) && !row.description.toLowerCase().includes(q))
        return false
      if (applied.hookType !== 'All Types' && row.type !== applied.hookType)
        return false
      if (applied.offerType !== 'All Offers' && row.offer_type !== applied.offerType)
        return false
      if (
        applied.competitor !== 'All Competitors' &&
        !row.competitors.some((c) => c.name === applied.competitor)
      )
        return false
      if (applied.confidence === 'High (80%+)' && row.avg_confidence < 80) return false
      if (
        applied.confidence === 'Medium (50–79%)' &&
        (row.avg_confidence < 50 || row.avg_confidence >= 80)
      )
        return false
      if (applied.confidence === 'Low (<50%)' && row.avg_confidence >= 50) return false
      return true
    })
  }, [tableData, applied])

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Breadcrumb />

      <PageHeader
        title="Hook Library"
        subtitle="Browse, filter and analyse all AI-extracted hooks across your tracked competitors."
        rightSlot={
          <div className="flex items-center gap-2">
            <DateRangePicker />
            <Button variant="outline" size="sm" icon={Download}>Export</Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {sumLoading
          ? Array.from({ length: 5 }).map((_, i) => <KPIShimmer key={i} />)
          : (
            <>
              <KPICard
                title="Total Unique Hooks"
                value={summary?.total_unique}
                icon={Hash}
                iconBg="bg-primary-50"
                iconColor="text-primary-600"
                note="Across all tracked competitors"
              />
              <KPICard
                title="Total Mentions"
                value={summary?.total_mentions}
                icon={MessageSquare}
                iconBg="bg-cyan-50"
                iconColor="text-cyan-600"
                trend={summary?.mentions_trend}
                trendUp
              />
              <KPICard
                title="Top Hook Type"
                value={summary?.top_hook_type}
                icon={BarChart2}
                iconBg="bg-red-50"
                iconColor="text-red-600"
                note={`${summary?.top_hook_type_pct}% of all mentions`}
              />

              {/* Top Performing Hook — custom card */}
              <div className="rounded-card border border-border-default bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-secondary">Top Performing Hook</p>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-text-primary">
                      {summary?.top_performing_hook?.text ?? '—'}
                    </p>
                    <p className="mt-2 text-xs text-text-secondary">
                      Avg score:{' '}
                      <span className="font-semibold text-success-600">
                        {summary?.top_performing_hook?.avg_score}%
                      </span>
                    </p>
                  </div>
                  <div className="flex-shrink-0 rounded-xl bg-amber-50 p-2.5">
                    <Award size={22} className="text-amber-600" />
                  </div>
                </div>
              </div>

              {/* Trending Hook — custom card */}
              <div className="rounded-card border border-border-default bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-secondary">Trending Hook</p>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-text-primary">
                      {summary?.trending_hook?.text ?? '—'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700 ring-1 ring-success-200">
                        <TrendingUp size={9} />
                        Trending
                      </span>
                      <span className="text-xs font-semibold text-success-600">
                        ↑ {summary?.trending_hook?.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 rounded-xl bg-success-50 p-2.5">
                    <TrendingUp size={22} className="text-success-600" />
                  </div>
                </div>
              </div>
            </>
          )}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 xl:grid-cols-3">
        {distLoading  ? <ChartShimmer h={220} /> : <HookTypeDonutCard data={typeDist  ?? []} isLoading={false} />}
        {perfLoading  ? <ChartShimmer h={220} /> : <HookPerfBarCard   data={perfData  ?? []} isLoading={false} />}
        {trendLoading ? <ChartShimmer h={220} /> : <HookTrendLineCard data={trendData ?? []} isLoading={false} />}
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={changeFilter}
        onApply={applyFilters}
        onClear={clearFilters}
      />

      {/* Table */}
      {tableLoading ? (
        <ChartShimmer h={300} />
      ) : (
        <HooksTable
          rows={paginated}
          total={filtered.length}
          page={page}
          onPageChange={setPage}
          onSelectHook={setSelectedHook}
        />
      )}

      {/* Detail drawer */}
      <HookDetailDrawer hook={selectedHook} onClose={() => setSelectedHook(null)} />
    </div>
  )
}
