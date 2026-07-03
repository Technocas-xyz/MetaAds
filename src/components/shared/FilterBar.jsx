/**
 * Horizontal filter container. Accepts any mix of inputs/selects/buttons as children.
 * Renders a "Clear filters" link when any filter has a value.
 * On mobile (md-), only `primaryCount` children are shown; the rest collapse behind
 * a "More filters" toggle button.
 * Optional sticky behaviour to lock below the top bar.
 *
 * @example
 * <FilterBar
 *   filters={{ status, platform }}
 *   onClear={() => { setStatus(''); setPlatform('') }}
 *   primaryCount={1}
 *   sticky
 * >
 *   <Input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
 *   <select value={status} onChange={e => setStatus(e.target.value)}>…</select>
 * </FilterBar>
 */
import { useState, Children } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils'

function hasActiveFilters(filters) {
  if (!filters) return false
  return Object.values(filters).some((v) => {
    if (v === null || v === undefined || v === '') return false
    if (Array.isArray(v)) return v.length > 0
    return true
  })
}

export default function FilterBar({
  children,
  filters,
  hasFilters: hasFiltersProp,
  onClear,
  sticky       = false,
  label        = false,
  primaryCount = Infinity,
  className,
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const showClear     = hasFiltersProp ?? hasActiveFilters(filters)
  const childArray    = Children.toArray(children)
  const primaryItems  = primaryCount === Infinity ? childArray : childArray.slice(0, primaryCount)
  const secondaryItems = primaryCount === Infinity ? [] : childArray.slice(primaryCount)
  const hasSecondary  = secondaryItems.length > 0

  return (
    <div
      className={cn(
        'rounded-card border border-border-default bg-white px-4 py-3 shadow-card',
        sticky && 'sticky top-0 z-20',
        className
      )}
    >
      {/* Primary row — always visible */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Optional label */}
        {label && (
          <div className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-secondary">
            <SlidersHorizontal size={14} aria-hidden="true" />
            <span>Filters</span>
          </div>
        )}

        {primaryItems}

        {/* More filters toggle — only on md- when there are secondary filters */}
        {hasSecondary && (
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="filter-bar-secondary"
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(
              'md:hidden flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
              moreOpen
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-border-default bg-white text-text-secondary hover:bg-gray-50'
            )}
          >
            <SlidersHorizontal size={13} aria-hidden="true" />
            {moreOpen ? 'Fewer filters' : 'More filters'}
          </button>
        )}

        {/* Secondary items always visible on md+ */}
        <div className={cn('hidden md:flex flex-wrap items-center gap-3', hasSecondary && 'flex-1')}>
          {secondaryItems}
        </div>

        {/* Clear link */}
        {showClear && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto flex shrink-0 items-center gap-1 text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            <X size={13} aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>

      {/* Secondary row — mobile only, collapsible */}
      {hasSecondary && moreOpen && (
        <div
          id="filter-bar-secondary"
          className="md:hidden mt-3 flex flex-wrap items-center gap-3 border-t border-border-default pt-3"
        >
          {secondaryItems}
        </div>
      )}
    </div>
  )
}
