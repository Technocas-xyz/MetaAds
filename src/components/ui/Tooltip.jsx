import * as RadixTooltip from '@radix-ui/react-tooltip'
import { cn } from '../../lib/utils'

// Provider should wrap your app root once; export for convenience
export const TooltipProvider = RadixTooltip.Provider

export default function Tooltip({
  children,
  content,
  side        = 'top',
  align       = 'center',
  delayMs     = 300,
  className,
  disabled    = false,
}) {
  if (!content || disabled) return children

  return (
    <RadixTooltip.Provider delayDuration={delayMs}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            align={align}
            sideOffset={6}
            className={cn(
              'z-50 max-w-xs rounded-lg bg-gray-900 px-2.5 py-1.5',
              'text-xs font-medium text-white shadow-lg',
              'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              className
            )}
          >
            {content}
            <RadixTooltip.Arrow className="fill-gray-900" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
