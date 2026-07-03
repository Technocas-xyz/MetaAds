import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye, BarChart2, MoreHorizontal, ExternalLink,
  ChevronDown, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import Badge from '../../../components/ui/Badge'
import { cn } from '../../../lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return { date: '—', time: '' }
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }
}

const TIER_COLOR = { High: 'red', Medium: 'amber', Low: 'slate' }

function Trend({ up, value }) {
  return (
    <span className={cn('flex items-center gap-0.5 text-xs', up ? 'text-success-600' : 'text-danger-600')}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? '↑' : '↓'}{value}%
    </span>
  )
}

// ── Skeletons ──────────────────────────────────────────────────────────────────
function RowSkeleton() {
  return (
    <tr className="border-b border-gray-50">
      {[160, 100, 80, 80, 80, 80, 72, 72, 72, 48, 88, 64].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3.5 animate-pulse rounded bg-gray-200" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-card border border-border-default bg-white p-4 shadow-card">
      <div className="flex gap-3">
        <div className="h-10 w-10 flex-shrink-0 rounded-md bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-36 rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-200" />
          <div className="flex gap-2 pt-1">
            <div className="h-5 w-16 rounded-full bg-gray-200" />
            <div className="h-5 w-20 rounded-full bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Actions dropdown ────────────────────────────────────────────────────────────
function ActionsMenu({ competitor }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="rounded-md p-1 text-text-tertiary hover:bg-gray-100 hover:text-text-primary focus-visible:outline-none">
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[148px] rounded-card border border-border-default bg-white p-1.5 shadow-lg"
        >
          <DropdownMenu.Item asChild>
            <Link
              to={`/competitors/${competitor.id}`}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary outline-none hover:bg-gray-50"
            >
              <Eye size={14} className="text-text-secondary" /> View details
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link
              to={`/competitors/${competitor.id}#analytics`}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary outline-none hover:bg-gray-50"
            >
              <BarChart2 size={14} className="text-text-secondary" /> Analytics
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-gray-100" />
          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger-600 outline-none hover:bg-danger-50">
            Remove
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ── Desktop table row ──────────────────────────────────────────────────────────
function TableRow({ competitor, expanded, onToggleExpand }) {
  const navigate = useNavigate()
  const s = competitor.stats
  const { date, time } = fmtDate(s.last_activity)

  return (
    <>
      <tr
        onClick={() => navigate(`/competitors/${competitor.id}`)}
        className="cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/60"
      >
        {/* Competitor */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-border-default bg-gray-50 text-sm font-bold text-text-tertiary">
              {competitor.logo_url
                ? <img src={competitor.logo_url} alt="" className="h-full w-full rounded-md object-cover" />
                : competitor.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">{competitor.name}</p>
              <a
                href={`https://${competitor.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-0.5 text-xs text-text-secondary hover:text-primary-600"
              >
                {competitor.domain}
                <ExternalLink size={10} className="flex-shrink-0" />
              </a>
            </div>
          </div>
        </td>

        {/* Niche */}
        <td className="px-4 py-4">
          <div className="flex flex-col gap-1">
            {competitor.niches.map((n) => (
              <span key={n} className="inline-flex w-fit items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs text-text-secondary ring-1 ring-gray-200">
                {n}
              </span>
            ))}
          </div>
        </td>

        {/* Priority Tier */}
        <td className="px-4 py-4">
          <Badge color={TIER_COLOR[competitor.priority_tier] ?? 'gray'}>
            {competitor.priority_tier}
          </Badge>
        </td>

        {/* Total Ads */}
        <td className="px-4 py-4">
          <p className="text-sm font-medium text-text-primary">{s.total_ads.toLocaleString()}</p>
          <Trend up={s.total_ads_trend_up} value={s.total_ads_trend} />
        </td>

        {/* Existing Ads */}
        <td className="px-4 py-4">
          <p className="text-sm font-medium text-text-primary">{s.existing_ads.toLocaleString()}</p>
          <span className="text-xs text-success-600">↑ {s.existing_ads_trend}% · {s.existing_ads_pct}%</span>
        </td>

        {/* Removed Ads — hidden on md, shown lg+ */}
        <td className="hidden px-4 py-4 lg:table-cell">
          <p className="text-sm font-medium text-text-primary">{s.removed_ads.toLocaleString()}</p>
          <span className="text-xs text-danger-600">{s.removed_ads_pct}%</span>
        </td>

        {/* Avg Duration */}
        <td className="px-4 py-4">
          <p className="text-sm font-medium text-text-primary">{s.avg_duration}</p>
          <p className="text-xs text-text-tertiary">vs prev: {s.avg_duration_prev}</p>
        </td>

        {/* Running 7+ Days */}
        <td className="px-4 py-4">
          <p className="text-sm font-medium text-text-primary">{s.running_7_plus.toLocaleString()}</p>
          <p className="text-xs text-text-tertiary">({s.running_7_plus_pct}% of existing)</p>
        </td>

        {/* Winning Ads */}
        <td className="px-4 py-4">
          <p className="text-sm font-medium text-text-primary">{s.winning_ads.toLocaleString()}</p>
          <p className="text-xs text-text-tertiary">({s.winning_ads_pct}% of existing)</p>
        </td>

        {/* Variants — hidden on md */}
        <td className="hidden px-4 py-4 lg:table-cell">
          <p className="text-sm font-medium text-text-primary">{s.variants}</p>
        </td>

        {/* Last Activity */}
        <td className="px-4 py-4">
          <p className="whitespace-nowrap text-xs font-medium text-text-primary">{date}</p>
          <p className="text-xs text-text-tertiary">{time}</p>
        </td>

        {/* Actions */}
        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <Link
              to={`/competitors/${competitor.id}`}
              className="rounded-md p-1 text-text-tertiary hover:bg-gray-100 hover:text-text-primary"
            >
              <Eye size={15} />
            </Link>
            <Link
              to={`/competitors/${competitor.id}#analytics`}
              className="rounded-md p-1 text-text-tertiary hover:bg-gray-100 hover:text-text-primary"
            >
              <BarChart2 size={15} />
            </Link>
            <ActionsMenu competitor={competitor} />
            {/* Expand toggle — only meaningful below lg */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(competitor.id) }}
              className="rounded-md p-1 text-text-tertiary hover:bg-gray-100 hover:text-text-primary lg:hidden"
            >
              <ChevronDown
                size={15}
                className={cn('transition-transform', expanded && 'rotate-180')}
              />
            </button>
          </div>
        </td>
      </tr>

      {/* Expandable sub-row (visible only on md, hidden on lg+) */}
      {expanded && (
        <tr className="border-b border-gray-50 bg-gray-50/60 lg:hidden">
          <td colSpan={12} className="px-6 py-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              <div>
                <p className="text-xs text-text-tertiary">Removed Ads</p>
                <p className="text-sm font-medium text-text-primary">{s.removed_ads.toLocaleString()}</p>
                <span className="text-xs text-danger-600">{s.removed_ads_pct}%</span>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Variants</p>
                <p className="text-sm font-medium text-text-primary">{s.variants}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Mobile card ────────────────────────────────────────────────────────────────
function MobileCard({ competitor }) {
  const s = competitor.stats
  const { date, time } = fmtDate(s.last_activity)
  return (
    <Link
      to={`/competitors/${competitor.id}`}
      className="block rounded-card border border-border-default bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-border-default bg-gray-50 text-sm font-bold text-text-tertiary">
          {competitor.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-text-primary">{competitor.name}</p>
              <p className="text-xs text-text-secondary">{competitor.domain}</p>
            </div>
            <Badge color={TIER_COLOR[competitor.priority_tier] ?? 'gray'}>
              {competitor.priority_tier}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {competitor.niches.map((n) => (
              <span key={n} className="rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] text-text-secondary ring-1 ring-gray-200">
                {n}
              </span>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-gray-50 pt-2.5">
            <div>
              <p className="text-[10px] text-text-tertiary">Total Ads</p>
              <p className="text-sm font-semibold text-text-primary">{s.total_ads.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-tertiary">Existing</p>
              <p className="text-sm font-semibold text-text-primary">{s.existing_ads.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-tertiary">Winning</p>
              <p className="text-sm font-semibold text-text-primary">{s.winning_ads.toLocaleString()}</p>
            </div>
          </div>

          <p className="mt-2 text-[10px] text-text-tertiary">Last activity: {date} · {time}</p>
        </div>
      </div>
    </Link>
  )
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function Pagination({ page, perPage, total, onPage, onPerPage }) {
  const totalPages = Math.ceil(total / perPage)
  const start = (page - 1) * perPage + 1
  const end   = Math.min(page * perPage, total)

  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1
    if (page <= 3) return i + 1
    if (page >= totalPages - 2) return totalPages - 4 + i
    return page - 2 + i
  })

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default px-5 py-3">
      <p className="text-xs text-text-secondary">
        Showing <span className="font-medium text-text-primary">{start}</span> to{' '}
        <span className="font-medium text-text-primary">{end}</span> of{' '}
        <span className="font-medium text-text-primary">{total}</span> competitors
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-white text-text-secondary disabled:opacity-40 hover:bg-gray-50"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg text-sm',
              p === page
                ? 'bg-primary-600 font-medium text-white'
                : 'border border-border-default bg-white text-text-primary hover:bg-gray-50'
            )}
          >
            {p}
          </button>
        ))}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-white text-text-secondary disabled:opacity-40 hover:bg-gray-50"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">Per page</span>
        <select
          value={perPage}
          onChange={(e) => onPerPage(Number(e.target.value))}
          className="h-8 rounded-btn border border-border-default bg-white px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {[7, 10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>
  )
}

// ── Column headers ─────────────────────────────────────────────────────────────
const COLUMNS = [
  { label: 'Competitor',         cls: '' },
  { label: 'Niche',              cls: '' },
  { label: 'Priority Tier',      cls: '' },
  { label: 'Total Ads',          cls: '' },
  { label: 'Existing Ads',       cls: '' },
  { label: 'Removed Ads',        cls: 'hidden lg:table-cell' },
  { label: 'Avg Duration',       cls: '' },
  { label: 'Running 7+ Days',    cls: '' },
  { label: 'Winning Ads',        cls: '' },
  { label: 'Variants',           cls: 'hidden lg:table-cell' },
  { label: 'Last Activity',      cls: '' },
  { label: '',                   cls: '' },
]

// ── Main export ────────────────────────────────────────────────────────────────
export default function CompetitorsTable({ competitors, isLoading, page, perPage, total, onPage, onPerPage }) {
  const [expandedId, setExpandedId] = useState(null)
  const toggle = (id) => setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="rounded-card border border-border-default bg-white shadow-card">
      {/* Loading */}
      {isLoading && (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {COLUMNS.map((c, i) => (
                    <th key={i} className={cn('px-4 py-3 text-left text-xs font-medium text-text-secondary', c.cls)}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 p-4 md:hidden">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </>
      )}

      {/* Empty */}
      {!isLoading && (!competitors || competitors.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-semibold text-text-primary">No competitors found</p>
          <p className="mt-1 text-xs text-text-secondary">Try adjusting your filters</p>
        </div>
      )}

      {/* Data */}
      {!isLoading && competitors?.length > 0 && (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {COLUMNS.map((c, i) => (
                    <th
                      key={i}
                      className={cn(
                        'whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-text-secondary',
                        i === COLUMNS.length - 1 && 'text-right',
                        c.cls
                      )}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {competitors.map((c) => (
                  <TableRow
                    key={c.id}
                    competitor={c}
                    expanded={expandedId === c.id}
                    onToggleExpand={toggle}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-4 md:hidden">
            {competitors.map((c) => <MobileCard key={c.id} competitor={c} />)}
          </div>

          {/* Pagination */}
          <Pagination
            page={page}
            perPage={perPage}
            total={total}
            onPage={onPage}
            onPerPage={onPerPage}
          />
        </>
      )}
    </div>
  )
}
