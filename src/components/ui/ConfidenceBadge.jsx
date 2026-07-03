import { cn } from '../../lib/utils'
import { getConfidenceLevel, getConfidenceBadgeColor } from '../../lib/confidence'

export default function ConfidenceBadge({ score, level: levelProp }) {
  const level = levelProp ?? getConfidenceLevel(score ?? 0)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1',
        getConfidenceBadgeColor(level)
      )}
    >
      {level}
      {score !== undefined && (
        <span className="ml-1 opacity-60">{score}%</span>
      )}
    </span>
  )
}
