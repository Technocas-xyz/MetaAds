import { cn } from '../../lib/utils'

const COLORS = {
  Pain:           'bg-red-50    text-red-700    ring-red-200',
  Benefit:        'bg-green-50  text-green-700  ring-green-200',
  Curiosity:      'bg-purple-50 text-purple-700 ring-purple-200',
  Urgency:        'bg-orange-50 text-orange-700 ring-orange-200',
  Trust:          'bg-blue-50   text-blue-700   ring-blue-200',
  Price:          'bg-amber-50  text-amber-700  ring-amber-200',
  'How To':       'bg-teal-50   text-teal-700   ring-teal-200',
  'Social Proof': 'bg-primary-50 text-primary-700 ring-primary-200',
}
const FALLBACK = 'bg-gray-50 text-gray-600 ring-gray-200'

export default function HookTypeBadge({ type }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1',
        COLORS[type] ?? FALLBACK
      )}
    >
      {type ?? '—'}
    </span>
  )
}
