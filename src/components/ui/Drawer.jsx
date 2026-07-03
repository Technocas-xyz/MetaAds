import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

const WIDTH_CLS = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-xl',
  xl:   'max-w-2xl',
  full: 'max-w-full',
}

const SIDE_CLS = {
  right: 'right-0 top-0 h-full data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
  left:  'left-0  top-0 h-full data-[state=open]:slide-in-from-left  data-[state=closed]:slide-out-to-left',
  bottom:'bottom-0 left-0 w-full data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
}

/**
 * <Drawer open={open} onOpenChange={setOpen} title="Details" side="right">
 *   <Drawer.Body>…</Drawer.Body>
 *   <Drawer.Footer>…</Drawer.Footer>
 * </Drawer>
 */
export default function Drawer({
  open,
  onOpenChange,
  title,
  description,
  side      = 'right',
  size      = 'md',
  header,
  footer,
  children,
  className,
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed z-50 flex flex-col bg-white shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out duration-200',
            SIDE_CLS[side] ?? SIDE_CLS.right,
            WIDTH_CLS[size] ?? WIDTH_CLS.md,
            'w-full',
            className
          )}
        >
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between border-b border-border-default px-6 py-4">
            {header ?? (
              <div>
                <Dialog.Title className="text-base font-semibold text-text-primary">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-0.5 text-xs text-text-secondary">
                    {description}
                  </Dialog.Description>
                )}
              </div>
            )}
            <Dialog.Close
              aria-label="Close"
              className="ml-auto shrink-0 rounded-md p-1 text-text-tertiary hover:bg-gray-100 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <X size={18} />
            </Dialog.Close>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border-default px-6 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

Drawer.Body = function DrawerBody({ children, className }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}

Drawer.Footer = function DrawerFooter({ children, className }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 border-t border-border-default px-6 py-4', className)}>
      {children}
    </div>
  )
}
