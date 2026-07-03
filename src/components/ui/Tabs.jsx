import * as RadixTabs from '@radix-ui/react-tabs'
import { cn } from '../../lib/utils'

/**
 * tabs: Array<{ value, label, badge?, disabled? }>
 *
 * <Tabs tabs={[...]} defaultValue="tab1">
 *   <TabsContent value="tab1">…</TabsContent>
 * </Tabs>
 */
export function Tabs({
  tabs = [],
  defaultValue,
  value,
  onValueChange,
  className,
  children,
  ...rest
}) {
  return (
    <RadixTabs.Root
      defaultValue={defaultValue ?? tabs[0]?.value}
      value={value}
      onValueChange={onValueChange}
      {...rest}
    >
      <RadixTabs.List
        className={cn(
          'flex overflow-x-auto border-b border-border-default scrollbar-hide',
          className
        )}
        aria-label="Tabs"
      >
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={cn(
              'flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5',
              'text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
              'data-[state=active]:border-primary-600 data-[state=active]:text-primary-600',
              'data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary',
              'data-[state=inactive]:hover:text-text-primary',
              'disabled:cursor-not-allowed disabled:opacity-40'
            )}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5',
                  'text-[10px] font-semibold',
                  'bg-gray-100 text-gray-600',
                  'data-[state=active]:bg-primary-100 data-[state=active]:text-primary-700'
                )}
              >
                {tab.badge}
              </span>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  )
}

export const TabsContent = RadixTabs.Content
