import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'

const VARIANTS = {
  primary:   'bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-primary-500 disabled:bg-primary-300',
  secondary: 'bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-slate-400 disabled:text-slate-400',
  outline:   'border border-border-default bg-white text-text-primary shadow-sm hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-primary-500 disabled:text-text-tertiary disabled:border-gray-200',
  ghost:     'bg-transparent text-text-primary hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-primary-500 disabled:text-text-tertiary',
  success:   'bg-success-500 text-white shadow-sm hover:bg-success-600 active:bg-success-700 focus-visible:ring-success-500 disabled:bg-success-300',
  warning:   'bg-warning-500 text-white shadow-sm hover:bg-warning-600 active:bg-warning-700 focus-visible:ring-warning-500 disabled:bg-warning-300',
  danger:    'bg-danger-500 text-white shadow-sm hover:bg-danger-600 active:bg-danger-700 focus-visible:ring-danger-500 disabled:bg-danger-300',
}

const SIZES = {
  xs: 'h-7  px-2.5 text-xs  gap-1',
  sm: 'h-8  px-3   text-xs  gap-1.5',
  md: 'h-9  px-3.5 text-sm  gap-2',
  lg: 'h-10 px-4   text-sm  gap-2',
}

const Button = forwardRef(function Button(
  {
    children,
    variant       = 'primary',
    size          = 'md',
    icon: Icon,
    trailingIcon: TrailingIcon,
    iconSize,
    type          = 'button',
    disabled      = false,
    loading       = false,
    fullWidth     = false,
    to,
    href,
    onClick,
    className,
    ...rest
  },
  ref
) {
  const iSize = iconSize ?? (size === 'xs' || size === 'sm' ? 12 : 15)

  const classes = cn(
    'inline-flex items-center justify-center rounded-btn font-medium',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    fullWidth && 'w-full',
    className
  )

  const spinner = (
    <span
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  )

  const inner = loading ? (
    <>
      {spinner}
      {children && <span className="opacity-70">{children}</span>}
    </>
  ) : (
    <>
      {Icon && <Icon size={iSize} aria-hidden="true" />}
      {children}
      {TrailingIcon && <TrailingIcon size={iSize} aria-hidden="true" />}
    </>
  )

  if (to) {
    return (
      <Link to={to} ref={ref} className={classes} {...rest}>
        {inner}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} ref={ref} className={classes} {...rest}>
        {inner}
      </a>
    )
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {inner}
    </button>
  )
})

export default Button
