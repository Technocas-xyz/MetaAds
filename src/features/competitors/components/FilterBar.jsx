import { SlidersHorizontal } from 'lucide-react'
import DateRangePicker from '../../../components/ui/DateRangePicker'
import Button from '../../../components/ui/Button'
import { cn } from '../../../lib/utils'

const NICHES = [
  'Custom Printing', 'DTF Transfers', 'Print on Demand',
  'Apparel', 'Fashion', 'Commercial Printing',
]

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
          'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748B\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")] bg-[right_0.5rem_center] bg-no-repeat'
        )}
      >
        {children}
      </select>
    </div>
  )
}

export default function FilterBar({ filters, onChange, onClear }) {
  const set = (key) => (val) => onChange({ ...filters, [key]: val })
  const hasActive = Object.values(filters).some(
    (v) => v !== '' && v !== null && v !== undefined
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
          <option key={n} value={n}>{n}</option>
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
