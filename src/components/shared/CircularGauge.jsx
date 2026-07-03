/**
 * SVG circular progress gauge with center label and score-based colouring.
 *
 * @example
 * <CircularGauge score={87} />                    // green, auto-label "87"
 * <CircularGauge score={55} size="lg" />          // amber
 * <CircularGauge score={30} label="Low" size="sm" />
 * <CircularGauge score={92} showPercent={false} label="A+" size="xl" />
 */
import { cn } from '../../lib/utils'

const SIZE_MAP = {
  xs:  { px: 40,  stroke: 4,  textCls: 'text-[10px]', subCls: 'text-[8px]'  },
  sm:  { px: 56,  stroke: 5,  textCls: 'text-xs',     subCls: 'text-[9px]'  },
  md:  { px: 80,  stroke: 6,  textCls: 'text-sm',     subCls: 'text-[10px]' },
  lg:  { px: 112, stroke: 8,  textCls: 'text-base',   subCls: 'text-xs'     },
  xl:  { px: 160, stroke: 10, textCls: 'text-xl',     subCls: 'text-xs'     },
}

function scoreColor(score) {
  if (score >= 70) return { stroke: '#16A34A', track: '#DCFCE7', text: 'text-success-600' }
  if (score >= 40) return { stroke: '#D97706', track: '#FEF3C7', text: 'text-warning-600' }
  return              { stroke: '#DC2626', track: '#FEE2E2', text: 'text-danger-600' }
}

export default function CircularGauge({
  score       = 0,
  label,
  subLabel,
  showPercent = true,
  size        = 'md',
  color,
  trackColor,
  className,
}) {
  const { px, stroke, textCls, subCls } = SIZE_MAP[size] ?? SIZE_MAP.md
  const auto    = scoreColor(score)
  const clr     = color     ?? auto.stroke
  const trackClr = trackColor ?? auto.track

  const cx   = px / 2
  const cy   = px / 2
  const r    = (px - stroke * 2) / 2

  // 270° arc starting from bottom-left (135°)
  const circ  = 2 * Math.PI * r
  const arc   = circ * 0.75
  const fill  = arc * Math.max(0, Math.min(score, 100)) / 100

  const rot   = 'rotate(135 ' + cx + ' ' + cy + ')'

  const displayLabel = label ?? (showPercent ? `${score}%` : String(score))

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: px, height: px }}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Score: ${score}%`}
    >
      <svg width={px} height={px} aria-hidden="true">
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={trackClr}
          strokeWidth={stroke}
          strokeDasharray={`${arc} ${circ - arc}`}
          strokeLinecap="round"
          transform={rot}
        />
        {/* Fill */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={clr}
          strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          transform={rot}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>

      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold leading-none', auto.text, textCls)}>
          {displayLabel}
        </span>
        {subLabel && (
          <span className={cn('mt-0.5 text-text-tertiary', subCls)}>{subLabel}</span>
        )}
      </div>
    </div>
  )
}
