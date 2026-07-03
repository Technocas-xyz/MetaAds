import { useState, useMemo, useRef, useCallback } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import { useVirtualizer } from '@tanstack/react-virtual'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Download, Search, X, ChevronLeft, ChevronRight,
  Plus, RefreshCw, CheckCircle2, Edit3, Brain,
  Settings2, UserPlus, Trash2, Eye, Shield,
  ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import DateRangePicker from '../../components/ui/DateRangePicker'

// ── Mock data generation ──────────────────────────────────────────────────────

const ACTORS = [
  { id: 1,  name: 'Arun Kumar',     initials: 'AK', color: 'bg-primary-500' },
  { id: 2,  name: 'Sarah Mitchell', initials: 'SM', color: 'bg-violet-500'  },
  { id: 3,  name: 'James Torres',   initials: 'JT', color: 'bg-sky-500'     },
  { id: 4,  name: 'Priya Nair',     initials: 'PN', color: 'bg-pink-500'    },
  { id: 5,  name: 'System AI',      initials: 'AI', color: 'bg-emerald-500' },
]

const ACTION_TYPES = [
  'Ad Created',
  'Ad Updated',
  'AI Analyzed',
  'Review Approved',
  'Review Edited',
  'Settings Changed',
  'User Invited',
  'User Deleted',
]

const RESOURCE_TYPES = ['Ad', 'Campaign', 'Settings', 'User', 'Brief', 'Review']

const ACTION_META = {
  'Ad Created':       { icon: Plus,          color: 'bg-green-100 text-green-700'   },
  'Ad Updated':       { icon: Edit3,         color: 'bg-blue-100 text-blue-700'     },
  'AI Analyzed':      { icon: Brain,         color: 'bg-violet-100 text-violet-700' },
  'Review Approved':  { icon: CheckCircle2,  color: 'bg-emerald-100 text-emerald-700' },
  'Review Edited':    { icon: Edit3,         color: 'bg-amber-100 text-amber-700'   },
  'Settings Changed': { icon: Settings2,     color: 'bg-gray-100 text-gray-700'     },
  'User Invited':     { icon: UserPlus,      color: 'bg-sky-100 text-sky-700'       },
  'User Deleted':     { icon: Trash2,        color: 'bg-red-100 text-red-700'       },
}

const IPS = ['192.168.1.12', '10.0.0.45', '172.16.3.88', '203.45.67.89', '98.12.34.56']

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function makeDiff(action) {
  if (action === 'Ad Updated') {
    return {
      before: { status: 'draft', budget: 45.00, headline: 'Fast DTF Transfers', cta: 'Learn More' },
      after:  { status: 'active', budget: 60.00, headline: 'Same-Day DTF Transfers', cta: 'Shop Now' },
    }
  }
  if (action === 'Settings Changed') {
    return {
      before: { temperature: 0.3, maxTokens: 1000, autoApprove: false },
      after:  { temperature: 0.2, maxTokens: 1500, autoApprove: true  },
    }
  }
  if (action === 'Review Edited') {
    return {
      before: { verdict: 'rejected', notes: '' },
      after:  { verdict: 'approved', notes: 'Meets all quality standards' },
    }
  }
  return null
}

function makePayload(action, resourceType, resourceId) {
  return {
    action,
    resourceType,
    resourceId,
    timestamp: new Date().toISOString(),
    metadata:  { source: 'web_app', sessionId: `sess_${Math.random().toString(36).slice(2, 10)}` },
    diff: makeDiff(action),
  }
}

const BASE_DATE = new Date('2026-05-09T20:00:00Z')

