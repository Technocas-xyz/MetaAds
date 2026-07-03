import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  Save, Upload, ImagePlus, Trash2, RefreshCw,
  ChevronDown, Info, Check, X,
} from 'lucide-react'
import Breadcrumb from '../../components/layout/Breadcrumb'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import { useCreateAd } from '../../hooks/queries/useAds'
import { useSubmitToReview } from '../../hooks/queries/useReview'
import { useCompetitors } from '../../hooks/queries/useCompetitors'
import { cn } from '../../lib/utils'

// ── Schema ─────────────────────────────────────────────────────────────────────
const schema = z.object({
  competitor:        z.string().min(1, 'Required'),
  platforms:         z.array(z.enum(['Facebook', 'Instagram', 'TikTok', 'Other'])).min(1, 'Select at least one platform'),
  adUrl:             z.string().url('Enter a valid URL').optional().or(z.literal('')),
  landingUrl:        z.string().url('Enter a valid URL').optional().or(z.literal('')),
  primaryText:       z.string().min(1, 'At least one text field required').max(500, 'Max 500 characters'),
  headline:          z.string().max(120, 'Max 120 characters').optional(),
  cta:               z.string().max(50, 'Max 50 characters').optional(),
  startDate:         z.date({ required_error: 'Start date is required' }),
  endDate:           z.date().optional().nullable(),
  firstSeenDate:     z.date().optional().nullable(),
  notes:             z.string().max(300, 'Max 300 characters').optional(),
  tags:              z.array(z.string()).optional(),
  screenshot:        z.custom((v) => v instanceof File, 'Screenshot required'),
  addToReviewQueue:  z.boolean().default(false),
})

const ALL_PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'Other']
const SUGGESTED_TAGS = ['Pain Point', 'Quality', 'DTF Transfers', 'No Offer', 'Price', 'Urgency', 'Seasonal']

// ── Shared input class ─────────────────────────────────────────────────────────
const INPUT = cn(
  'h-9 w-full rounded-btn border border-border-default bg-white px-3',
  'text-sm text-text-primary placeholder:text-text-tertiary',
  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
  'disabled:opacity-60 transition-colors'
)

// ── Small helpers ──────────────────────────────────────────────────────────────
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

function Card({ title, children, className }) {
  return (
    <div className={cn('rounded-card border border-border-default bg-white shadow-card', className)}>
      {title && (
        <div className="border-b border-border-default px-5 py-4">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Competitor Combobox ────────────────────────────────────────────────────────
function CompetitorCombobox({ value, onChange, competitors, error }) {
  const [query, setQuery] = useState(value ?? '')
  const [open, setOpen]   = useState(false)
  const containerRef      = useRef(null)

  const filtered = competitors.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const select = (name) => {
    onChange(name)
    setQuery(name)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(''); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search competitor…"
        autoComplete="off"
        className={cn(INPUT, error && 'border-danger-400 focus:ring-danger-400')}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-auto rounded-card border border-border-default bg-white py-1 shadow-lg max-h-48">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-text-tertiary">No competitors found</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => select(c.name)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-gray-50"
              >
                <span className="flex-1">{c.name}</span>
                {value === c.name && <Check size={13} className="text-primary-600 flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Platform chips ─────────────────────────────────────────────────────────────
function PlatformChips({ value, onChange, error }) {
  const toggle = (p) => {
    onChange(value.includes(p) ? value.filter((v) => v !== p) : [...value, p])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_PLATFORMS.map((p) => {
        const active = value.includes(p)
        return (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors',
              active
                ? 'bg-primary-600 text-white ring-primary-600'
                : 'bg-white text-text-primary ring-border-default hover:bg-gray-50'
            )}
          >
            {active && <Check size={11} />}
            {p}
          </button>
        )
      })}
      {error && <p className="w-full text-xs text-danger-600">{error}</p>}
    </div>
  )
}

// ── Tags input with creatable chips ───────────────────────────────────────────
function TagsInput({ value = [], onChange }) {
  const [input, setInput] = useState('')

  const add = (tag) => {
    const trimmed = tag.trim()
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed])
    setInput('')
  }

  const remove = (tag) => onChange(value.filter((t) => t !== tag))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
    if (e.key === 'Backspace' && !input && value.length) remove(value[value.length - 1])
  }

  const suggestionsToShow = SUGGESTED_TAGS.filter((t) => !value.includes(t))

  return (
    <div className="space-y-2">
      <div className={cn(
        'flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-btn border border-border-default bg-white px-3 py-1.5',
        'focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-colors'
      )}>
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
            {tag}
            <button type="button" onClick={() => remove(tag)} className="rounded-full hover:bg-primary-200">
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => input && add(input)}
          placeholder={value.length === 0 ? 'Add tags…' : ''}
          className="min-w-[80px] flex-1 border-none bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />
      </div>
      {suggestionsToShow.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestionsToShow.slice(0, 5).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange([...value, tag])}
              className="rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-xs text-text-secondary hover:border-primary-400 hover:text-primary-600 transition-colors"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Date input via Controller ─────────────────────────────────────────────────
function DateField({ control, name, label, required, error }) {
  return (
    <div>
      <Label htmlFor={name} required={required}>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input
            id={name}
            type="date"
            value={field.value ? (field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value) : ''}
            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
            className={cn(INPUT, error && 'border-danger-400 focus:ring-danger-400')}
          />
        )}
      />
      <FieldError message={error} />
    </div>
  )
}

