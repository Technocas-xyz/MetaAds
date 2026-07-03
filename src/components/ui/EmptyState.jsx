import { InboxIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import Button from './Button'

export default function EmptyState({
  icon: Icon = InboxIcon,
  title       = 'Nothing here yet',
  description,
  action,
  actionLabel,
  actionIcon,
  onAction,
  className,
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border-default bg-white py-16 text-center',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <Icon size={26} className="text-text-tertiary" aria-hidden="true" />
      </div>

      <div className="max-w-xs space-y-1">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        {description && (
          <p className="text-sm text-text-tertiary">{description}</p>
        )}
      </div>

      {(action || (actionLabel && onAction)) && (
        <div className="mt-1">
          {action ?? (
            <Button
              variant="primary"
              size="sm"
              icon={actionIcon}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
