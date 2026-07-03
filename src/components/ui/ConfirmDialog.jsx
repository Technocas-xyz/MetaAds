import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import Button from './Button'

const VARIANT_META = {
  danger:  { icon: Trash2,         iconBg: 'bg-danger-50',  iconColor: 'text-danger-600',  confirmVariant: 'danger'  },
  warning: { icon: AlertTriangle,  iconBg: 'bg-warning-50', iconColor: 'text-warning-600', confirmVariant: 'warning' },
  default: { icon: AlertTriangle,  iconBg: 'bg-primary-50', iconColor: 'text-primary-600', confirmVariant: 'primary' },
}

/**
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Delete campaign?"
 *   description="This action cannot be undone."
 *   confirmText="Delete"
 *   variant="danger"
 *   onConfirm={() => { deleteCampaign(id); setOpen(false) }}
 * />
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title        = 'Are you sure?',
  description,
  confirmText  = 'Confirm',
  cancelText   = 'Cancel',
  variant      = 'danger',
  loading      = false,
  onConfirm,
  className,
}) {
  const meta    = VARIANT_META[variant] ?? VARIANT_META.default
  const Icon    = meta.icon

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-card border border-border-default bg-white shadow-xl p-6',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            className
          )}
          aria-describedby={description ? 'confirm-desc' : undefined}
        >
          <div className="flex gap-4">
            {/* Icon */}
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', meta.iconBg)}>
              <Icon size={18} className={meta.iconColor} aria-hidden="true" />
            </div>

            {/* Text */}
            <div className="flex-1">
              <Dialog.Title className="text-base font-semibold text-text-primary">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description
                  id="confirm-desc"
                  className="mt-1.5 text-sm text-text-secondary"
                >
                  {description}
                </Dialog.Description>
              )}
            </div>

            {/* Close X */}
            <Dialog.Close
              aria-label="Cancel"
              className="ml-auto shrink-0 self-start rounded-md p-1 text-text-tertiary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <X size={16} />
            </Dialog.Close>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm">{cancelText}</Button>
            </Dialog.Close>
            <Button
              variant={meta.confirmVariant}
              size="sm"
              loading={loading}
              onClick={() => { onConfirm?.(); }}
            >
              {confirmText}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
