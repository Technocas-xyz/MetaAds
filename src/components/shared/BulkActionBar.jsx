/**
 * Floating action bar that appears above a table when one or more rows are selected.
 * actions is an array of { label, icon, onClick, variant? } objects.
 *
 * @example
 * <BulkActionBar
 *   count={selectedRows.size}
 *   onClearSelection={() => setSelected(new Set())}
 *   actions={[
 *     { label: 'Approve',  icon: CheckCircle2, onClick: handleApprove },
 *     { label: 'Reject',   icon: XCircle,      onClick: handleReject, variant: 'danger' },
 *     { label: 'Export',   icon: Download,     onClick: handleExport },
 *   ]}
 * />
 */
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

const ACTION_VARIANT = {
  default: 'text-text-primary hover:bg-gray-100',
  primary: 'text-primary-600 hover:bg-primary-50',
  danger:  'text-danger-600  hover:bg-danger-50',
  success: 'text-success-600 hover:bg-success-50',
  warning: 'text-warning-600 hover:bg-warning-50',
}

export default function BulkActionBar({
  count            = 0,
  actions          = [],
  onClearSelection,
  className,
}) {
  if (count === 0) return null

  return (
    <div
      role="toolbar"
      aria-label={`${count} row${count !== 1 ? 's' : ''} selected`}
      className={cn(
        'flex items-center gap-3 rounded-card border border-primary-200 bg-primary-50 px-4 py-2.5 shadow-card',
        className
      )}
    >
      {/* Selection count + clear */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold text-primary-700">
          {count} selected
        </span>
        {onClearSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            aria-label="Clear selection"
            className="rounded p-0.5 text-primary-500 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-primary-200" aria-hidden="true" />

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-1">
        {actions.map((action, i) => {
          const Icon      = action.icon
          const variantCls = ACTION_VARIANT[action.variant ?? 'default']

          return (
            <button
              key={i}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              title={action.label}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                'disabled:cursor-not-allowed disabled:opacity-50',
                variantCls
              )}
            >
              {Icon && <Icon size={14} aria-hidden="true" />}
              {action.label}
            </button>
          )
        })}
      </div>

      {/* Right slot */}
      <div className="ml-auto" />
    </div>
  )
}
