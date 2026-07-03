import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Calendar, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

const PRESETS = [
  { label: 'Last 7 days',  days: 7  },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
]

export default function DateRangePicker({ onChange }) {
  const [selected, setSelected] = useState(PRESETS[0])
  const [open, setOpen] = useState(false)

  const pick = (preset) => {
    setSelected(preset)
    onChange?.(preset)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 rounded-btn border border-border-default bg-white',
            'px-3 py-2 text-sm font-medium text-text-primary shadow-card',
            'transition-colors hover:bg-gray-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
          )}
        >
          <Calendar size={15} className="text-text-secondary" />
          {selected.label}
          <ChevronDown size={14} className="text-text-secondary" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className={cn(
            'z-50 w-44 rounded-card border border-border-default bg-white p-1.5 shadow-lg',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
          )}
        >
          {PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => pick(p)}
              className={cn(
                'flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-50',
                selected.days === p.days
                  ? 'font-medium text-primary-600'
                  : 'text-text-primary'
              )}
            >
              {p.label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
