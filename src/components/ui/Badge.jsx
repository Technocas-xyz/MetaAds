import { cn } from '../../lib/utils'

// color → [solid, soft, outline]
const COLOR_MAP = {
  slate:  ['bg-slate-600  text-white',           'bg-slate-100  text-slate-700',  'border border-slate-300  text-slate-700'],
  red:    ['bg-red-600    text-white',            'bg-red-50     text-red-700',    'border border-red-300    text-red-700'],
  amber:  ['bg-amber-500  text-white',            'bg-amber-50   text-amber-700',  'border border-amber-300  text-amber-700'],
  green:  ['bg-green-600  text-white',            'bg-green-50   text-green-700',  'border border-green-300  text-green-700'],
  blue:   ['bg-blue-600   text-white',            'bg-blue-50    text-blue-700',   'border border-blue-300   text-blue-700'],
  indigo: ['bg-primary-600 text-white',           'bg-primary-50  text-primary-700','border border-primary-300 text-primary-700'],
  purple: ['bg-purple-600 text-white',            'bg-purple-50  text-purple-700', 'border border-purple-300 text-purple-700'],
  pink:   ['bg-pink-600   text-white',            'bg-pink-50    text-pink-700',   'border border-pink-300   text-pink-700'],
  teal:   ['bg-teal-600   text-white',            'bg-teal-50    text-teal-700',   'border border-teal-300   text-teal-700'],
  gray:   ['bg-gray-600   text-white',            'bg-gray-100   text-gray-700',   'border border-gray-300   text-gray-700'],
}

const VARIANT_IDX = { solid: 0, soft: 1, outline: 2 }

const SIZE_CLS = {
  xs: 'px-1.5 py-0    text-[10px] font-medium rounded',
  sm: 'px-2   py-0.5  text-xs     font-medium rounded-full',
  md: 'px-2.5 py-0.5  text-xs     font-semibold rounded-full',
}

export default function Badge({
  children,
  color   = 'gray',
  size    = 'sm',
  variant = 'soft',
  className,
  ...rest
}) {
  const colorRow = COLOR_MAP[color] ?? COLOR_MAP.gray
  const colorCls = colorRow[VARIANT_IDX[variant] ?? 1]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        SIZE_CLS[size] ?? SIZE_CLS.sm,
        colorCls,
        className
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
