import { DollarSign, Info } from 'lucide-react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

/**
 * EstSpend — displays estimated ad spend with tooltip explaining the formula.
 *
 * Props:
 *   daysRunning — number of days the ad ran
 *   dailyRate   — the $/day rate used (from global or per-competitor override)
 *   compact     — if true, shows shorter format
 */
export default function EstSpend({ daysRunning, dailyRate = 20, compact = false }) {
  if (!daysRunning || daysRunning <= 0) {
    return <span className="text-xs text-text-tertiary">—</span>
  }

  const spend = daysRunning * dailyRate
  const formatted = spend >= 1000
    ? `$${(spend / 1000).toFixed(1)}k`
    : `$${spend.toLocaleString()}`

  const tooltipText = `${daysRunning} days × $${dailyRate}/day = $${spend.toLocaleString()} (estimated)\n\nMeta doesn't publish ad spend. This is an estimate based on how long the ad has run × the assumed daily rate. Adjust the rate in Settings.`

  return (
    <TooltipPrimitive.Provider delayDuration={100}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span className="inline-flex cursor-help items-center gap-0.5 text-xs text-text-secondary">
            {compact ? (
              <span className="font-medium text-text-primary">~{formatted}</span>
            ) : (
              <>
                <DollarSign size={10} className="text-text-tertiary" />
                <span>Est. ~{formatted}</span>
                <Info size={9} className="text-text-tertiary ml-0.5" />
              </>
            )}
          </span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="z-50 max-w-[260px] rounded-lg border border-border-default bg-white px-3 py-2 text-[11px] leading-relaxed text-text-secondary shadow-lg whitespace-pre-line"
          >
            {tooltipText}
            <TooltipPrimitive.Arrow className="fill-white stroke-border-default stroke-[0.5]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
