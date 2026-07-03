/**
 * Soft-colour pill for creative angles.
 * Colour mapping sourced from constants.ANGLE_COLORS.
 *
 * @example
 * <AngleBadge type="Speed" />
 * <AngleBadge type="Trust" size="xs" />
 */
import { cn } from '../../lib/utils'
import { ANGLE_COLORS } from '../../lib/constants'

const FALLBACK = 'bg-gray-50 text-gray-600 ring-gray-200'

const SIZE_MAP = {
  xs: 'px-1.5 py-0   text-[10px]',
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3   py-0.5 text-sm',
}

export default function AngleBadge({ type, size = 'sm', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium ring-1',
        SIZE_MAP[size] ?? SIZE_MAP.sm,
        ANGLE_COLORS[type] ?? FALLBACK,
        className
      )}
    >
      {type ?? '—'}
    </span>
  )
}
