/**
 * Status pill for ads, campaigns, reviews, and users.
 *
 * @example
 * <StatusPill status="Active" />
 * <StatusPill status="Reviewing" size="xs" />
 */
import { cn } from '../../lib/utils'

const STATUS_MAP = {
  // Ad / campaign
  Active:    'bg-green-100   text-green-700',
  Paused:    'bg-amber-100   text-amber-700',
  Removed:   'bg-red-100     text-red-700',
  Archived:  'bg-gray-100    text-gray-600',
  Draft:     'bg-gray-100    text-gray-600',
  // Review
  Reviewing: 'bg-blue-100    text-blue-700',
  Approved:  'bg-emerald-100 text-emerald-700',
  Rejected:  'bg-red-100     text-red-700',
  Flagged:   'bg-orange-100  text-orange-700',
  // User / invite
  Pending:   'bg-amber-100   text-amber-700',
  Invited:   'bg-sky-100     text-sky-700',
  Suspended: 'bg-red-100     text-red-600',
  // AI
  Analyzing: 'bg-violet-100  text-violet-700',
  Queued:    'bg-gray-100    text-gray-600',
  Failed:    'bg-red-100     text-red-700',
}

const SIZE_MAP = {
  xs: 'px-1.5 py-0   text-[10px] rounded',
  sm: 'px-2   py-0.5 text-[11px] rounded-full',
  md: 'px-2.5 py-0.5 text-xs     rounded-full',
}

/** Dot indicator variant – omits text */
function Dot({ status }) {
  const cls = STATUS_MAP[status] ?? 'bg-gray-100 text-gray-600'
  const dotColor = cls.replace(/bg-(\S+)\s.*/, 'bg-$1').replace('-100', '-500').replace('-50', '-400')
  return <span className={cn('inline-block h-2 w-2 rounded-full', dotColor)} aria-label={status} />
}

export default function StatusPill({ status, size = 'sm', dot = false, className }) {
  if (dot) return <Dot status={status} />

  const colorCls = STATUS_MAP[status] ?? 'bg-gray-100 text-gray-600'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold',
        SIZE_MAP[size] ?? SIZE_MAP.sm,
        colorCls,
        className
      )}
    >
      {status ?? '—'}
    </span>
  )
}
