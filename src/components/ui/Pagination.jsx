import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/**
 * <Pagination
 *   page={page}
 *   perPage={perPage}
 *   total={total}
 *   onPage={setPage}
 *   onPerPage={setPerPage}
 *   pageSizeOptions={[10,25,50,100]}
 * />
 */
export default function Pagination({
  page,
  perPage,
  total,
  onPage,
  onPerPage,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage   = Math.min(Math.max(1, page), totalPages)

  const from = (safePage - 1) * perPage + 1
  const to   = Math.min(safePage * perPage, total)

  // Build page number list with ellipsis
  function buildPages() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = []
    const delta = 1
    const left  = safePage - delta
    const right = safePage + delta

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== '…') {
        pages.push('…')
      }
    }
    return pages
  }

  const pages = buildPages()

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        className
      )}
    >
      {/* Page size */}
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <span>Rows:</span>
        <select
          value={perPage}
          onChange={(e) => { onPerPage?.(Number(e.target.value)); onPage?.(1) }}
          aria-label="Rows per page"
          className="h-7 rounded border border-border-default bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <span className="text-xs text-text-secondary">
        {total === 0 ? 'No results' : `${from}–${to} of ${total.toLocaleString()}`}
      </span>

      {/* Page buttons */}
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <PageBtn
          onClick={() => onPage?.(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </PageBtn>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="flex h-7 w-7 items-center justify-center text-xs text-text-tertiary">
              …
            </span>
          ) : (
            <PageBtn
              key={p}
              active={p === safePage}
              onClick={() => onPage?.(p)}
              aria-label={`Page ${p}`}
              aria-current={p === safePage ? 'page' : undefined}
            >
              {p}
            </PageBtn>
          )
        )}

        <PageBtn
          onClick={() => onPage?.(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </PageBtn>
      </nav>
    </div>
  )
}

function PageBtn({ children, active, disabled, onClick, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded border text-xs font-medium',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'border-primary-600 bg-primary-600 text-white'
          : 'border-border-default bg-white text-text-secondary hover:bg-gray-50'
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
