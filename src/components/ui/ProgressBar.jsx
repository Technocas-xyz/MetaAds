import { cn } from '../../lib/utils'

/**
 * ProgressBar — shows a running job's progress with bar + counter.
 *
 * Props:
 *   total      — total items to process
 *   completed  — items done so far
 *   failed     — items that failed (optional)
 *   current    — name of the item currently being processed (optional)
 *   className  — extra wrapper class
 */
export default function ProgressBar({ total, completed, failed = 0, current, className }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-primary-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between text-[10px] text-text-secondary">
        <span>
          {completed} of {total} done{failed > 0 && <span className="text-danger-500"> ({failed} failed)</span>}
        </span>
        <span className="font-medium">{pct}%</span>
      </div>

      {/* Current item */}
      {current && (
        <p className="truncate text-[10px] text-text-tertiary">
          Currently: {current}
        </p>
      )}
    </div>
  )
}
