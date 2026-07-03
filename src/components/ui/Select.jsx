import { useState, useRef, useId, useMemo } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { ChevronDown, Search, Check, X } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Single-select:
 *   <Select options={[{value:'a',label:'Option A'}]} value={v} onChange={setV} />
 *
 * Multi-select:
 *   <Select multi options={...} value={arr} onChange={setArr} />
 *
 * options: Array<{ value, label, description?, disabled? }> | string[]
 */
export default function Select({
  options    = [],
  value,
  onChange,
  multi      = false,
  placeholder = 'Select…',
  searchable  = true,
  label,
  error,
  helper,
  disabled   = false,
  clearable  = false,
  className,
  id: idProp,
}) {
  const autoId       = useId()
  const id           = idProp ?? autoId
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const searchRef = useRef(null)

  // Normalise options to { value, label, description?, disabled? }
  const normalised = useMemo(() =>
    options.map((o) => typeof o === 'string' ? { value: o, label: o } : o),
    [options]
  )

  const filtered = useMemo(() =>
    query
      ? normalised.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
      : normalised,
    [normalised, query]
  )

  // Resolve selected labels
  const selectedArr  = multi ? (Array.isArray(value) ? value : []) : (value != null ? [value] : [])
  const selectedOpts = normalised.filter((o) => selectedArr.includes(o.value))

  const isSelected = (v) => selectedArr.includes(v)

  const toggle = (v) => {
    if (multi) {
      const next = isSelected(v)
        ? selectedArr.filter((x) => x !== v)
        : [...selectedArr, v]
      onChange?.(next)
    } else {
      onChange?.(v)
      setOpen(false)
      setQuery('')
    }
  }

  const removeItem = (v, e) => {
    e.stopPropagation()
    onChange?.(selectedArr.filter((x) => x !== v))
  }

  const clearAll = (e) => {
    e.stopPropagation()
    onChange?.(multi ? [] : null)
  }

  // Trigger label
  const triggerLabel = selectedOpts.length === 0 ? null
    : multi ? null
    : selectedOpts[0].label

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}

      <Popover.Root
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (v) setTimeout(() => searchRef.current?.focus(), 50)
          if (!v) setQuery('')
        }}
      >
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-invalid={!!error}
            className={cn(
              'flex min-h-[36px] w-full items-center gap-2 rounded-btn border border-border-default bg-white',
              'px-3 py-1.5 text-sm text-left',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70',
              'transition-colors hover:border-gray-400',
              error && 'border-danger-500 focus-visible:ring-danger-500',
              open  && 'ring-2 ring-primary-500 border-primary-500'
            )}
          >
            {/* Multi chips */}
            {multi && selectedOpts.length > 0 ? (
              <span className="flex flex-1 flex-wrap gap-1">
                {selectedOpts.map((o) => (
                  <span
                    key={o.value}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700"
                  >
                    {o.label}
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => removeItem(o.value, e)}
                      aria-label={`Remove ${o.label}`}
                      className="hover:text-primary-900"
                    >
                      <X size={9} />
                    </button>
                  </span>
                ))}
              </span>
            ) : (
              <span className={cn('flex-1 truncate', !triggerLabel && 'text-text-tertiary')}>
                {triggerLabel ?? placeholder}
              </span>
            )}

            {/* Clear button */}
            {clearable && selectedArr.length > 0 && (
              <button
                type="button"
                tabIndex={-1}
                onClick={clearAll}
                aria-label="Clear selection"
                className="shrink-0 text-text-tertiary hover:text-text-primary"
              >
                <X size={13} />
              </button>
            )}

            <ChevronDown
              size={14}
              className={cn('shrink-0 text-text-secondary transition-transform', open && 'rotate-180')}
            />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className={cn(
              'z-50 w-[var(--radix-popover-trigger-width)] rounded-card border border-border-default bg-white p-1.5 shadow-lg',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'max-h-72 flex flex-col'
            )}
          >
            {/* Search */}
            {searchable && (
              <div className="relative mb-1 shrink-0">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  ref={searchRef}
                  type="search"
                  placeholder="Search…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-8 w-full rounded-md border border-border-default pl-7 pr-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            )}

            {/* Options list */}
            <div
              role="listbox"
              aria-multiselectable={multi}
              className="overflow-y-auto"
            >
              {filtered.length === 0 ? (
                <p className="py-4 text-center text-xs text-text-tertiary">No results</p>
              ) : (
                filtered.map((opt) => {
                  const sel = isSelected(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={sel}
                      disabled={opt.disabled}
                      onClick={() => toggle(opt.value)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        sel ? 'bg-primary-50 text-primary-700' : 'text-text-primary hover:bg-gray-50'
                      )}
                    >
                      {multi && (
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                            sel
                              ? 'border-primary-600 bg-primary-600'
                              : 'border-border-default bg-white'
                          )}
                          aria-hidden="true"
                        >
                          {sel && <Check size={10} className="text-white" strokeWidth={3} />}
                        </span>
                      )}
                      <span className="flex-1 truncate">{opt.label}</span>
                      {!multi && sel && (
                        <Check size={14} className="shrink-0 text-primary-600" strokeWidth={2.5} />
                      )}
                    </button>
                  )
                })
              )}
            </div>

            {/* Multi select footer */}
            {multi && selectedArr.length > 0 && (
              <div className="mt-1 shrink-0 border-t border-border-default pt-1.5 text-center">
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-text-secondary hover:text-text-primary"
                >
                  Clear {selectedArr.length} selected
                </button>
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {error && (
        <p role="alert" className="text-xs text-danger-600">{error}</p>
      )}
      {helper && !error && (
        <p className="text-xs text-text-tertiary">{helper}</p>
      )}
    </div>
  )
}
