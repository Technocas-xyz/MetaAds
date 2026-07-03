/**
 * Soft-colour pill for ad hook types.
 * Colour mapping sourced from constants.HOOK_TYPE_COLORS.
 *
 * @example
 * <HookTypeBadge type="Pain Point" />
 * <HookTypeBadge type="Social Proof" size="xs" />
 */
import { cn } from '../../lib/utils'
import { HOOK_TYPE_COLORS } from '../../lib/constants'

const FALLBACK = 'bg-gray-50 text-gray-600 ring-gray-200'

const SIZE_MAP = {
  xs: 'px-1.5 py-0   text-[10px]',
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3   py-0.5 text-sm',
}

export default function HookTypeBadge({ type, size = 'sm', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium ring-1',
        SIZE_MAP[size] ?? SIZE_MAP.sm,
        HOOK_TYPE_COLORS[type] ?? FALLBACK,
        className
      )}
    >
      {type ?? '—'}
    </span>
  )
}
