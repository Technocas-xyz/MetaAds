import { Search, SlidersHorizontal, X } from 'lucide-react'
import DateRangePicker from '../../../components/ui/DateRangePicker'
import Button from '../../../components/ui/Button'
import { HOOK_TYPES, ANGLES, OFFER_TYPES } from '../../../lib/constants'
import { cn } from '../../../lib/utils'

const CONFIDENCE = ['High', 'Medium', 'Low']
const ANALYSIS_STATUS = [
  { value: 'analyzed', label: 'Analyzed' },
  { value: 'pending',  label: 'Pending'  },
  { value: 'failed',   label: 'Failed'   },
]

function NativeSelect({ value, onChange, children, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-9 rounded-btn border border-border-default bg-white',
        'px-3 pr-7 text-sm shadow-sm appearance-none cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-primary-500',
        'hover:bg-gray-50',
        !value && 'text-text-tertiary',
        value  && 'text-text-primary',
      )}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  )
}

export default function AdsFilterBar({
  searchInput,
  onSearchChange,
  filters,
  onFilterChange,
  onClearAll,
  competitors = [],
}) {
  const hasFilters = !!filters.competitor || !!filters.hook_type ||
    !!filters.angle || !!filters.offer || !!filters.confidence || !!filters.format ||
    !!filters.analysis_status

  return (
    <div className="sticky top-0 z-10 -mx-6 px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-center gap-2 rounded-card border border-border-default bg-white px-4 py-3 shadow-card">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 sm:flex-none sm:w-56">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search ads…"
            className={cn(
              'h-9 w-full rounded-btn border border-border-default bg-white',
              'pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-gray-50'
            )}
          />
          {searchInput && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-tertiary hover:text-text-primary"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="h-4 w-px bg-border-default" aria-hidden="true" />

        {/* Competitor */}
        <NativeSelect
          value={filters.competitor}
          onChange={(v) => onFilterChange('competitor', v)}
          placeholder="Competitor"
        >
          {competitors.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </NativeSelect>

        {/* Hook Type */}
        <NativeSelect
          value={filters.hook_type}
          onChange={(v) => onFilterChange('hook_type', v)}
          placeholder="Hook Type"
        >
          {HOOK_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
        </NativeSelect>

        {/* Angle */}
        <NativeSelect
          value={filters.angle}
          onChange={(v) => onFilterChange('angle', v)}
          placeholder="Angle"
        >
          {ANGLES.map((a) => <option key={a} value={a}>{a}</option>)}
        </NativeSelect>

        {/* Offer Type */}
        <NativeSelect
          value={filters.offer}
          onChange={(v) => onFilterChange('offer', v)}
          placeholder="Offer Type"
        >
          {OFFER_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
        </NativeSelect>

        {/* Confidence */}
        <NativeSelect
          value={filters.confidence}
          onChange={(v) => onFilterChange('confidence', v)}
          placeholder="Confidence"
        >
          {CONFIDENCE.map((c) => <option key={c} value={c}>{c}</option>)}
        </NativeSelect>

        {/* Analysis status */}
        <NativeSelect
          value={filters.analysis_status}
          onChange={(v) => onFilterChange('analysis_status', v)}
          placeholder="Analysis"
        >
          {ANALYSIS_STATUS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </NativeSelect>

        {/* Format */}
        <NativeSelect
          value={filters.format || ''}
          onChange={(v) => onFilterChange('format', v)}
          placeholder="Format"
        >
          <option value="video">Video</option>
          <option value="image">Image</option>
        </NativeSelect>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          <DateRangePicker onChange={(r) => onFilterChange('dateRange', r)} />
          {hasFilters && (
            <button
              onClick={onClearAll}
              className="text-xs font-medium text-primary-600 hover:underline focus-visible:outline-none"
            >
              Clear Filters
            </button>
          )}
          <Button variant="outline" icon={SlidersHorizontal} size="sm">
            Filters
          </Button>
        </div>
      </div>
    </div>
  )
}
