import { SlidersHorizontal } from 'lucide-react'
import DateRangePicker from '../../../components/ui/DateRangePicker'
import Button from '../../../components/ui/Button'
import { cn } from '../../../lib/utils'
import { NICHES, WINNING_DAY_OPTIONS, DEFAULT_WINNING_DAYS } from '../../../lib/constants'

function NativeSelect({ label, value, onChange, children }) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="whitespace-nowrap text-xs font-medium text-text-secondary">
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-9 rounded-btn border border-border-default bg-white',
          'px-3 pr-8 text-sm text-text-primary shadow-sm',
          'appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500',
          'cursor-pointer hover:bg-gray-50',
        )}
      >
        {children}
      </select>
    </div>
  )
}

export default function FilterBar({ filters, onChange, onClear }) {
  const set = (key) => (val) => onChange({ ...filters, [key]: val })
  const hasActive = Object.entries(filters).some(
    ([k, v]) => v !== '' && v !== null && v !== undefined && !(k === 'winningDays' && v === DEFAULT_WINNING_DAYS)
  )

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-border-default bg-white px-4 py-3 shadow-card">
      {/* Date range */}
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-xs font-medium text-text-secondary">
          Data shown as of
        </span>
        <DateRangePicker onChange={set('dateRange')} />
      </div>

      <div className="h-4 w-px bg-border-default" aria-hidden="true" />

      {/* Status */}
      <NativeSelect value={filters.status ?? ''} onChange={set('status')}>
        <option value="">All Status</option>
        <option value="Active">Active</option>
        <option value="Paused">Paused</option>
        <option value="Inactive">Inactive</option>
      </NativeSelect>

      {/* Priority Tier */}
      <NativeSelect value={filters.priorityTier ?? ''} onChange={set('priorityTier')}>
        <option value="">All Tiers</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </NativeSelect>

      {/* Niche */}
      <NativeSelect value={filters.niche ?? ''} onChange={set('niche')}>
        <option value="">All Niches</option>
        {NICHES.map((n) => (
          <option key={n.value} value={n.value}>{n.label}</option>
        ))}
      </NativeSelect>

      {/* Winning threshold — recalculates Winning Ads count and % */}
      <NativeSelect
        label="Winning ads"
        value={filters.winningDays ?? DEFAULT_WINNING_DAYS}
        onChange={(v) => set('winningDays')(Number(v))}
      >
        {WINNING_DAY_OPTIONS.map((d) => (
          <option key={d} value={d}>Active {d}+ days</option>
        ))}
      </NativeSelect>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {hasActive && (
          <button
            onClick={onClear}
            className="text-xs font-medium text-primary-600 hover:underline focus-visible:outline-none"
          >
            Clear filters
          </button>
        )}
        <Button variant="outline" icon={SlidersHorizontal} size="sm">
          Filters
        </Button>
      </div>
    </div>
  )
}