// ── File size formatter ────────────────────────────────────────────────────────
function fmtBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ── Dropzone + guidelines + metadata ──────────────────────────────────────────
function ScreenshotCard({ value, onChange, onClearError, error }) {
  const [isDragging, setIsDragging]         = useState(false)
  const [preview, setPreview]               = useState(null)
  const [meta, setMeta]                     = useState(null)
  const [metaOpen, setMetaOpen]             = useState(false)
  const fileInputRef                         = useRef(null)

  const processFile = useCallback(async (file) => {
    if (!file) return
    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) { toast.error('Only PNG, JPG or WebP accepted'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('File exceeds 10 MB limit'); return }

    onChange(file)
    onClearError?.()

    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)

    try {
      const bmp = await createImageBitmap(file)
      setMeta({
        width:      bmp.width,
        height:     bmp.height,
        type:       file.type.split('/')[1].toUpperCase(),
        size:       fmtBytes(file.size),
        capturedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      })
      bmp.close()
    } catch {
      setMeta({ type: file.type.split('/')[1].toUpperCase(), size: fmtBytes(file.size), capturedAt: new Date().toLocaleString() })
    }
  }, [onChange, onClearError])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleReplace = () => {
    setPreview(null)
    setMeta(null)
    onChange(undefined)
    fileInputRef.current.value = ''
    fileInputRef.current.click()
  }

  const handleRemove = () => {
    setPreview(null)
    setMeta(null)
    onChange(undefined)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card title="Ad Screenshot">
        {!preview ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-10 transition-colors',
              isDragging
                ? 'border-primary-400 bg-primary-50'
                : error
                  ? 'border-danger-300 bg-danger-50 hover:border-danger-400'
                  : 'border-border-default bg-gray-50 hover:border-primary-400 hover:bg-primary-50/50'
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border-default">
              <ImagePlus size={22} className="text-text-secondary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary">Drop screenshot here</p>
              <p className="mt-0.5 text-xs text-text-secondary">or click to browse</p>
              <p className="mt-1 text-[11px] text-text-tertiary">PNG, JPG, WebP · max 10 MB</p>
            </div>
            {error && <p className="text-xs font-medium text-danger-600">{error}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-border-default bg-gray-50">
              <img src={preview} alt="Screenshot preview" className="w-full object-contain max-h-72" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-text-primary">{value?.name}</p>
                <p className="text-[11px] text-text-tertiary">{meta?.size}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleReplace}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary ring-1 ring-border-default hover:bg-gray-50"
                >
                  <RefreshCw size={11} /> Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-danger-600 ring-1 ring-danger-200 hover:bg-danger-50"
                >
                  <Trash2 size={11} /> Remove
                </button>
              </div>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => processFile(e.target.files?.[0])}
          className="hidden"
        />
      </Card>

      {/* Guidelines */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-2.5">
          <Info size={15} className="mt-0.5 flex-shrink-0 text-blue-600" />
          <div>
            <p className="text-xs font-semibold text-blue-800">Screenshot Guidelines</p>
            <ul className="mt-1.5 space-y-1 text-[11px] text-blue-700">
              <li>• Capture the full ad including all visible elements</li>
              <li>• Make text readable — min 72 dpi recommended</li>
              <li>• Include brand logos and CTA buttons</li>
              <li>• Supported formats: PNG, JPG, WebP</li>
              <li>• Maximum file size: 10 MB</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Metadata expandable */}
      {meta && (
        <div className="rounded-card border border-border-default bg-white shadow-card">
          <button
            type="button"
            onClick={() => setMetaOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-text-primary hover:bg-gray-50/60"
          >
            Metadata (Auto Captured)
            <ChevronDown size={15} className={cn('text-text-secondary transition-transform', metaOpen && 'rotate-180')} />
          </button>
          {metaOpen && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border-default px-4 py-3">
              {meta.width && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Resolution</p>
                  <p className="text-sm text-text-primary">{meta.width} × {meta.height} px</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">File Type</p>
                <p className="text-sm text-text-primary">{meta.type}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">File Size</p>
                <p className="text-sm text-text-primary">{meta.size}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Captured At</p>
                <p className="text-sm text-text-primary">{meta.capturedAt}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AddNewAdPage() {
  const navigate     = useNavigate()
  const { data: competitorsData } = useCompetitors()
  const competitors  = competitorsData?.data ?? []

  const createAd       = useCreateAd()
  const submitToReview = useSubmitToReview()

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      platforms:        ['Facebook', 'Instagram'],
      tags:             [],
      addToReviewQueue: false,
    },
  })

  const primaryText = watch('primaryText') ?? ''
  const notes       = watch('notes') ?? ''
  const platforms   = watch('platforms') ?? []
  const tags        = watch('tags') ?? []
  const screenshot  = watch('screenshot')

  const onSubmit = async (data) => {
    const fd = new FormData()
    fd.append('competitor',  data.competitor)
    fd.append('platforms',   JSON.stringify(data.platforms))
    if (data.adUrl)          fd.append('ad_url',        data.adUrl)
    if (data.landingUrl)     fd.append('landing_url',   data.landingUrl)
    fd.append('primary_text', data.primaryText)
    if (data.headline)       fd.append('headline',      data.headline)
    if (data.cta)            fd.append('cta',           data.cta)
    fd.append('start_date',  data.startDate.toISOString())
    if (data.endDate)        fd.append('end_date',      data.endDate.toISOString())
    if (data.firstSeenDate)  fd.append('first_seen_date', data.firstSeenDate.toISOString())
    if (data.notes)          fd.append('notes',         data.notes)
    if (data.tags?.length)   fd.append('tags',          JSON.stringify(data.tags))
    fd.append('screenshot',  data.screenshot)

    createAd.mutate(fd, {
      onSuccess: async (newAd) => {
        toast.success('Ad saved successfully')
        if (data.addToReviewQueue && newAd?.id) {
          try {
            await submitToReview.mutateAsync({ id: newAd.id, reason: 'manual_review' })
          } catch {
            toast.error('Ad saved but failed to add to review queue')
          }
        }
        navigate(`/ads`)
      },
      onError: () => toast.error('Failed to save ad'),
    })
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Dashboard',    to: '/dashboard' },
        { label: 'Ads Library',  to: '/ads' },
        { label: 'Add New Ad' },
      ]} />

      {/* Page header */}
      <PageHeader
        title="Add New Competitor Ad"
        subtitle="Manually upload and capture ad details for analysis"
        rightSlot={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/ads')}>Cancel</Button>
            <Button
              variant="primary"
              icon={Save}
              type="submit"
              form="add-ad-form"
              loading={isSubmitting || createAd.isPending}
            >
              Save Ad
            </Button>
          </div>
        }
      />

      <form id="add-ad-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ── Screenshot column (top on mobile, right on desktop) ── */}
          <div className="lg:col-start-3 lg:row-start-1">
            <ScreenshotCard
              value={screenshot}
              onChange={(file) => setValue('screenshot', file, { shouldValidate: true })}
              onClearError={() => clearErrors('screenshot')}
              error={errors.screenshot?.message}
            />
          </div>

          {/* ── Form column (below screenshot on mobile, left on desktop) ── */}
          <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1">
            <Card title="Ad Information">
              <div className="space-y-5">

                {/* Competitor */}
                <div>
                  <Label htmlFor="competitor" required>Competitor</Label>
                  <Controller
                    name="competitor"
                    control={control}
                    render={({ field }) => (
                      <CompetitorCombobox
                        value={field.value}
                        onChange={field.onChange}
                        competitors={competitors}
                        error={errors.competitor?.message}
                      />
                    )}
                  />
                  <FieldError message={errors.competitor?.message} />
                </div>

                {/* Platforms */}
                <div>
                  <Label required>Platform</Label>
                  <Controller
                    name="platforms"
                    control={control}
                    render={({ field }) => (
                      <PlatformChips
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.platforms?.message}
                      />
                    )}
                  />
                </div>

                {/* Ad URL + Landing URL */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="adUrl">Ad URL</Label>
                    <input
                      id="adUrl"
                      type="url"
                      {...register('adUrl')}
                      placeholder="https://…"
                      className={cn(INPUT, errors.adUrl && 'border-danger-400 focus:ring-danger-400')}
                    />
                    <FieldError message={errors.adUrl?.message} />
                  </div>
                  <div>
                    <Label htmlFor="landingUrl">Landing Page URL</Label>
                    <input
                      id="landingUrl"
                      type="url"
                      {...register('landingUrl')}
                      placeholder="https://…"
                      className={cn(INPUT, errors.landingUrl && 'border-danger-400 focus:ring-danger-400')}
                    />
                    <FieldError message={errors.landingUrl?.message} />
                  </div>
                </div>

                {/* Primary Text */}
                <div>
                  <div className="mb-1.5 flex items-end justify-between">
                    <Label htmlFor="primaryText" required>Primary Text</Label>
                    <span className={cn('text-xs', primaryText.length > 480 ? 'text-danger-600' : 'text-text-tertiary')}>
                      {primaryText.length}/500
                    </span>
                  </div>
                  <textarea
                    id="primaryText"
                    {...register('primaryText')}
                    rows={4}
                    placeholder="Ad copy / primary text…"
                    className={cn(
                      'w-full resize-none rounded-btn border border-border-default bg-white px-3 py-2',
                      'text-sm text-text-primary placeholder:text-text-tertiary',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                      'transition-colors',
                      errors.primaryText && 'border-danger-400 focus:ring-danger-400'
                    )}
                  />
                  <FieldError message={errors.primaryText?.message} />
                </div>

                {/* Headline + CTA */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="headline">Headline</Label>
                    <input
                      id="headline"
                      {...register('headline')}
                      placeholder="Ad headline…"
                      className={cn(INPUT, errors.headline && 'border-danger-400 focus:ring-danger-400')}
                    />
                    <FieldError message={errors.headline?.message} />
                  </div>
                  <div>
                    <Label htmlFor="cta">CTA (Call To Action)</Label>
                    <input
                      id="cta"
                      {...register('cta')}
                      placeholder="e.g. Shop Now"
                      className={cn(INPUT, errors.cta && 'border-danger-400 focus:ring-danger-400')}
                    />
                    <FieldError message={errors.cta?.message} />
                  </div>
                </div>

                {/* Dates — 3-col sub-grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <DateField
                    control={control}
                    name="startDate"
                    label="Start Date"
                    required
                    error={errors.startDate?.message}
                  />
                  <DateField
                    control={control}
                    name="endDate"
                    label="End Date"
                    error={errors.endDate?.message}
                  />
                  <DateField
                    control={control}
                    name="firstSeenDate"
                    label="First Seen Date"
                    error={errors.firstSeenDate?.message}
                  />
                </div>

                {/* Notes */}
                <div>
                  <div className="mb-1.5 flex items-end justify-between">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <span className={cn('text-xs', notes.length > 280 ? 'text-danger-600' : 'text-text-tertiary')}>
                      {notes.length}/300
                    </span>
                  </div>
                  <textarea
                    id="notes"
                    {...register('notes')}
                    rows={2}
                    placeholder="Internal notes about this ad…"
                    className={cn(
                      'w-full resize-none rounded-btn border border-border-default bg-white px-3 py-2',
                      'text-sm text-text-primary placeholder:text-text-tertiary',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                      'transition-colors'
                    )}
                  />
                </div>

                {/* Tags */}
                <div>
                  <Label>Ad Tags (Optional)</Label>
                  <Controller
                    name="tags"
                    control={control}
                    render={({ field }) => (
                      <TagsInput value={field.value ?? []} onChange={field.onChange} />
                    )}
                  />
                  <p className="mt-1 text-[11px] text-text-tertiary">Press Enter or comma to add. Click suggestions to add quickly.</p>
                </div>

                {/* Add to review queue */}
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                  <Controller
                    name="addToReviewQueue"
                    control={control}
                    render={({ field }) => (
                      <button
                        type="button"
                        id="addToReviewQueue"
                        role="checkbox"
                        aria-checked={field.value}
                        onClick={() => field.onChange(!field.value)}
                        className={cn(
                          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                          field.value
                            ? 'border-primary-600 bg-primary-600'
                            : 'border-gray-300 bg-white'
                        )}
                      >
                        {field.value && <Check size={10} className="text-white" strokeWidth={3} />}
                      </button>
                    )}
                  />
                  <label htmlFor="addToReviewQueue" className="cursor-pointer select-none text-sm text-text-primary">
                    Add to review queue after saving
                  </label>
                </div>

              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
