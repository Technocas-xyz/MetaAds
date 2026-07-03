import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

const SIZE_CLS = {
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
}

/**
 * <Modal open={open} onOpenChange={setOpen} title="..." size="md">
 *   <Modal.Body>…</Modal.Body>
 *   <Modal.Footer>…</Modal.Footer>
 * </Modal>
 *
 * Or pass header / footer as props:
 *   <Modal footer={<Button>OK</Button>}>…</Modal>
 */
export default function Modal({
  open,
  onOpenChange,
  title,
  description,
  size    = 'md',
  header,
  footer,
  children,
  className,
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            // Mobile: full-width bottom-sheet anchored to screen bottom
            'fixed bottom-0 left-0 right-0 z-50 w-full rounded-t-2xl',
            'sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card',
            'border border-border-default bg-white shadow-xl',
            'flex flex-col max-h-[90vh]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'data-[state=closed]:slide-out-to-bottom sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:zoom-out-95',
            'sm:w-full',
            SIZE_CLS[size] ?? SIZE_CLS.md,
            className
          )}
        >
          {/* Header */}
          {(title || header) && (
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border-default px-6 py-4">
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
          )}

          {/* Body — scrollable */}
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

Modal.Body = function ModalBody({ children, className }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}

Modal.Footer = function ModalFooter({ children, className }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 border-t border-border-default px-6 py-4', className)}>
      {children}
    </div>
  )
}

// Re-export Dialog.Close for use inside modal content
export const ModalClose = Dialog.Close