const MOCK_LOGS = Array.from({ length: 500 }, (_, i) => {
  const actor      = randomItem(ACTORS)
  const action     = randomItem(ACTION_TYPES)
  const resType    = randomItem(RESOURCE_TYPES)
  const resId      = Math.floor(Math.random() * 9000) + 1000
  const ts         = new Date(BASE_DATE.getTime() - i * 8 * 60 * 1000)

  const DETAIL_TEMPLATES = {
    'Ad Created':       `New ad "#${resId}" uploaded and queued for analysis`,
    'Ad Updated':       `Ad "#${resId}" budget and headline updated`,
    'AI Analyzed':      `AI confidence score 87% — hook: Pain Point, angle: Speed`,
    'Review Approved':  `Manual review passed; ad approved for campaign use`,
    'Review Edited':    `Reviewer changed verdict from Rejected → Approved`,
    'Settings Changed': `AI model temperature changed from 0.3 → 0.2`,
    'User Invited':     `Invitation sent to new@agency.io with role Analyst`,
    'User Deleted':     `User account #${resId} permanently removed`,
  }

  return {
    id:           i + 1,
    timestamp:    ts.toISOString(),
    actor,
    action,
    resourceType: resType,
    resourceId:   resId,
    details:      DETAIL_TEMPLATES[action],
    ip:           randomItem(IPS),
    payload:      makePayload(action, resType, resId),
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ── JSON Diff Viewer ──────────────────────────────────────────────────────────

function JsonLine({ text, type }) {
  const bg = type === 'add'    ? 'bg-green-50 text-green-800'
           : type === 'remove' ? 'bg-red-50 text-red-800'
           : 'text-text-secondary'
  const prefix = type === 'add' ? '+' : type === 'remove' ? '−' : ' '
  return (
    <div className={cn('flex gap-2 px-3 py-0.5 font-mono text-[11px] leading-5', bg)}>
      <span className="w-3 shrink-0 select-none opacity-60">{prefix}</span>
      <span className="break-all">{text}</span>
    </div>
  )
}

function JsonDiffViewer({ before, after }) {
  const beforeLines = JSON.stringify(before, null, 2).split('\n')
  const afterLines  = JSON.stringify(after,  null, 2).split('\n')

  return (
    <div className="overflow-hidden rounded-lg border border-border-default">
      <div className="grid grid-cols-2 divide-x divide-border-default">
        <div>
          <div className="border-b border-border-default bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700">
            Before
          </div>
          <div className="overflow-auto bg-white">
            {beforeLines.map((line, i) => <JsonLine key={i} text={line} type="remove" />)}
          </div>
        </div>
        <div>
          <div className="border-b border-border-default bg-green-50 px-3 py-1.5 text-[11px] font-semibold text-green-700">
            After
          </div>
          <div className="overflow-auto bg-white">
            {afterLines.map((line, i) => <JsonLine key={i} text={line} type="add" />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function JsonViewer({ data }) {
  const lines = JSON.stringify(data, null, 2).split('\n')
  return (
    <div className="overflow-auto rounded-lg border border-border-default bg-gray-50">
      {lines.map((line, i) => <JsonLine key={i} text={line} type="neutral" />)}
    </div>
  )
}

// ── Activity Detail Drawer ────────────────────────────────────────────────────

function ActivityDetailDrawer({ log, open, onClose }) {
  const [section, setSection] = useState('payload')
  if (!log) return null

  const meta   = ACTION_META[log.action] ?? { icon: AlertCircle, color: 'bg-gray-100 text-gray-600' }
  const ActionIcon = meta.icon

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right',
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border-default px-6 py-4">
            <div className="flex items-center gap-3">
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.color)}>
                <ActionIcon size={16} />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-text-primary">{log.action}</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-text-tertiary">
                  {fmtDate(log.timestamp)} at {fmtTime(log.timestamp)}
                </Dialog.Description>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-text-tertiary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-2 gap-4 border-b border-border-default px-6 py-4 text-sm">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">Actor</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white', log.actor.color)}>
                  {log.actor.initials}
                </span>
                <span className="font-medium text-text-primary">{log.actor.name}</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">Resource</p>
              <p className="mt-1 font-medium text-text-primary">
                {log.resourceType} #{log.resourceId}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">IP Address</p>
              <p className="mt-1 font-mono text-text-primary">{log.ip}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">Event ID</p>
              <p className="mt-1 font-mono text-xs text-text-secondary">#{String(log.id).padStart(6, '0')}</p>
            </div>
          </div>

          {/* Details */}
          <div className="border-b border-border-default px-6 py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">Details</p>
            <p className="mt-1 text-sm text-text-primary">{log.details}</p>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 border-b border-border-default px-6 pt-2">
            {[
              { id: 'payload', label: 'Full Payload' },
              ...(log.payload?.diff ? [{ id: 'diff', label: 'Diff View' }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSection(tab.id)}
                className={cn(
                  'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  section === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable JSON area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {section === 'diff' && log.payload?.diff ? (
              <JsonDiffViewer before={log.payload.diff.before} after={log.payload.diff.after} />
            ) : (
              <JsonViewer data={log.payload} />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border-default px-6 py-3">
            <span className="text-xs text-text-tertiary">Event #{String(log.id).padStart(6, '0')}</span>
            <Button variant="outline" size="sm" icon={Download}>Export Event</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ actor }) {
  return (
    <span className={cn('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white', actor.color)}>
      {actor.initials}
    </span>
  )
}

// ── Table row ─────────────────────────────────────────────────────────────────

function LogRow({ log, style, onClick }) {
  const meta       = ACTION_META[log.action] ?? { icon: AlertCircle, color: 'bg-gray-100 text-gray-600' }
  const ActionIcon = meta.icon

  return (
    <div
      style={style}
      onClick={() => onClick(log)}
      className="absolute left-0 right-0 flex cursor-pointer items-center gap-0 border-b border-border-default bg-white hover:bg-gray-50"
    >
      {/* Timestamp */}
      <div className="w-[140px] shrink-0 px-4 py-3">
        <p className="text-[11px] font-medium text-text-primary">{fmtDate(log.timestamp)}</p>
        <p className="text-[11px] text-text-tertiary">{fmtTime(log.timestamp)}</p>
      </div>

      {/* User */}
      <div className="w-[160px] shrink-0 px-3 py-3">
        <div className="flex items-center gap-2">
          <Avatar actor={log.actor} />
          <span className="truncate text-xs font-medium text-text-primary">{log.actor.name}</span>
        </div>
      </div>

      {/* Action */}
      <div className="w-[160px] shrink-0 px-3 py-3">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold', meta.color)}>
          <ActionIcon size={10} />
          {log.action}
        </span>
      </div>

      {/* Resource */}
      <div className="w-[120px] shrink-0 px-3 py-3">
        <span className="text-xs font-medium text-primary-600 hover:underline">
          {log.resourceType} #{log.resourceId}
        </span>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1 px-3 py-3">
        <p className="truncate text-xs text-text-secondary">{log.details}</p>
      </div>

      {/* IP */}
      <div className="w-[130px] shrink-0 px-3 py-3">
        <span className="font-mono text-[11px] text-text-tertiary">{log.ip}</span>
      </div>

      {/* View */}
      <div className="w-[60px] shrink-0 px-3 py-3 text-right">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(log) }}
          className="rounded-md px-2 py-1 text-[11px] font-medium text-primary-600 hover:bg-primary-50"
        >
          View
        </button>
      </div>
    </div>
  )
}

// ── Virtualised log list ──────────────────────────────────────────────────────

const ROW_HEIGHT = 58

function VirtualLogList({ logs, onRowClick }) {
  const parentRef = useRef(null)

  const virtualizer = useVirtualizer({
    count:           logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize:    () => ROW_HEIGHT,
    overscan:        10,
  })

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ height: Math.min(logs.length * ROW_HEIGHT, ROW_HEIGHT * 12) }}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => (
          <LogRow
            key={vItem.key}
            log={logs[vItem.index]}
            style={{ top: vItem.start, height: vItem.size }}
            onClick={onRowClick}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [25, 50, 100]

export default function ActivityLogsPage() {
  const [search,       setSearch]       = useState('')
  const debouncedSearch                 = useDebounce(search, 300)
  const [actionFilter, setActionFilter] = useState('')
  const [resFilter,    setResFilter]    = useState('')
  const [userFilter,   setUserFilter]   = useState('')
  const [page,         setPage]         = useState(1)
  const [perPage,      setPerPage]      = useState(25)
  const [selectedLog,  setSelectedLog]  = useState(null)
  const [drawerOpen,   setDrawerOpen]   = useState(false)

  const openDrawer = useCallback((log) => {
    setSelectedLog(log)
    setDrawerOpen(true)
  }, [])

  // Client-side filter
  const filtered = useMemo(() => {
    return MOCK_LOGS.filter((l) => {
      const q = debouncedSearch.toLowerCase()
      const matchSearch = !q ||
        l.actor.name.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        String(l.resourceId).includes(q)
      const matchAction = !actionFilter || l.action === actionFilter
      const matchRes    = !resFilter    || l.resourceType === resFilter
      const matchUser   = !userFilter   || String(l.actor.id) === userFilter
      return matchSearch && matchAction && matchRes && matchUser
    })
  }, [debouncedSearch, actionFilter, resFilter, userFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage   = Math.min(page, totalPages)
  const pageSlice  = filtered.slice((safePage - 1) * perPage, safePage * perPage)

  const handleFilterChange = () => setPage(1)

  const clearAll = () => {
    setSearch('')
    setActionFilter('')
    setResFilter('')
    setUserFilter('')
    setPage(1)
  }

  const hasFilters = debouncedSearch || actionFilter || resFilter || userFilter

  const exportCSV = () => {
    const header = 'Timestamp,User,Action,Resource,Details,IP\n'
    const rows   = filtered.map((l) =>
      `"${l.timestamp}","${l.actor.name}","${l.action}","${l.resourceType} #${l.resourceId}","${l.details}","${l.ip}"`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'activity-logs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <PageHeader
          title="Activity Logs"
          subtitle="Track all system actions, AI runs, reviews, and changes"
          rightSlot={
            <div className="flex items-center gap-2">
              <DateRangePicker />
              <Button variant="outline" icon={Download} onClick={exportCSV}>
                Export
              </Button>
            </div>
          }
        />

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="search"
              placeholder="Search user, action, resource…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); handleFilterChange() }}
              className="h-9 w-full rounded-btn border border-border-default bg-white pl-8 pr-3 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* User filter */}
          <select
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); handleFilterChange() }}
            className="h-9 rounded-btn border border-border-default bg-white px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Users</option>
            {ACTORS.map((a) => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
          </select>

          {/* Action type filter */}
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); handleFilterChange() }}
            className="h-9 rounded-btn border border-border-default bg-white px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Action Types</option>
            {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Resource type filter */}
          <select
            value={resFilter}
            onChange={(e) => { setResFilter(e.target.value); handleFilterChange() }}
            className="h-9 rounded-btn border border-border-default bg-white px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Resources</option>
            {RESOURCE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
            >
              <X size={13} /> Clear
            </button>
          )}

          <span className="ml-auto whitespace-nowrap text-xs text-text-tertiary">
            {filtered.length.toLocaleString()} events
          </span>
        </div>

        {/* Log table */}
        <div className="overflow-hidden rounded-card border border-border-default bg-white shadow-card">
          {/* Column headers */}
          <div className="flex items-center border-b border-border-default bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            <div className="w-[140px] shrink-0 px-4 py-3">Timestamp</div>
            <div className="w-[160px] shrink-0 px-3 py-3">User</div>
            <div className="w-[160px] shrink-0 px-3 py-3">Action</div>
            <div className="w-[120px] shrink-0 px-3 py-3">Resource</div>
            <div className="min-w-0 flex-1 px-3 py-3">Details</div>
            <div className="w-[130px] shrink-0 px-3 py-3">IP Address</div>
            <div className="w-[60px] shrink-0 px-3 py-3" />
          </div>

          {/* Virtualised rows */}
          {pageSlice.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-tertiary">
              <Shield size={32} className="opacity-30" />
              <p className="text-sm">No events match your filters.</p>
            </div>
          ) : (
            <VirtualLogList logs={pageSlice} onRowClick={openDrawer} />
          )}

          {/* Pagination footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default px-5 py-3">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>Rows per page:</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
                className="h-7 rounded border border-border-default bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <span>
                {((safePage - 1) * perPage) + 1}–{Math.min(safePage * perPage, filtered.length)} of {filtered.length.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-7 w-7 items-center justify-center rounded border border-border-default bg-white text-text-secondary hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page number pills */}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const mid  = Math.min(Math.max(safePage, 4), totalPages - 3)
                const pg   = totalPages <= 7 ? i + 1
                           : i === 0 ? 1
                           : i === 6 ? totalPages
                           : mid - 3 + i
                const dots = totalPages > 7 && ((i === 1 && mid > 4) || (i === 5 && mid < totalPages - 3))
                if (dots) return (
                  <span key={i} className="flex h-7 w-7 items-center justify-center text-xs text-text-tertiary">…</span>
                )
                return (
                  <button
                    key={i}
                    onClick={() => setPage(pg)}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded border text-xs font-medium',
                      pg === safePage
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-border-default bg-white text-text-secondary hover:bg-gray-50'
                    )}
                  >
                    {pg}
                  </button>
                )
              })}

              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-7 w-7 items-center justify-center rounded border border-border-default bg-white text-text-secondary hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      <ActivityDetailDrawer
        log={selectedLog}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
