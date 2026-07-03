/**
 * AI-generated suggestion / strategic recommendation card.
 *
 * @example
 * <SuggestionCard
 *   icon={Zap}
 *   iconBg="indigo"
 *   title="Add price anchor in hook"
 *   description="Ads using price anchoring in the first 3 seconds see 23% higher CTR."
 *   priority="High"
 *   thumbnail="/assets/ref-ad.jpg"
 *   action={{ label: 'Apply to Brief', onClick: () => {} }}
 * />
 */
import { cn } from '../../lib/utils'
import { ArrowRight } from 'lucide-react'

const PRIORITY_STYLE = {
  Critical: 'bg-red-100     text-red-700',
  High:     'bg-orange-100  text-orange-700',
  Medium:   'bg-amber-100   text-amber-700',
  Low:      'bg-gray-100    text-gray-600',
  Info:     'bg-blue-100    text-blue-700',
}

const ICON_BG = {
  indigo: 'bg-primary-50  text-primary-600',
  green:  'bg-success-50  text-success-600',
  amber:  'bg-warning-50  text-warning-600',
  red:    'bg-danger-50   text-danger-600',
  blue:   'bg-blue-50     text-blue-600',
  purple: 'bg-purple-50   text-purple-600',
  teal:   'bg-teal-50     text-teal-600',
}

export default function SuggestionCard({
  icon: Icon,
  iconBg    = 'indigo',
  title,
  description,
  priority,
  thumbnail,
  action,
  tags,
  className,
}) {
  const iconCls     = ICON_BG[iconBg] ?? ICON_BG.indigo
  const priorityCls = PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.Low

  return (
    <div
      className={cn(
        'rounded-card border border-border-default bg-white shadow-card',
        'transition-shadow hover:shadow-card-hover',
        className
      )}
    >
      <div className="flex gap-4 p-4">
        {/* Icon */}
        {Icon && (
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              iconCls
            )}
            aria-hidden="true"
          >
            <Icon size={17} />
          </div>
        )}

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-semibold text-text-primary">{title}</p>
            {priority && (
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', priorityCls)}>
                {priority}
              </span>
            )}
          </div>

          {description && (
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{description}</p>
          )}

          {/* Tags */}
          {tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action */}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              {action.label}
              <ArrowRight size={12} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Thumbnail */}
        {thumbnail && (
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border-default">
            <img
              src={thumbnail}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </div>
  )
}
