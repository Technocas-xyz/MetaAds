import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Link2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCreateCompetitor } from '../../../hooks/queries/useCompetitors'
import Button from '../../../components/ui/Button'
import { cn } from '../../../lib/utils'

/**
 * Parse a Meta Ad Library URL to extract page_id or query.
 * Returns { page_id, query, query_type } or null if invalid.
 */
function parseMetaUrl(url) {
  try {
    const parsed = new URL(url)
    const params = parsed.searchParams

    const pageId = params.get('view_all_page_id')
    if (pageId) {
      return { page_id: pageId, query: null, query_type: 'page_id' }
    }

    const q = params.get('q')
    if (q) {
      return { page_id: null, query: q, query_type: 'keyword' }
    }

    return null
  } catch {
    return null
  }
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  meta_ad_library_url: z.string().min(1, 'Meta Ad Library URL is required').refine(
    (url) => parseMetaUrl(url) !== null,
    'URL must contain view_all_page_id=... or q=...'
  ),
  priority_tier: z.enum(['High', 'Medium', 'Low']),
  niche: z.string().optional(),
  tags: z.string().optional(),
})

function FieldError({ message }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-danger-600">{message}</p>
}

function Label({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-text-primary">
      {children}
      {required && <span className="ml-0.5 text-danger-500">*</span>}
    </label>
  )
}

const INPUT = cn(
  'h-9 w-full rounded-btn border border-border-default bg-white px-3',
  'text-sm text-text-primary placeholder:text-text-tertiary',
  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
  'disabled:opacity-60'
)

export default function AddCompetitorModal({ open, onOpenChange }) {
  const [parsedUrl, setParsedUrl] = useState(null)

  const { mutate, isPending } = useCreateCompetitor({
    onSuccess: () => {
      toast.success('Competitor added successfully')
      onOpenChange(false)
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || 'Failed to add competitor'
      toast.error(msg)
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { priority_tier: 'Medium', niche: '', tags: '' },
  })

  // Watch the URL field to show parsed result
  const urlValue = watch('meta_ad_library_url')
  const currentParsed = urlValue ? parseMetaUrl(urlValue) : null

  const onSubmit = (data) => {
    const parsed = parseMetaUrl(data.meta_ad_library_url)
    if (!parsed) return

    const payload = {
      name: data.name,
      meta_ad_library_url: data.meta_ad_library_url,
      page_id: parsed.page_id,
      query: parsed.query,
      query_type: parsed.query_type,
      niches: data.niche ? data.niche.split(',').map((s) => s.trim()).filter(Boolean) : ['DTF', 'Print-on-Demand'],
      priority_tier: data.priority_tier,
    }

    mutate(payload)
  }

  const handleClose = () => {
    onOpenChange(false)
    reset()
    setParsedUrl(null)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
            'rounded-card border border-border-default bg-white shadow-xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'max-h-[90vh] overflow-y-auto'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-text-primary">
                Add Competitor
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-text-secondary">
                Paste the Meta Ad Library URL to start tracking a competitor.
              </Dialog.Description>
            </div>
            <button
              onClick={handleClose}
              className="rounded-md p-1 text-text-tertiary hover:bg-gray-100 hover:text-text-primary"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 py-5">
            {/* Name */}
            <div>
              <Label htmlFor="name" required>Competitor Name</Label>
              <input
                id="name"
                {...register('name')}
                placeholder="e.g. Bear Transfers Print Center"
                className={cn(INPUT, errors.name && 'border-danger-400 focus:ring-danger-400')}
              />
              <FieldError message={errors.name?.message} />
            </div>

            {/* Meta Ad Library URL */}
            <div>
              <Label htmlFor="meta_ad_library_url" required>Meta Ad Library URL</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  id="meta_ad_library_url"
                  {...register('meta_ad_library_url')}
                  placeholder="https://www.facebook.com/ads/library/?...&view_all_page_id=..."
                  className={cn(
                    INPUT,
                    'pl-9',
                    errors.meta_ad_library_url && 'border-danger-400 focus:ring-danger-400'
                  )}
                />
              </div>
              <p className="mt-1 text-[10px] text-text-tertiary">
                Open the brand on Meta Ad Library, copy the page URL — we'll pull the page ID automatically.
              </p>
              <FieldError message={errors.meta_ad_library_url?.message} />

              {/* Parsed result confirmation */}
              {currentParsed && (
                <div className="mt-2 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <span className="text-xs text-green-700">
                    {currentParsed.query_type === 'page_id'
                      ? `Page ID detected: ${currentParsed.page_id}`
                      : `Keyword detected: "${currentParsed.query}"`}
                  </span>
                </div>
              )}
            </div>

            {/* Niche + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="niche">Niche</Label>
                <input
                  id="niche"
                  {...register('niche')}
                  placeholder="e.g. DTF, Custom Printing"
                  className={INPUT}
                />
                <p className="mt-1 text-[10px] text-text-tertiary">Comma-separate multiple</p>
              </div>
              <div>
                <Label htmlFor="priority_tier">Priority</Label>
                <select
                  id="priority_tier"
                  {...register('priority_tier')}
                  className={cn(INPUT, 'appearance-none cursor-pointer')}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label htmlFor="tags">Tags</Label>
              <input
                id="tags"
                {...register('tags')}
                placeholder="e.g. direct competitor, DTF"
                className={INPUT}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-border-default pt-4">
              <Button variant="outline" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                Add Competitor
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
