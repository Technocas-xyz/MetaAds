import { useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, RefreshCw, Users, Trash2, Edit3, Eye,
  ChevronLeft, ChevronRight, ChevronDown,
  AlertTriangle, AlertCircle, ShieldAlert,
} from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import HookTypeBadge from '../../components/ui/HookTypeBadge'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useApproveReview, useBulkApprove, useBulkRerunAI } from '../../hooks/queries/useReview'
import { cn } from '../../lib/utils'

const PAGE_SIZE_OPTIONS = [10, 25, 50]

// ── Sub-components ────────────────────────────────────────────────────────────
const PLATFORM_CFG = {
  Facebook:  { bg: '#1877F2', label: 'FB' },
  Instagram: { bg: '#E4405F', label: 'IG' },
  TikTok:    { bg: '#010101', label: 'TT' },
}

export function PlatformBadge({ platform }) {
  const cfg = PLATFORM_CFG[platform] ?? { bg: '#64748B', label: '?' }
  return (
    <span
      className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-bold text-white leading-none"
      style={{ backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

export function TierBadge({ tier }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1',
      tier === 1 ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : tier === 2 ? 'bg-slate-50 text-slate-600 ring-slate-200'
        : 'bg-gray-50 text-gray-500 ring-gray-200',
    )}>
      T{tier}
    </span>
  )
}

export function ConfidenceRing({ score }) {
  const r    = 16
  const circ = 2 * Math.PI * r
  const off  = circ - (score / 100) * circ
  const color = score >= 70 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444'
  const label = score >= 70 ? 'High'    : score >= 50 ? 'Med'     : 'Low'
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#E2E8F0" strokeWidth="3.5" />
        <circle
          cx="22" cy="22" r={r} fill="none"
          stroke={color} strokeWidth="3.5"
          strokeDasharray={circ} strokeDashoffset={off}
          strokeLinecap="round" transform="rotate(-90 22 22)"
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-[10px] font-bold text-text-primary">{score}%</span>
        <span className="mt-0.5 text-[8px] text-text-secondary">{label}</span>
      </div>
    </div>
  )
}

const INSIGHT_ROWS = [
  { key: 'hook_type',       label: 'Hook Type', badge: 'hook'     },
  { key: 'angle',           label: 'Angle',     badge: 'text'     },
  { key: 'offer_type',      label: 'Offer',     badge: 'text'     },
  { key: 'creative_format', label: 'Format',    badge: 'text'     },
  { key: 'product_line',    label: 'Product',   badge: 'text'     },
  { key: 'hook',            label: 'Hook',      badge: 'truncate' },
]

export function InsightsMiniGrid({ insights }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
      {INSIGHT_ROWS.map(({ key, label, badge }) => {
        const val = insights[key]?.value ?? '—'
        return (
          <div key={key} className="flex min-w-0 items-center gap-1.5">
            <span className="w-12 flex-shrink-0 text-[10px] text-text-tertiary">{label}</span>
            {badge === 'hook' ? (
              <HookTypeBadge type={val} />
            ) : badge === 'truncate' ? (
              <span className="max-w-[110px] truncate text-[11px] font-medium text-text-primary">{val}</span>
            ) : (
              <span className="text-[11px] font-medium text-text-primary">{val}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

const REASON_META = {
  low_confidence:  { Icon: AlertCircle,   dotCls: 'bg-danger-500',  textCls: 'text-danger-700'  },
  missing_info:    { Icon: AlertTriangle, dotCls: 'bg-warning-500', textCls: 'text-warning-700' },
  flagged_by_rule: { Icon: ShieldAlert,   dotCls: 'bg-danger-500',  textCls: 'text-danger-700'  },
}

export function ReasonCell({ reason, label, detail }) {
  const meta = REASON_META[reason] ?? REASON_META.low_confidence
  return (
    <div className="flex max-w-[200px] items-start gap-2">
      <span className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', meta.dotCls)} />
      <div>
        <p className={cn('text-xs font-semibold', meta.textCls)}>{label}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">{detail}</p>
      </div>
    </div>
  )
}

export function UserAvatar({ user }) {
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full border border-dashed border-gray-300 bg-gray-50" />
        <span className="text-xs text-text-tertiary">Unassigned</span>
      </div>
    )
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ backgroundColor: user.color }}
      >
        {user.initials}
      </div>
      <span className="max-w-[80px] truncate text-xs font-medium text-text-primary">{user.name}</span>
    </div>
  )
}

function AddedAt({ iso }) {
  const d    = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="text-xs">
      <p className="whitespace-nowrap font-medium text-text-primary">{date}</p>
      <p className="text-text-tertiary">{time}</p>
    </div>
  )
}

function ExpandableInsightsRow({ row, colSpan }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr
        className="cursor-pointer border-b border-border-default bg-gray-50/30 xl:hidden"
        onClick={() => setOpen((o) => !o)}
      >
        <td colSpan={colSpan} className="px-4 py-1.5">
          <button type="button" className="flex items-center gap-1.5 text-[11px] font-medium text-primary-600">
            <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
            AI Extracted Insights
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border-default bg-gray-50/50 xl:hidden">
          <td colSpan={colSpan} className="px-4 py-3">
            <InsightsMiniGrid insights={row.ai_insights} />
          </td>
        </tr>
      )}
    </>
  )
}

