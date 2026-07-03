import { useState } from 'react'
import {
  Eye, Download, MoreHorizontal, Play,
  ChevronLeft, ChevronRight, ChevronDown, Brain,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import HookTypeBadge from '../../../components/ui/HookTypeBadge'
import ConfidenceBadge from '../../../components/ui/ConfidenceBadge'
import Badge from '../../../components/ui/Badge'
import { cn } from '../../../lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PLATFORM_DOT = {
  Facebook:  'bg-blue-500',
  Instagram: 'bg-pink-500',
  TikTok:    'bg-black',
  YouTube:   'bg-red-500',
}

const TIER_COLOR = { 1: 'red', 2: 'amber', 3: 'slate' }

// ── Skeletons ──────────────────────────────────────────────────────────────────
function RowSkeleton() {
  return (
    <tr className="border-b border-gray-50">
      {[32, 80, 140, 160, 90, 80, 72, 60, 60, 72, 80, 40].map((w, i) => (
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
        <div className="h-16 w-12 flex-shrink-0 rounded-md bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-40 rounded bg-gray-200" />
          <div className="h-3 w-28 rounded bg-gray-200" />
          <div className="flex gap-2 pt-1">
            <div className="h-5 w-16 rounded-full bg-gray-200" />
            <div className="h-5 w-12 rounded-full bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Actions dropdown ───────────────────────────────────────────────────────────
function ActionsMenu({ ad, onPreview }) {
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
          className="z-50 min-w-[172px] rounded-card border border-border-default bg-white p-1.5 shadow-lg"
        >
          <DropdownMenu.Item
            onSelect={() => onPreview(ad)}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary outline-none hover:bg-gray-50"
          >
            <Eye size={14} className="text-text-secondary" /> Preview
          </DropdownMenu.Item>
          {!ad.is_video && (
            <DropdownMenu.Item
              onSelect={() => window.open(ad.media_url, '_blank')}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary outline-none hover:bg-gray-50"
            >
              <Download size={14} className="text-text-secondary" /> Download Image
            </DropdownMenu.Item>
          )}
          {ad.is_video && (
            <DropdownMenu.Item
              onSelect={() => window.open(ad.media_url, '_blank')}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary outline-none hover:bg-gray-50"
            >
              <Download size={14} className="text-text-secondary" /> Download Video
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            onSelect={() => window.open(ad.media_url, '_blank')}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary outline-none hover:bg-gray-50"
          >
            <Download size={14} className="text-text-secondary" /> Download All
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ── Thumbnail ──────────────────────────────────────────────────────────────────
function Thumbnail({ ad, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-md border border-border-default bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <img
        src={ad.media_url}
        alt={ad.headline}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      {ad.is_video && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Play size={14} className="fill-white text-white" />
        </div>
      )}
    </button>
  )
}

// ── Desktop table row ──────────────────────────────────────────────────────────
function TableRow({ ad, selected, onSelect, onPreview, expandedId, onToggleExpand }) {
  const expanded = expandedId === ad.id

  return (
    <>
      <tr
        className={cn(
          'border-b border-gray-50 transition-colors last:border-0',
          selected ? 'bg-primary-50/40' : 'hover:bg-gray-50/60'
        )}
      >
        {/* Checkbox */}
        <td className="w-10 px-4 py-4" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(ad.id)}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </td>

        {/* Preview thumbnail */}
        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
          <Thumbnail ad={ad} onClick={() => onPreview(ad)} />
        </td>

        {/* Competitor */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            <span
              className={cn('h-2 w-2 flex-shrink-0 rounded-full', PLATFORM_DOT[ad.platform] ?? 'bg-gray-400')}
              title={ad.platform}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{ad.competitor.name}</p>
              <div className="mt-0.5 flex items-center gap-1">
                <Badge color={TIER_COLOR[ad.competitor.tier] ?? 'gray'} className="text-[10px]">
                  T{ad.competitor.tier}
                </Badge>
                <span className="text-[10px] text-text-tertiary">{ad.competitor.region}</span>
              </div>
            </div>
          </div>
        </td>

        {/* Headline / Copy */}
        <td className="max-w-[220px] px-4 py-4">
          <p className="text-sm font-medium leading-snug text-text-primary line-clamp-1">{ad.headline}</p>
          <p className="mt-0.5 text-xs leading-snug text-text-secondary line-clamp-2">{ad.primary_text}</p>
        </td>

        {/* Hook Type */}
        <td className="px-4 py-4">
          <HookTypeBadge type={ad.hook_type} />
        </td>

        {/* Angle */}
        <td className="px-4 py-4">
          <p className="text-sm text-text-primary">{ad.angle}</p>
          {ad.angle_detail && (
            <p className="text-xs text-text-tertiary">{ad.angle_detail}</p>
          )}
        </td>

        {/* Offer */}
        <td className="px-4 py-4">
          {ad.offer_type
            ? <Badge color="indigo">{ad.offer_type}</Badge>
            : <span className="text-sm text-text-tertiary">—</span>
          }
        </td>

        {/* Confidence */}
        <td className="px-4 py-4">
          <ConfidenceBadge score={ad.confidence_score} />
        </td>

        {/* Variants — hidden on md */}
        <td className="hidden px-4 py-4 lg:table-cell">
          <span className="text-sm text-text-primary">{ad.variants}</span>
        </td>

        {/* Running Since — hidden on md */}
        <td className="hidden px-4 py-4 lg:table-cell">
          <p className="text-sm font-medium text-text-primary">{ad.running_since_days}d</p>
          <p className="text-xs text-text-tertiary">{ad.running_since_date}</p>
        </td>

        {/* Captured At */}
        <td className="px-4 py-4">
          <p className="whitespace-nowrap text-xs text-text-primary">{fmtDate(ad.captured_at)}</p>
        </td>

        {/* Actions */}
        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onPreview(ad)}
              className="rounded-md p-1 text-text-tertiary hover:bg-gray-100 hover:text-text-primary"
              title="Preview"
            >
              <Eye size={15} />
            </button>
            <ActionsMenu ad={ad} onPreview={onPreview} />
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(ad.id) }}
              className="rounded-md p-1 text-text-tertiary hover:bg-gray-100 hover:text-text-primary lg:hidden"
            >
              <ChevronDown size={15} className={cn('transition-transform', expanded && 'rotate-180')} />
            </button>
          </div>
        </td>
      </tr>

      {/* Expandable sub-row for hidden columns on tablet */}
      {expanded && (
        <tr className="border-b border-gray-50 bg-gray-50/60 lg:hidden">
          <td colSpan={11} className="px-6 py-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              <div>
                <p className="text-xs text-text-tertiary">Variants</p>
                <p className="text-sm font-medium text-text-primary">{ad.variants}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Running Since</p>
                <p className="text-sm font-medium text-text-primary">{ad.running_since_days}d</p>
                <p className="text-xs text-text-tertiary">{ad.running_since_date}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Platform</p>
                <p className="text-sm font-medium text-text-primary">{ad.platform}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Mobile card ────────────────────────────────────────────────────────────────
function MobileCard({ ad, selected, onSelect, onPreview }) {
  return (
    <div
      className={cn(
        'rounded-card border bg-white p-4 shadow-card transition-shadow',
        selected ? 'border-primary-300 bg-primary-50/30' : 'border-border-default hover:shadow-card-hover'
      )}
    >
      <div className="flex gap-3">
        {/* Select checkbox */}
        <div className="flex-shrink-0 pt-0.5">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(ad.id)}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </div>

        {/* Thumbnail */}
        <Thumbnail ad={ad} onClick={() => onPreview(ad)} />

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">{ad.headline}</p>
              <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">{ad.primary_text}</p>
            </div>
            <ActionsMenu ad={ad} onPreview={onPreview} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <HookTypeBadge type={ad.hook_type} />
            <ConfidenceBadge score={ad.confidence_score} />
            {ad.offer_type && <Badge color="indigo">{ad.offer_type}</Badge>}
          </div>

          <div className="mt-2 flex items-center gap-3 text-[10px] text-text-tertiary">
            <span className="flex items-center gap-1">
              <span className={cn('h-1.5 w-1.5 rounded-full', PLATFORM_DOT[ad.platform] ?? 'bg-gray-400')} />
              {ad.platform}
            </span>
            <span>{ad.competitor.name}</span>
            <span>{ad.running_since_days}d running</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function Pagination({ page, perPage, total, onPage, onPerPage }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
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
        Showing <span className="font-medium text-text-primary">{total > 0 ? start : 0}</span> to{' '}
        <span className="font-medium text-text-primary">{end}</span> of{' '}
        <span className="font-medium text-text-primary">{total}</span> ads
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
          {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>
  )
}

// ── Column headers ─────────────────────────────────────────────────────────────
const COLUMNS = [
  { label: '',               cls: 'w-10' },
  { label: 'Preview',        cls: '' },
  { label: 'Competitor',     cls: '' },
  { label: 'Headline / Copy',cls: '' },
  { label: 'Hook Type',      cls: '' },
  { label: 'Angle',          cls: '' },
  { label: 'Offer',          cls: '' },
  { label: 'Confidence',     cls: '' },
  { label: 'Variants',       cls: 'hidden lg:table-cell' },
  { label: 'Running Since',  cls: 'hidden lg:table-cell' },
  { label: 'Captured',       cls: '' },
  { label: '',               cls: '' },
]

// ── Main export ────────────────────────────────────────────────────────────────
export default function AdsTable({
  ads,
  isLoading,
  selectedIds,
  onSelectOne,
  onSelectAll,
  onClearAll,
  page,
  perPage,
  total,
  onPage,
  onPerPage,
  onPreview,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const toggle = (id) => setExpandedId((prev) => (prev === id ? null : id))

  const allSelected = ads?.length > 0 && ads.every((a) => selectedIds.has(a.id))
  const someSelected = ads?.some((a) => selectedIds.has(a.id)) && !allSelected

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
      {!isLoading && (!ads || ads.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-5">
            <Brain size={28} className="text-text-tertiary" />
          </div>
          <p className="text-sm font-semibold text-text-primary">No ads found</p>
          <p className="mt-1 text-xs text-text-secondary">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Data */}
      {!isLoading && ads?.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {/* Select-all header checkbox */}
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected }}
                      onChange={() => allSelected ? onClearAll() : onSelectAll(ads.map((a) => a.id))}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  {COLUMNS.slice(1).map((c, i) => (
                    <th
                      key={i}
                      className={cn(
                        'whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-text-secondary',
                        i === COLUMNS.length - 2 && 'text-right',
                        c.cls
                      )}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <TableRow
                    key={ad.id}
                    ad={ad}
                    selected={selectedIds.has(ad.id)}
                    onSelect={onSelectOne}
                    onPreview={onPreview}
                    expandedId={expandedId}
                    onToggleExpand={toggle}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-4 md:hidden">
            {ads.map((ad) => (
              <MobileCard
                key={ad.id}
                ad={ad}
                selected={selectedIds.has(ad.id)}
                onSelect={onSelectOne}
                onPreview={onPreview}
              />
            ))}
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
