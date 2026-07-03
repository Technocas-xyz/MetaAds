import { forwardRef, useId } from 'react'
import { cn } from '../../lib/utils'

const Input = forwardRef(function Input(
  {
    label,
    error,
    helper,
    leftIcon:  LeftIcon,
    rightIcon: RightIcon,
    prefix,
    suffix,
    className,
    id: idProp,
    disabled,
    ...rest
  },
  ref
) {
  const autoId = useId()
  const id     = idProp ?? autoId

  const hasLeft  = LeftIcon  || prefix
  const hasRight = RightIcon || suffix

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-stretch">
        {/* Prefix */}
        {prefix && (
          <span className="flex items-center rounded-l-btn border border-r-0 border-border-default bg-gray-50 px-3 text-sm text-text-secondary">
            {prefix}
          </span>
        )}

        {/* Left icon */}
        {LeftIcon && !prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            <LeftIcon size={15} aria-hidden="true" />
          </span>
        )}

        <input
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
          className={cn(
            'h-9 w-full border border-border-default bg-white text-sm text-text-primary',
            'placeholder:text-text-tertiary',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70',
            'transition-colors',
            prefix  ? 'rounded-r-btn' : suffix  ? 'rounded-l-btn' : 'rounded-btn',
            hasLeft  && !prefix  ? 'pl-9'  : 'pl-3',
            hasRight && !suffix  ? 'pr-9'  : 'pr-3',
            error && 'border-danger-500 focus:ring-danger-500',
          )}
          {...rest}
        />

        {/* Right icon */}
        {RightIcon && !suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            <RightIcon size={15} aria-hidden="true" />
          </span>
        )}

        {/* Suffix */}
        {suffix && (
          <span className="flex items-center rounded-r-btn border border-l-0 border-border-default bg-gray-50 px-3 text-sm text-text-secondary">
            {suffix}
          </span>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger-600">
          {error}
        </p>
      )}
      {helper && !error && (
        <p id={`${id}-helper`} className="text-xs text-text-tertiary">
          {helper}
        </p>
      )}
    </div>
  )
})

export default Input
