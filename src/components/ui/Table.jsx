import { forwardRef } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import EmptyState from './EmptyState'
import { SkeletonTableRow } from './Skeleton'

/**
 * columns: Array<{
 *   key:     string,
 *   header:  string | ReactNode,
 *   cell?:   (row, index) => ReactNode,    // defaults to row[key]
 *   sortable?: boolean,
 *   width?:  string,                        // e.g. '120px' or 'w-32'
 *   align?:  'left' | 'center' | 'right',
 *   hideOn?: 'sm' | 'md' | 'lg',           // responsive hide breakpoint
 * }>
 *
 * selection: { selected: Set | string[], onChange: (nextSet) => void }
 * sort:      { key: string, dir: 'asc' | 'desc', onChange: ({key,dir}) => void }
 * density:   'compact' | 'comfy'
 */
const Table = forwardRef(function Table(
  {
    columns    = [],
    data       = [],
    loading    = false,
    empty,
    onRowClick,
    selection,
    sort,
    striped    = false,
    hover      = true,
    density    = 'comfy',
    className,
    ...rest
  },
  ref
) {
  const hasSelection = !!selection
  const allKeys      = data.map((_, i) => i)
  const selectedSet  = new Set(
    Array.isArray(selection?.selected) ? selection.selected : [...(selection?.selected ?? [])]
  )
  const allSelected  = data.length > 0 && data.every((_, i) => selectedSet.has(i))
  const someSelected = !allSelected && data.some((_, i) => selectedSet.has(i))

  const toggleAll = () => {
    if (allSelected) {
      selection.onChange(new Set())
    } else {
      selection.onChange(new Set(allKeys))
    }
  }

  const toggleRow = (i) => {
    const next = new Set(selectedSet)
    next.has(i) ? next.delete(i) : next.add(i)
    selection.onChange(next)
  }

  const handleSort = (col) => {
    if (!col.sortable || !sort) return
    const next =
      sort.key === col.key
        ? { key: col.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' }
        : { key: col.key, dir: 'asc' }
    sort.onChange(next)
  }

  const HIDE_CLS = {
    sm: 'hidden sm:table-cell',
    md: 'hidden md:table-cell',
    lg: 'hidden lg:table-cell',
  }

  const ALIGN_CLS = {
    left:   'text-left',
    center: 'text-center',
    right:  'text-right',
  }

  const CELL_PAD = density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4'
  const HEAD_PAD = density === 'compact' ? 'py-2.5 px-3' : 'py-3 px-4'

  return (
    <div
      ref={ref}
      className={cn(
        'overflow-hidden rounded-card border border-border-default bg-white shadow-card',
        className
      )}
      {...rest}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" role="grid">
          <thead>
            <tr className="border-b border-border-default bg-gray-50">
              {/* Checkbox column */}
              {hasSelection && (
                <th className={cn('w-10 shrink-0', HEAD_PAD)}>
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-primary-600"
                  />
                </th>
              )}

              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width && !col.width.startsWith('w-') ? { width: col.width } : undefined}
                  className={cn(
                    HEAD_PAD,
                    'text-[11px] font-semibold uppercase tracking-wide text-text-tertiary',
                    ALIGN_CLS[col.align ?? 'left'],
                    col.hideOn && HIDE_CLS[col.hideOn],
                    col.sortable && 'cursor-pointer select-none hover:text-text-primary',
                    col.width?.startsWith('w-') && col.width,
                  )}
                  onClick={() => handleSort(col)}
                  aria-sort={
                    sort?.key === col.key
                      ? sort.dir === 'asc' ? 'ascending' : 'descending'
                      : col.sortable ? 'none' : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <SortIcon colKey={col.key} sort={sort} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border-default">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={columns.length + (hasSelection ? 1 : 0)} className="p-0">
                    <SkeletonTableRow cols={columns.length + (hasSelection ? 1 : 0)} />
                  </td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasSelection ? 1 : 0)}>
                  {empty ?? (
                    <EmptyState
                      title="No data"
                      description="Nothing to display yet."
                      className="border-0 shadow-none"
                    />
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => {
                const isSelected = selectedSet.has(rowIdx)
                return (
                  <tr
                    key={rowIdx}
                    onClick={onRowClick ? () => onRowClick(row, rowIdx) : undefined}
                    aria-selected={isSelected || undefined}
                    className={cn(
                      'transition-colors',
                      onRowClick && 'cursor-pointer',
                      hover && !isSelected && 'hover:bg-gray-50',
                      striped && rowIdx % 2 === 1 && !isSelected && 'bg-gray-50/50',
                      isSelected && 'bg-primary-50',
                    )}
                  >
                    {/* Checkbox cell */}
                    {hasSelection && (
                      <td
                        className={cn('w-10', CELL_PAD)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select row ${rowIdx + 1}`}
                          checked={isSelected}
                          onChange={() => toggleRow(rowIdx)}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-primary-600"
                        />
                      </td>
                    )}

                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          CELL_PAD,
                          'text-text-primary',
                          ALIGN_CLS[col.align ?? 'left'],
                          col.hideOn && HIDE_CLS[col.hideOn],
                        )}
                      >
                        {col.cell ? col.cell(row, rowIdx) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
})

function SortIcon({ colKey, sort }) {
  if (!sort || sort.key !== colKey) {
    return <ChevronsUpDown size={12} className="opacity-40" />
  }
  return sort.dir === 'asc'
    ? <ChevronUp   size={12} className="text-primary-600" />
    : <ChevronDown size={12} className="text-primary-600" />
}

export default Table

/**
 * Renders a single data row as a stacked card for mobile viewports.
 * Designed to be used inside a `sm:hidden` wrapper alongside the desktop Table.
 *
 * @example
 * <div className="sm:hidden space-y-3">
 *   {data.map((row, i) => (
 *     <TableMobileCard key={i} row={row} columns={columns} onClick={() => onRowClick?.(row, i)} />
 *   ))}
 * </div>
 * <div className="hidden sm:block">
 *   <Table columns={columns} data={data} ... />
 * </div>
 */
export function TableMobileCard({
  row,
  columns     = [],
  onClick,
  selected    = false,
  className,
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      onClick={onClick}
      className={cn(
        'rounded-card border border-border-default bg-white p-4 shadow-card',
        onClick && 'cursor-pointer hover:border-primary-300 hover:shadow-md transition-all',
        selected && 'border-primary-400 bg-primary-50',
        className
      )}
    >
      {columns.map((col, i) => {
        const value = col.cell ? col.cell(row, i) : row[col.key]
        if (value == null || value === '') return null
        return (
          <div
            key={col.key}
            className={cn(
              'flex items-start justify-between gap-3',
              i < columns.length - 1 && 'mb-2.5 pb-2.5 border-b border-gray-100'
            )}
          >
            {col.header && (
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary w-28">
                {col.header}
              </span>
            )}
            <span className={cn('flex-1 text-sm text-text-primary', col.header ? 'text-right' : '')}>
              {value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
