import toast from 'react-hot-toast'
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react'

/**
 * Convenience wrappers around react-hot-toast.
 *
 * Usage:
 *   import { toastSuccess, toastError, toastInfo, toastWarning } from './Toast'
 *   toastSuccess('Saved!')
 *   toastError('Something went wrong', { duration: 6000 })
 *
 * The Toaster itself should be placed once at app root (already handled by
 * react-hot-toast's <Toaster> in App.jsx or main.jsx).
 */

function ToastContent({ icon, message }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

export function toastSuccess(message, opts = {}) {
  return toast.success(
    <ToastContent
      icon={<CheckCircle2 size={16} className="shrink-0 text-success-600" />}
      message={message}
    />,
    { duration: 3000, ...opts }
  )
}

export function toastError(message, opts = {}) {
  return toast.error(
    <ToastContent
      icon={<XCircle size={16} className="shrink-0 text-danger-600" />}
      message={message}
    />,
    { duration: 5000, ...opts }
  )
}

export function toastInfo(message, opts = {}) {
  return toast(
    <ToastContent
      icon={<Info size={16} className="shrink-0 text-blue-600" />}
      message={message}
    />,
    { duration: 4000, ...opts }
  )
}

export function toastWarning(message, opts = {}) {
  return toast(
    <ToastContent
      icon={<AlertCircle size={16} className="shrink-0 text-warning-600" />}
      message={message}
    />,
    {
      duration: 4000,
      style: { borderLeft: '3px solid #F59E0B' },
      ...opts,
    }
  )
}

// Re-export raw toast for custom usage
export { toast }
