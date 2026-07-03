import { Link, useNavigate } from 'react-router-dom'
import { Eye, Brain, MoreHorizontal, Play, Plus, ArrowRight } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import HookTypeBadge from '../../../components/ui/HookTypeBadge'
import ConfidenceBadge from '../../../components/ui/ConfidenceBadge'
import { cn } from '../../../lib/utils'

// Mock tier from competitor id parity
const getTier = (id) => (parseInt(id ?? '1') % 2 === 0 ? 2 : 1)

function formatCaptured(iso) {
  if (!iso) return { date: '—', time: '' }
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }
}

// ── Skeletons ──────────────────────────────────────────────────────────────────
function RowSkeleton() {
  return (
    <tr className="border-b border-gray-50">
      {[48, 128, 88, 72, 72, 72, 88, 56].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="h-3.5 animate-pulse rounded bg-gray-200"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  )
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border-default bg-white p-4">
      <div className="flex gap-3">
        <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-gray-200" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="h-3 w-32 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-200" />
          <div className="mt-2 flex gap-2">
            <div className="h-5 w-16 rounded-full bg-gray-200" />
            <div className="h-5 w-14 rounded-full bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect x="5" y="7" width="30" height="22" rx="3" stroke="#A5B4FC" strokeWidth="2" />
          <path d="M12 15h16M12 21h9" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" />
          <circle cx="30" cy="30" r="7" fill="#EEF2FF" stroke="#6366F1" strokeWidth="1.5" />
          <path d="M28 30h4M30 28v4" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-semibold text-text-primary">No ads captured yet</h3>
      <p className="mt-1 max-w-xs text-sm text-text-secondary">
        Start tracking competitor ads to unlock creative intelligence.
      </p>
      <Link
        to="/ads/new"
        className={cn(
          'mt-5 inline-flex items-center gap-1.5 rounded-btn',
          'bg-primary-600 px-4 py-2 text-sm font-medium text-white',
          'transition-colors hover:bg-primary-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
        )}
      >
        <Plus size={14} />
        Add your first ad
      </Link>
    </div>
  )
}

// ── Actions dropdown ───────────────────────────────────────────────────────────
function ActionsMenu({ ad, onAnalyze }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-gray-100 hover:text-text-primary focus-visible:outline-none">
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[140px] rounded-card border border-border-default bg-white p-1.5 shadow-lg"
        >
          <DropdownMenu.Item asChild>
            <Link
              to={`/ads/${ad.id}`}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary outline-none hover:bg-gray-50"
            >
              <Eye size={14} className="text-text-secondary" /> View details
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => onAnalyze?.(ad.id)}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary outline-none hover:bg-gray-50"
          >
            <Brain size={14} className="text-text-secondary" /> Re-analyze
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ── Desktop table row ──────────────────────────────────────────────────────────
function TableRow({ ad, onAnalyze }) {
  const navigate = useNavigate()
  const tier = getTier(ad.competitor?.id)
  const { date, time } = formatCaptured(ad.created_at)

  return (
    <tr
      onClick={() => navigate(`/ads/${ad.id}`)}
      className="cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/60"
    >
      {/* Preview */}
      <td
        className="px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
          {ad.media_url ? (
            <img
              src={ad.media_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200" />
          )}
          {ad.platform === 'TikTok' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play size={14} fill="white" className="text-white" />
            </div>
          )}
        </div>
      </td>

      {/* Competitor */}
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-text-primary">
          {ad.competitor?.name ?? '—'}
        </p>
        <span
          className={cn(
            'mt-0.5 inline-block rounded-full px-1.5 text-[10px] font-medium',
            tier === 1
              ? 'bg-primary-50 text-primary-700'
              : 'bg-gray-100 text-text-secondary'
          )}
        >
          Tier {tier}
        </span>
      </td>

      {/* Hook Type */}
      <td className="px-4 py-3">
        <HookTypeBadge type={ad.hook_type} />
      </td>

      {/* Angle */}
      <td className="px-4 py-3 text-sm text-text-secondary">
        {ad.angle ?? '—'}
      </td>

      {/* Offer */}
      <td className="px-4 py-3 text-sm text-text-secondary">
        {ad.offer_type ?? '—'}
      </td>

      {/* Confidence */}
      <td className="px-4 py-3">
        <ConfidenceBadge score={ad.confidence_score} />
      </td>

      {/* Captured At */}
      <td className="px-4 py-3">
        <p className="text-xs font-medium text-text-primary">{date}</p>
        <p className="text-xs text-text-secondary">{time}</p>
      </td>

      {/* Actions */}
      <td
        className="px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/ads/${ad.id}`}
            className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-gray-100 hover:text-text-primary"
          >
            <Eye size={15} />
          </Link>
          <button
            onClick={() => onAnalyze?.(ad.id)}
            className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-gray-100 hover:text-text-primary"
          >
            <Brain size={15} />
          </button>
          <ActionsMenu ad={ad} onAnalyze={onAnalyze} />
        </div>
      </td>
    </tr>
  )
}

