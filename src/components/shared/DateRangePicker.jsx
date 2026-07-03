/**
 * Date range picker with @headlessui/react Popover and a custom two-month calendar
 * built with date-fns. No external calendar library required.
 *
 * @example
 * // Controlled
 * const [range, setRange] = useState({ from: null, to: null })
 * <DateRangePicker value={range} onChange={setRange} />
 *
 * // Uncontrolled with default preset
 * <DateRangePicker defaultPreset="last_30" onChange={({ from, to }) => refetch(from, to)} />
 *
 * // Compact trigger label
 * <DateRangePicker value={range} onChange={setRange} placeholder="Pick dates" />
 */
import { useState, useCallback } from 'react'
import { Popover } from '@headlessui/react'
import {
  Calendar, ChevronDown, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import {
  format, addMonths, subMonths,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  eachDayOfInterval,
  isSameDay, isSameMonth,
  isWithinInterval, isBefore, isAfter,
  subDays,
} from 'date-fns'
import { cn } from '../../lib/utils'

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS = [
  { id: 'today',      label: 'Today',        get: () => { const t = new Date(); return { from: t, to: t } } },
  { id: 'yesterday',  label: 'Yesterday',    get: () => { const y = subDays(new Date(), 1); return { from: y, to: y } } },
  { id: 'last_7',     label: 'Last 7 days',  get: () => ({ from: subDays(new Date(), 6),  to: new Date() }) },
  { id: 'last_14',    label: 'Last 14 days', get: () => ({ from: subDays(new Date(), 13), to: new Date() }) },
  { id: 'last_30',    label: 'Last 30 days', get: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { id: 'last_90',    label: 'Last 90 days', get: () => ({ from: subDays(new Date(), 89), to: new Date() }) },
  {
    id: 'this_month',
    label: 'This month',
    get: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    id: 'last_month',
    label: 'Last month',
    get: () => {
      const lm = subMonths(new Date(), 1)
      return { from: startOfMonth(lm), to: endOfMonth(lm) }
    },
  },
]

// ── Trigger label ─────────────────────────────────────────────────────────────

function formatRange(from, to) {
  if (!from && !to) return null
  if (!to || isSameDay(from, to)) return format(from, 'MMM d, yyyy')
  return `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`
}

// ── Single month calendar grid ────────────────────────────────────────────────

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function MonthGrid({ month, from, to, hover, onDayClick, onDayHover }) {
  const firstDay  = startOfMonth(month)
  const lastDay   = endOfMonth(month)
  const gridStart = startOfWeek(firstDay, { weekStartsOn: 0 })
  const gridEnd   = endOfWeek(lastDay,   { weekStartsOn: 0 })
  const days      = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const effectiveTo = to ?? hover ?? null

  return (
    <div className="w-56">
      {/* Month header */}
      <p className="mb-2 text-center text-sm font-semibold text-text-primary">
        {format(month, 'MMMM yyyy')}
      </p>

      {/* Week day headers */}
      <div className="grid grid-cols-7">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-medium text-text-tertiary">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth   = isSameMonth(day, month)
          const isStart   = from   && isSameDay(day, from)
          const isEnd     = to     && isSameDay(day, to)
          const isHoverEnd = !to && hover && isSameDay(day, hover)

          const rangeStart = from
          const rangeEnd   = effectiveTo
          const inRange    = rangeStart && rangeEnd && !isSameDay(rangeStart, rangeEnd) &&
            isWithinInterval(day, {
              start: isBefore(rangeStart, rangeEnd) ? rangeStart : rangeEnd,
              end:   isBefore(rangeStart, rangeEnd) ? rangeEnd   : rangeStart,
            }) && !isStart && !isEnd && !isHoverEnd

          const isToday    = isSameDay(day, new Date())

          return (
            <div key={day.toISOString()} className="flex items-center justify-center py-0.5">
              <button
                type="button"
                onClick={() => onDayClick(day)}
                onMouseEnter={() => onDayHover?.(day)}
                disabled={!inMonth}
                aria-label={format(day, 'MMMM d, yyyy')}
                aria-pressed={isStart || isEnd}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
                  'disabled:pointer-events-none disabled:opacity-0',
                  !isStart && !isEnd && !isHoverEnd && inMonth && 'hover:bg-gray-100',
                  // Range highlight
                  inRange && 'rounded-none bg-primary-50 text-primary-700',
                  // Start/end
                  (isStart || isEnd) && 'bg-primary-600 text-white hover:bg-primary-700',
                  // Hover end preview
                  isHoverEnd && !isStart && 'bg-primary-100 text-primary-700',
                  // Today ring (when not selected)
                  isToday && !isStart && !isEnd && !isHoverEnd && 'font-bold ring-1 ring-primary-300',
                  // Faded out-of-month days (shown for alignment but disabled)
                  !inMonth && 'pointer-events-none opacity-0',
                )}
              >
                {format(day, 'd')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DateRangePicker({
  value,
  onChange,
  defaultPreset = 'last_7',
  placeholder   = 'Select date range',
  align         = 'left',
  className,
}) {
  // Internal state when uncontrolled
  const [internalRange, setInternalRange] = useState(() => {
    if (defaultPreset) {
      const p = PRESETS.find((p) => p.id === defaultPreset)
      return p ? p.get() : { from: null, to: null }
    }
    return { from: null, to: null }
  })

  const range     = value ?? internalRange
  const setRange  = onChange ?? setInternalRange

  const [leftMonth,  setLeftMonth]  = useState(() => {
    const base = range.from ?? new Date()
    return startOfMonth(subMonths(base, 1))
  })
  const rightMonth = addMonths(leftMonth, 1)

  const [hoverDate,   setHoverDate]   = useState(null)
  const [activePreset, setActivePreset] = useState(defaultPreset)
  // 'idle' → click sets from; 'picking-end' → click sets to
  const [picking, setPicking] = useState('idle')

  const handleDayClick = useCallback((day) => {
    if (picking === 'idle' || (range.from && range.to)) {
      setRange({ from: day, to: null })
      setPicking('picking-end')
      setActivePreset(null)
    } else {
      const from = range.from
      const ordered = isBefore(day, from)
        ? { from: day, to: from }
        : { from, to: day }
      setRange(ordered)
      setPicking('idle')
      setHoverDate(null)
    }
  }, [picking, range.from, range.to, setRange])

  const handlePreset = (preset) => {
    const r = preset.get()
    setRange(r)
    setActivePreset(preset.id)
    setPicking('idle')
    setHoverDate(null)
    // Navigate calendar to show the range
    setLeftMonth(startOfMonth(subMonths(r.from ?? new Date(), 0)))
  }

  const clearRange = (e) => {
    e.stopPropagation()
    setRange({ from: null, to: null })
    setActivePreset(null)
    setPicking('idle')
    setHoverDate(null)
  }

  const label = formatRange(range.from, range.to)

  return (
    <Popover className={cn('relative', className)}>
      {/* Trigger */}
      <Popover.Button
        className={cn(
          'flex items-center gap-2 rounded-btn border border-border-default bg-white',
          'px-3 py-2 text-sm font-medium text-text-primary shadow-card',
          'transition-colors hover:bg-gray-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          'data-[open]:ring-2 data-[open]:ring-primary-500 data-[open]:border-primary-500'
        )}
      >
        <Calendar size={14} className="shrink-0 text-text-secondary" />
        <span className={cn('min-w-[120px]', !label && 'text-text-tertiary')}>
          {label ?? placeholder}
        </span>
        {label && (
          <button
            type="button"
            onClick={clearRange}
            aria-label="Clear date range"
            className="rounded text-text-tertiary hover:text-text-primary"
          >
            <X size={12} />
          </button>
        )}
        <ChevronDown size={13} className="shrink-0 text-text-secondary" />
      </Popover.Button>

      {/* Panel */}
      <Popover.Panel
        className={cn(
          'absolute z-50 mt-2',
          align === 'right' ? 'right-0' : 'left-0',
          'flex overflow-hidden rounded-card border border-border-default bg-white shadow-xl',
          'data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95',
        )}
      >
        {/* Presets sidebar */}
        <div className="flex w-36 flex-col gap-0.5 border-r border-border-default py-3 px-2">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            Quick select
          </p>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePreset(preset)}
              className={cn(
                'rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                activePreset === preset.id
                  ? 'bg-primary-50 font-medium text-primary-700'
                  : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Calendar */}
        <div className="p-4">
          {/* Month navigation */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setLeftMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
              className="rounded-md p-1 text-text-tertiary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-8">
              {/* Spacers to keep month labels aligned over grids */}
              <div className="w-56 text-center" />
              <div className="w-56 text-center" />
            </div>
            <button
              type="button"
              onClick={() => setLeftMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              className="rounded-md p-1 text-text-tertiary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Two-month grids */}
          <div
            className="flex gap-6"
            onMouseLeave={() => setHoverDate(null)}
          >
            <MonthGrid
              month={leftMonth}
              from={range.from}
              to={range.to}
              hover={picking === 'picking-end' ? hoverDate : null}
              onDayClick={handleDayClick}
              onDayHover={picking === 'picking-end' ? setHoverDate : undefined}
            />
            <div className="w-px bg-border-default" />
            <MonthGrid
              month={rightMonth}
              from={range.from}
              to={range.to}
              hover={picking === 'picking-end' ? hoverDate : null}
              onDayClick={handleDayClick}
              onDayHover={picking === 'picking-end' ? setHoverDate : undefined}
            />
          </div>

          {/* Footer hint */}
          <p className="mt-3 text-center text-[11px] text-text-tertiary">
            {picking === 'picking-end'
              ? 'Click to select end date'
              : range.from && range.to
              ? `${format(range.from, 'MMM d')} – ${format(range.to, 'MMM d, yyyy')}`
              : 'Click a start date'}
          </p>
        </div>
      </Popover.Panel>
    </Popover>
  )
}
