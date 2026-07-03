/**
 * Displays an AI confidence level as a coloured pill.
 * Accepts either a numeric score (0-100) or a pre-resolved level string.
 *
 * @example
 * // From score
 * <ConfidenceBadge score={87} />           // → "High · 87%"
 * <ConfidenceBadge score={55} showScore /> // → "Medium · 55%"
 *
 * // From level
 * <ConfidenceBadge level="Low" />
 */
import { cn } from '../../lib/utils'
import { getConfidenceLevel, getConfidenceBadgeColor } from '../../lib/confidence'

export default function ConfidenceBadge({
  score,
  level: levelProp,
  showScore = true,
  size      = 'sm',
  className,
}) {
  const level   = levelProp ?? getConfidenceLevel(score ?? 0)
  const colorCls = getConfidenceBadgeColor(level)

  const sizeMap = {
    xs: 'px-1.5 py-0   text-[10px]',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3   py-1   text-sm',
  }

  return (
    <span
      role="status"
      aria-label={`Confidence: ${level}${score !== undefined ? ` (${score}%)` : ''}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium ring-1',
        sizeMap[size] ?? sizeMap.sm,
        colorCls,
        className
      )}
    >
      {level}
      {showScore && score !== undefined && (
        <span className="opacity-60">{score}%</span>
      )}
    </span>
  )
}