// ── Mobile card ────────────────────────────────────────────────────────────────
function MobileCard({ ad }) {
  const tier = getTier(ad.competitor?.id)
  const { date, time } = formatCaptured(ad.created_at)

  return (
    <Link
      to={`/ads/${ad.id}`}
      className="block rounded-card border border-border-default bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
          {ad.media_url ? (
            <img src={ad.media_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200" />
          )}
          {ad.platform === 'TikTok' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play size={12} fill="white" className="text-white" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-text-primary">
                {ad.competitor?.name ?? '—'}
              </p>
              <span
                className={cn(
                  'mt-0.5 inline-block rounded-full px-1.5 text-[10px] font-medium',
                  tier === 1
                    ? 'bg-primary-50 text-primary-700'
                    : 'bg-gray-100 text-text-secondary'
                )}
              >
                Tier {tier}
              </span>
            </div>
            <ConfidenceBadge score={ad.confidence_score} />
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <HookTypeBadge type={ad.hook_type} />
            {ad.angle && (
              <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs text-text-secondary ring-1 ring-gray-200">
                {ad.angle}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-text-tertiary">
              {date} · {time}
            </p>
            {ad.offer_type && (
              <p className="text-xs text-text-tertiary">{ad.offer_type}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Column headers ─────────────────────────────────────────────────────────────
const COLUMNS = [
  { label: 'Preview' },
  { label: 'Competitor' },
  { label: 'Hook Type' },
  { label: 'Angle' },
  { label: 'Offer' },
  { label: 'Confidence' },
  { label: 'Captured At' },
  { label: 'Actions', align: 'right' },
]

// ── Main export ────────────────────────────────────────────────────────────────
export default function RecentAdsTable({ ads, isLoading, onAnalyze }) {
  return (
    <div className="rounded-card border border-border-default bg-white shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
        <h3 className="text-sm font-semibold text-text-primary">Recent Ads</h3>
        <Link
          to="/ads"
          className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {COLUMNS.map((c) => (
                    <th
                      key={c.label}
                      className={cn(
                        'px-4 py-3 text-xs font-medium text-text-secondary',
                        c.align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <RowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 p-4 md:hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </>
      )}

      {/* Empty */}
      {!isLoading && (!ads || ads.length === 0) && <EmptyState />}

      {/* Data */}
      {!isLoading && ads?.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {COLUMNS.map((c) => (
                    <th
                      key={c.label}
                      className={cn(
                        'whitespace-nowrap px-4 py-3 text-xs font-medium text-text-secondary',
                        c.align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <TableRow key={ad.id} ad={ad} onAnalyze={onAnalyze} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="space-y-3 p-4 md:hidden">
            {ads.map((ad) => (
              <MobileCard key={ad.id} ad={ad} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

