import { Brain, Send, Download, Trash2, X } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { cn } from '../../../lib/utils'

export default function BulkActionBar({ count, onAnalyze, onReview, onExport, onDelete, onClear }) {
  if (!count) return null

  return (
    <div className={cn(
      'flex flex-wrap items-center gap-3 rounded-card border border-primary-200',
      'bg-primary-50 px-4 py-3 shadow-card'
    )}>
      <span className="text-sm font-medium text-primary-700">
        {count} ad{count !== 1 ? 's' : ''} selected
      </span>

      <div className="h-4 w-px bg-primary-200" />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" icon={Brain} size="sm" onClick={onAnalyze}>
          Analyze Selected
        </Button>
        <Button variant="outline" icon={Send} size="sm" onClick={onReview}>
          Send to Review
        </Button>
        <Button variant="outline" icon={Download} size="sm" onClick={onExport}>
          Export
        </Button>
        <Button variant="danger" icon={Trash2} size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>

      <button
        onClick={onClear}
        className="ml-auto rounded-md p-1 text-primary-500 hover:bg-primary-100 hover:text-primary-700 focus-visible:outline-none"
        aria-label="Clear selection"
      >
        <X size={16} />
      </button>
    </div>
  )
}