function TabBadge({ count, active }) {
  return (
    <span className={cn(
      'ml-1.5 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
      active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-text-secondary',
    )}>
      {count}
    </span>
  )
}

// ── Main exported component ───────────────────────────────────────────────────
/**
 * @param {object}   props
 * @param {array}    props.items       — pre-filtered rows to display
 * @param {boolean}  props.loading
 * @param {object}   [props.summary]   — { total, low_confidence, missing_info, flagged, assigned_to_me }
 *                                       used to populate default tab counts
 * @param {array}    [props.tabs]      — override tab config: [{ value, label, count, filter }]
 *                                       if null, uses standard review reason tabs from summary
 */
export default function ReviewQueueTable({ items = [], loading = false, summary = null, tabs: tabsProp = null }) {
  const navigate       = useNavigate()
  const bulkApprove    = useBulkApprove()
  const bulkRerun      = useBulkRerunAI()
  const headerCheckRef = useRef(null)

  // Derive tabs — custom override OR standard reason tabs from summary
  const derivedTabs = useMemo(() => {
    if (tabsProp) return tabsProp
    return [
      {
        value: 'all', label: 'All',
        count: summary?.total ?? items.length,
        filter: () => true,
      },
      {
        value: 'low_confidence', label: 'Low Confidence',
        count: summary?.low_confidence?.count ?? 0,
        filter: (r) => r.reason === 'low_confidence',
      },
      {
        value: 'missing_info', label: 'Missing Info',
        count: summary?.missing_info?.count ?? 0,
        filter: (r) => r.reason === 'missing_info',
      },
      {
        value: 'flagged', label: 'Flagged',
        count: summary?.flagged?.count ?? 0,
        filter: (r) => r.reason === 'flagged_by_rule',
      },
      {
        value: 'assigned', label: 'Assigned to Me',
        count: summary?.assigned_to_me ?? 0,
        filter: (r) => r.assigned_to?.id === '1',
      },
    ]
  }, [tabsProp, summary, items.length])

  const [activeTab,      setActiveTab]      = useState(() => derivedTabs[0]?.value ?? 'all')
  const [selected,       setSelected]       = useState(new Set())
  const [page,           setPage]           = useState(1)
  const [pageSize,       setPageSize]       = useState(10)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(false)

  const activeTabCfg = derivedTabs.find((t) => t.value === activeTab) ?? derivedTabs[0]

  const tabFiltered = useMemo(
    () => items.filter(activeTabCfg?.filter ?? (() => true)),
    [items, activeTabCfg],
  )

  const totalPages = Math.ceil(tabFiltered.length / pageSize)
  const paginated  = useMemo(
    () => tabFiltered.slice((page - 1) * pageSize, page * pageSize),
    [tabFiltered, page, pageSize],
  )

  // Selection
  const pageIds = paginated.map((r) => r.id)
  const allSel  = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someSel = pageIds.some((id) => selected.has(id))
  if (headerCheckRef.current) headerCheckRef.current.indeterminate = someSel && !allSel

  const toggleRow = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    const allSelected = pageIds.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
      return next
    })
  }, [pageIds, selected])

  const handleBulkApprove = () => {
    bulkApprove.mutate([...selected], {
      onSuccess: () => { toast.success(`${selected.size} ads approved`); setSelected(new Set()); setConfirmApprove(false) },
      onError:   () => toast.error('Bulk approve failed'),
    })
  }

  const handleBulkDelete = () => {
    toast.success(`${selected.size} item${selected.size !== 1 ? 's' : ''} removed from queue`)
    setSelected(new Set())
    setConfirmDelete(false)
  }
  const handleBulkRerun = () => {
    bulkRerun.mutate([...selected], {
      onSuccess: () => { toast.success(`AI re-run queued for ${selected.size} ads`); setSelected(new Set()) },
      onError:   () => toast.error('Re-run failed'),
    })
  }

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

  const rangeStart = tabFiltered.length === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd   = Math.min(page * pageSize, tabFiltered.length)
  const COL_COUNT  = 10

  return (
    <div className="rounded-card border border-border-default bg-white shadow-card">
      <Tabs.Root
        value={activeTab}
        onValueChange={(v) => { setActiveTab(v); setPage(1); setSelected(new Set()) }}
      >
        {/* Tab triggers */}
        <div className="border-b border-border-default px-5">
          <Tabs.List className="flex gap-0 overflow-x-auto">
            {derivedTabs.map(({ value, label, count }) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className={cn(
                  'flex items-center whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-medium transition-colors focus-visible:outline-none',
                  'border-transparent text-text-secondary hover:text-text-primary',
                  'data-[state=active]:border-primary-600 data-[state=active]:text-primary-600',
                )}
              >
                {label}
                <TabBadge count={count} active={activeTab === value} />
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border-default bg-primary-50 px-5 py-2.5">
            <span className="text-sm font-medium text-primary-700">
              {selected.size} ad{selected.size !== 1 ? 's' : ''} selected
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" size="sm" icon={CheckCircle2} onClick={() => setConfirmApprove(true)}>
                Approve All
              </Button>
              <Button variant="outline" size="sm" icon={RefreshCw} loading={bulkRerun.isPending} onClick={handleBulkRerun}>
                Re-run AI
              </Button>
              <Button variant="outline" size="sm" icon={Users}>Reassign</Button>
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Tab panels */}
        {derivedTabs.map(({ value }) => (
          <Tabs.Content key={value} value={value} className="focus-visible:outline-none">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <CheckCircle2 size={40} className="text-gray-300" />
                <p className="mt-3 text-sm font-medium text-text-secondary">Queue is empty</p>
                <p className="mt-1 text-xs text-text-tertiary">No ads match the current filter.</p>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead>
                      <tr className="border-b border-border-default bg-gray-50/50">
                        <th className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            ref={headerCheckRef}
                            checked={allSel}
                            onChange={toggleAll}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Ad Preview</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Competitor</th>
                        <th className="hidden px-4 py-3 text-left text-xs font-semibold text-text-secondary xl:table-cell">
                          AI Extracted Insights
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Issue / Reason</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary">Confidence</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Priority</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Assigned To</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Added At</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((row) => (
                        <>
                          <tr
                            key={row.id}
                            className={cn(
                              'border-b border-border-default transition-colors hover:bg-gray-50/40',
                              selected.has(row.id) && 'bg-primary-50/30',
                            )}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selected.has(row.id)}
                                onChange={() => toggleRow(row.id)}
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                            </td>

                            {/* Ad Preview */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-center gap-1.5">
                                <img
                                  src={row.ad.thumbnail}
                                  alt=""
                                  className="h-[60px] w-[60px] rounded-lg border border-border-default object-cover"
                                />
                                <PlatformBadge platform={row.ad.platform} />
                              </div>
                            </td>

                            {/* Competitor */}
                            <td className="px-4 py-3">
                              <div className="flex min-w-[130px] flex-col gap-1">
                                <span className="text-sm font-semibold leading-snug text-text-primary">
                                  {row.competitor.name}
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <TierBadge tier={row.competitor.tier} />
                                  <span className="text-[10px] text-text-tertiary">{row.competitor.region}</span>
                                </div>
                              </div>
                            </td>

                            {/* AI Insights — desktop only */}
                            <td className="hidden px-4 py-3 xl:table-cell">
                              <InsightsMiniGrid insights={row.ai_insights} />
                            </td>

                            {/* Issue / Reason */}
                            <td className="px-4 py-3">
                              <ReasonCell
                                reason={row.reason}
                                label={row.reason_label}
                                detail={row.reason_detail}
                              />
                            </td>

                            {/* Confidence ring */}
                            <td className="px-4 py-3 text-center">
                              <ConfidenceRing score={row.confidence_score} />
                            </td>

                            {/* Priority */}
                            <td className="px-4 py-3">
                              <Badge
                                color={
                                  row.priority === 'High'   ? 'red'
                                  : row.priority === 'Medium' ? 'amber'
                                  : 'slate'
                                }
                              >
                                {row.priority}
                              </Badge>
                            </td>

                            {/* Assigned To */}
                            <td className="px-4 py-3">
                              <UserAvatar user={row.assigned_to} />
                            </td>

                            {/* Added At */}
                            <td className="px-4 py-3">
                              <AddedAt iso={row.added_at} />
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/ads/${row.ad.id}`)}
                                  className="rounded-btn p-1.5 text-text-tertiary transition-colors hover:bg-gray-100 hover:text-text-primary"
                                  title="Preview"
                                >
                                  <Eye size={14} />
                                </button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={Edit3}
                                  onClick={() => navigate(`/review/${row.ad.id}`)}
                                >
                                  Review
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable AI insights sub-row for < xl */}
                          <ExpandableInsightsRow key={`exp-${row.id}`} row={row} colSpan={COL_COUNT} />
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary">
                      {tabFiltered.length === 0
                        ? 'No results'
                        : `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${tabFiltered.length.toLocaleString()}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-text-tertiary">Per page:</label>
                      <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                        className="h-7 rounded-btn border border-border-default bg-white px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage((p) => p - 1)}
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
                          onClick={() => setPage(p)}
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
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages}
                      className="rounded-btn p-1.5 text-text-secondary hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>

      {/* Bulk approve confirm */}
      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={setConfirmApprove}
        title={`Approve ${selected.size} ad${selected.size !== 1 ? 's' : ''}?`}
        description="Approved ads will be published to the library and marked as reviewed. This cannot be undone in bulk."
        confirmText="Approve All"
        variant="default"
        loading={bulkApprove.isPending}
        onConfirm={handleBulkApprove}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Remove ${selected.size} item${selected.size !== 1 ? 's' : ''} from queue?`}
        description="These items will be permanently removed from the review queue."
        confirmText="Remove"
        variant="danger"
        onConfirm={handleBulkDelete}
      />
    </div>
  )
}
