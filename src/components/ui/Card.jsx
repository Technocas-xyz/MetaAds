import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const PADDING = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-6',
}

const Card = forwardRef(function Card(
  {
    title,
    subtitle,
    headerRight,
    padding    = 'md',
    border     = true,
    noPad,
    children,
    className,
    ...rest
  },
  ref
) {
  const padCls = noPad ? '' : PADDING[padding] ?? PADDING.md
  const hasHeader = title || subtitle || headerRight

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-card bg-white shadow-card',
        border && 'border border-border-default',
        className
      )}
      {...rest}
    >
      {hasHeader && (
        <div
          className={cn(
            'flex items-start justify-between gap-4',
            'border-b border-border-default',
            PADDING[padding] !== '' ? (padding === 'lg' ? 'px-6 py-4' : 'px-5 py-4') : 'px-4 py-3'
          )}
        >
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
            )}
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}
      <div className={padCls}>{children}</div>
    </div>
  )
})

export default Card
