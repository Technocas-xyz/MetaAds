import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, ArrowLeft, SkipForward, RefreshCw,
  AlertTriangle, Save, CheckCircle2, MessageSquare, Tag, Compass,
  Gift, DollarSign, Layout, Package, Users, Star, Info, Play,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfidenceBadge from '../../components/ui/ConfidenceBadge'
import { useReviewItem, useUpdateReview, useApproveReview } from '../../hooks/queries/useReview'
import { useAnalyzeAd } from '../../hooks/queries/useAI'
import { getConfidenceLevel } from '../../lib/confidence'
import { HOOK_TYPES, ANGLES, OFFER_TYPES } from '../../lib/constants'
import useUIStore from '../../store/useUIStore'
import { cn } from '../../lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PLATFORM_COLOR = {
  Facebook:  'bg-blue-500',
  Instagram: 'bg-pink-500',
  TikTok:    'bg-gray-900',
  YouTube:   'bg-red-500',
}

const REASON_BADGE = {
  low_confidence: 'amber',
  missing_info:   'blue',
  flagged_by_rule:'red',
}

const CREATIVE_FORMATS  = ['Static Image', 'Video', 'Short Video', 'Carousel', 'Story', 'Reel']
const PRODUCT_LINES     = ['DTF Transfers', 'Screen Print', 'Sublimation', 'Embroidery', 'Other']
const AUDIENCE_TYPES    = ['Small Business Owners', 'Print-on-Demand Sellers', 'Retail Brands', 'Hobbyists', 'Event Organizers', 'Other']

// ── Card ───────────────────────────────────────────────────────────────────────
function Card({ title, subtitle, headerRight, children, className }) {
  return (
    <div className={cn('rounded-card border border-border-default bg-white shadow-card', className)}>
      {(title || headerRight) && (
        <div className="flex items-start justify-between gap-3 border-b border-border-default px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>}
          </div>
          {headerRight}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Info row (2-col grid inside Basic Information) ─────────────────────────────
function InfoRow({ label, value, mono = false, colSpan = false }) {
  return (
    <div className={cn(colSpan && 'col-span-2')}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</p>
      <div className={cn('mt-0.5 text-sm text-text-primary break-all', mono && 'font-mono text-xs')}>{value ?? '—'}</div>
    </div>
  )
}

// ── Raw content field ──────────────────────────────────────────────────────────
function RawField({ label, value, multiline = false }) {
  if (!value) return null
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={cn('text-sm text-text-primary', multiline ? 'whitespace-pre-wrap leading-relaxed' : 'leading-snug')}>
        {value}
      </p>
    </div>
  )
}

// ── AI Extracted Results row ───────────────────────────────────────────────────
const INSIGHT_META = [
  { key: 'hook',            label: 'Hook',            icon: MessageSquare },
  { key: 'hook_type',       label: 'Hook Type',       icon: Tag           },
  { key: 'angle',           label: 'Angle',           icon: Compass       },
  { key: 'offer_type',      label: 'Offer Type',      icon: Gift          },
  { key: 'offer_value',     label: 'Offer Value',     icon: DollarSign    },
  { key: 'creative_format', label: 'Creative Format', icon: Layout        },
  { key: 'product_line',    label: 'Product Line',    icon: Package       },
  { key: 'audience_type',   label: 'Audience Type',   icon: Users         },
  { key: 'usp_detected',    label: 'USP Detected',    icon: Star          },
]

function AIInsightRow({ meta, data }) {
  const Icon  = meta.icon
  const level = getConfidenceLevel(data?.confidence ?? 0)
  const isLow = level === 'Low'
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg py-2 px-3 transition-colors',
      isLow ? 'border-l-2 border-danger-400 bg-danger-50/40' : 'border-l-2 border-transparent'
    )}>
      <Icon size={13} className="flex-shrink-0 text-text-tertiary" />
      <span className="w-28 flex-shrink-0 text-xs font-medium text-text-secondary">{meta.label}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-text-primary" title={data?.value}>{data?.value ?? '—'}</span>
      <div className="flex flex-shrink-0 items-center gap-1">
        <ConfidenceBadge score={data?.confidence} />
        <button type="button" className="text-text-tertiary hover:text-text-secondary" title={`${data?.confidence ?? 0}% confidence`}>
          <Info size={11} />
        </button>
      </div>
    </div>
  )
}

// ── Evidence sources ───────────────────────────────────────────────────────────
const EVIDENCE_SOURCES = [
  { key: 'primary_text', label: 'Primary Text'  },
  { key: 'headline',     label: 'Headline'       },
  { key: 'cta',          label: 'CTA'            },
  { key: 'landing_page', label: 'Landing Page'   },
  { key: 'visual',       label: 'Visual / Image' },
]

// ── Form helpers ───────────────────────────────────────────────────────────────
function FormLabel({ label, counter }) {
  return (
    <div className="mb-1 flex items-center justify-between">
      <label className="text-xs font-medium text-text-primary">{label}</label>
      {counter && <span className="text-[10px] text-text-tertiary">{counter}</span>}
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary transition-colors focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-300'
const selectCls = cn(inputCls, 'cursor-pointer appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")] bg-[right_10px_center] bg-no-repeat pr-8')

function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

// ── Action button with subtitle ────────────────────────────────────────────────
function ActionBtn({ variant, icon: Icon, subtitle, children, loading, disabled, onClick, size = 'sm' }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Button variant={variant} size={size} icon={Icon} loading={loading} disabled={disabled} onClick={onClick}>
        {children}
      </Button>
      {subtitle && (
        <span className="whitespace-nowrap text-[10px] text-text-tertiary">{subtitle}</span>
      )}
    </div>
  )
}

// ── Sticky action bar ──────────────────────────────────────────────────────────
function StickyActionBar({ onSkip, onRerun, onMarkLowConf, onSaveNext, onApprove, saving, approving, rerunning }) {
  const { sidebarCollapsed } = useUIStore()
  return (
    <div className={cn(
      'fixed inset-x-0 bottom-0 z-30 border-t border-border-default bg-white/95 shadow-lg backdrop-blur-sm',
      'transition-all duration-200',
      sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-60'
    )}>
      <div className="flex flex-wrap items-end justify-end gap-3 px-5 py-3 sm:flex-nowrap">
        <ActionBtn variant="ghost" icon={SkipForward} subtitle="Not enough info" onClick={onSkip}>
          Skip
        </ActionBtn>
        <ActionBtn variant="ghost" icon={RefreshCw} subtitle="Re-analyze this ad" loading={rerunning} onClick={onRerun}>
          Re-run AI
        </ActionBtn>
        <div className="hidden h-8 w-px bg-border-default sm:block" />
        <ActionBtn variant="warning" icon={AlertTriangle} subtitle="Keep for now" onClick={onMarkLowConf}>
          Mark as Low Confidence
        </ActionBtn>
        <ActionBtn variant="outline" icon={Save} subtitle="Save and continue" loading={saving} onClick={onSaveNext}>
          Save &amp; Review Next
        </ActionBtn>
        <ActionBtn variant="success" icon={CheckCircle2} subtitle="Approve and publish" loading={approving} onClick={onApprove}>
          Approve &amp; Publish
        </ActionBtn>
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-5 pb-24">
      <div className="h-4 w-64 animate-pulse rounded bg-gray-200" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-72 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-8 animate-pulse rounded-btn bg-gray-200" />
          <div className="h-9 w-24 animate-pulse rounded-btn bg-gray-200" />
          <div className="h-9 w-8 animate-pulse rounded-btn bg-gray-200" />
          <div className="h-9 w-32 animate-pulse rounded-btn bg-gray-200" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-5">
            {[280, 200, 160].map((h, j) => (
              <div key={j} className="animate-pulse rounded-card border border-border-default bg-white p-5 shadow-card">
                <div className="mb-4 h-4 w-28 rounded bg-gray-200" />
                <div className="rounded-lg bg-gray-100" style={{ height: h }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ManualReviewPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()

  const { data: item, isLoading } = useReviewItem(id)
  const updateReview  = useUpdateReview()
  const approveReview = useApproveReview()
  const analyzeAd     = useAnalyzeAd()

  const [form, setForm] = useState({
    hook: '', hook_type: '', angle: '', offer_type: '', offer_value: '',
    creative_format: '', product_line: '', audience_type: '', usp: '', notes: '',
  })
  const [isDirty, setIsDirty] = useState(false)
  const initializedFor = useRef(null)

  // Populate form when item loads or id changes
  useEffect(() => {
    if (!item || item.id === initializedFor.current) return
    initializedFor.current = item.id
    const ins = item.ai_insights ?? {}
    setForm({
      hook:            ins.hook?.value            ?? '',
      hook_type:       ins.hook_type?.value       ?? '',
      angle:           ins.angle?.value           ?? '',
      offer_type:      ins.offer_type?.value      ?? '',
      offer_value:     ins.offer_value?.value     ?? '',
      creative_format: ins.creative_format?.value ?? '',
      product_line:    ins.product_line?.value    ?? '',
      audience_type:   ins.audience_type?.value   ?? '',
      usp:             ins.usp_detected?.value    ?? '',
      notes:           '',
    })
    setIsDirty(false)
  }, [item])

  // Warn before unload when dirty
  useEffect(() => {
    if (!isDirty) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const setField = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }))
    setIsDirty(true)
  }

  const buildPayload = () => ({
    hook_text:       form.hook,
    hook_type:       form.hook_type,
    angle:           form.angle,
    offer_type:      form.offer_type,
    offer_value:     form.offer_value,
    creative_format: form.creative_format,
    product_line:    form.product_line,
    audience_type:   form.audience_type,
    usp:             form.usp,
    review_notes:    form.notes,
  })

  const handleSaveNext = () => {
    updateReview.mutate({ id, ...buildPayload() }, {
      onSuccess: () => {
        toast.success('Saved successfully')
        setIsDirty(false)
        if (item?.next_id) navigate(`/review/${item.next_id}`)
        else navigate('/review')
      },
      onError: () => toast.error('Save failed — try again'),
    })
  }

  const handleApprove = () => {
    updateReview.mutate({ id, ...buildPayload() }, {
      onSuccess: () => {
        approveReview.mutate({ id }, {
          onSuccess: () => {
            toast.success('Approved & published')
            setIsDirty(false)
            navigate('/review')
          },
          onError: () => toast.error('Approval failed — try again'),
        })
      },
      onError: () => toast.error('Save failed — try again'),
    })
  }

  const handleSkip = () => {
    if (item?.next_id) navigate(`/review/${item.next_id}`)
    else navigate('/review')
  }

  const handleRerun = () => {
    analyzeAd.mutate(id, {
      onSuccess: () => toast.success('AI re-analysis complete'),
      onError:   () => toast.error('Re-analysis failed — try again'),
    })
  }

  const handleMarkLowConf = () => {
    updateReview.mutate({ id, status: 'low_confidence' }, {
      onSuccess: () => toast.success('Marked as low confidence'),
    })
  }

  if (isLoading) return <Skeleton />

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-text-primary">Review item not found</p>
        <p className="mt-1 text-sm text-text-secondary">This item may have been removed or already processed.</p>
        <Link to="/review" className="mt-4 text-sm font-medium text-primary-600 hover:underline">← Back to Review Queue</Link>
      </div>
    )
  }

  const overallConf  = item.ai_insights?.overall ?? item.confidence_score ?? 0
  const overallLevel = getConfidenceLevel(overallConf)
  const confBadgeColor = overallLevel === 'High' ? 'green' : overallLevel === 'Medium' ? 'amber' : 'red'
  const reasonColor  = REASON_BADGE[item.reason] ?? 'gray'
  const ad           = item.ad ?? {}

  return (
    <div className="space-y-5 pb-24">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Dashboard',    to: '/dashboard' },
        { label: 'Review Queue', to: '/review'    },
        { label: 'Ad Review'                       },
      ]} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-text-primary">Manual Review</h1>
            <Badge color={reasonColor}>{item.reason_label}</Badge>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Review and validate AI extracted data. Make corrections if needed.
          </p>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
          <Button
            variant="ghost" size="sm" icon={ChevronLeft}
            disabled={!item.prev_id}
            onClick={() => navigate(`/review/${item.prev_id}`)}
          />
          <span className="px-1 text-sm font-medium text-text-secondary whitespace-nowrap">
            Ad {item.position} of {item.total}
          </span>
          <Button
            variant="ghost" size="sm" icon={ChevronRight}
            disabled={!item.next_id}
            onClick={() => navigate(`/review/${item.next_id}`)}
          />
          <Button variant="outline" size="sm" icon={ArrowLeft} to="/review">
            Back to Queue
          </Button>
        </div>
      </div>

      {/* Three-column grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* ── LEFT: Ad Preview + Basic Info + Raw Content ─────────────────── */}
        <div className="space-y-5">

          {/* Ad Preview */}
          <Card title="Ad Preview">
            <div className="overflow-hidden rounded-lg border border-border-default bg-gray-50">
              {ad.is_video ? (
                <div className="relative flex aspect-[4/3] items-center justify-center bg-gray-900">
                  <img src={ad.media_url} alt={ad.headline} className="h-full w-full object-cover opacity-50" />
                  <div className="absolute flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
                    <Play size={20} className="ml-0.5 fill-primary-600 text-primary-600" />
                  </div>
                </div>
              ) : (
                <img src={ad.media_url} alt={ad.headline} className="max-h-72 w-full object-contain" />
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-full', PLATFORM_COLOR[ad.platform] ?? 'bg-gray-400')} />
                <span className="text-sm font-medium text-text-primary">{ad.platform} Ad</span>
              </div>
              <span className="text-text-tertiary">·</span>
              <span className="text-xs text-text-secondary">Seen: {fmtDate(ad.first_seen)}</span>
              <span className="text-text-tertiary">·</span>
              <Badge color="green">Active</Badge>
            </div>
          </Card>

          {/* Basic Information */}
          <Card title="Basic Information">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <InfoRow label="Competitor"      value={item.competitor?.name} />
              <InfoRow label="Platform"        value={ad.platform} />
              <InfoRow label="Ad ID (Library)" value={ad.ad_library_id} mono />
              <InfoRow label="Status"          value={<Badge color="green">Active</Badge>} />
              <InfoRow
                label="Ad URL"
                value={
                  ad.ad_url && ad.ad_url !== '#'
                    ? <a href={ad.ad_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:underline">View Ad <ExternalLink size={11} /></a>
                    : <span className="text-text-tertiary">—</span>
                }
              />
              <InfoRow
                label="Landing Page"
                value={
                  ad.landing_page && ad.landing_page !== '#'
                    ? <a href={ad.landing_page} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:underline">Open <ExternalLink size={11} /></a>
                    : <span className="text-text-tertiary">—</span>
                }
              />
              <InfoRow label="First Seen" value={fmtDate(ad.first_seen)} />
              <InfoRow label="Last Seen"  value={fmtDate(ad.last_seen)} />
              <InfoRow label="Duration"   value={ad.duration ?? '—'} />
            </dl>
          </Card>

          {/* Raw Ad Content */}
          <Card title="Raw Ad Content">
            <div className="space-y-4 divide-y divide-border-default">
              <RawField label="Primary Text" value={ad.primary_text} multiline />
              <div className="space-y-4 pt-4">
                <RawField label="Headline" value={ad.headline} />
                <RawField label="CTA"      value={ad.cta} />
              </div>
            </div>
          </Card>
        </div>

        {/* ── MIDDLE: AI Extracted Results + Evidence + AI Notes ───────────── */}
        <div className="space-y-5">

          {/* AI Extracted Results */}
          <Card
            title="AI Extracted Results"
            headerRight={
              <Badge color={confBadgeColor} className="whitespace-nowrap text-xs">
                Confidence: {overallConf}% ({overallLevel})
              </Badge>
            }
          >
            <div className="-mx-1 space-y-0.5">
              {INSIGHT_META.map((meta) => (
                <AIInsightRow key={meta.key} meta={meta} data={item.ai_insights?.[meta.key]} />
              ))}
            </div>
          </Card>

          {/* Evidence Used */}
          <Card title="Evidence Used">
            <div className="space-y-3.5">
              {EVIDENCE_SOURCES.map(({ key, label }) => {
                const text = item.evidence?.[key]
                if (!text) return null
                return (
                  <div key={key}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</p>
                    <p className="mt-0.5 text-sm italic leading-relaxed text-text-secondary">{text}</p>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* AI Notes / Reasoning */}
          <Card title="AI Notes / Reasoning">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm leading-relaxed text-text-secondary">{item.ai_notes ?? '—'}</p>
            </div>
          </Card>
        </div>

        {/* ── RIGHT: Review & Edit form ────────────────────────────────────── */}
        <div>
          <Card
            title="Review & Edit"
            subtitle="Validate and correct the AI extracted data"
          >
            <div className="space-y-4">

              {/* Hook */}
              <div>
                <FormLabel label="Hook" counter={`${form.hook.length}/120`} />
                <input
                  value={form.hook}
                  onChange={(e) => setField('hook')(e.target.value)}
                  maxLength={120}
                  placeholder="Describe the hook..."
                  className={inputCls}
                />
              </div>

              {/* Hook Type */}
              <div>
                <FormLabel label="Hook Type" />
                <SelectInput
                  value={form.hook_type}
                  onChange={setField('hook_type')}
                  options={HOOK_TYPES}
                  placeholder="Select hook type..."
                />
              </div>

              {/* Angle */}
              <div>
                <FormLabel label="Angle" />
                <SelectInput
                  value={form.angle}
                  onChange={setField('angle')}
                  options={ANGLES}
                  placeholder="Select angle..."
                />
              </div>

              {/* Offer Type */}
              <div>
                <FormLabel label="Offer Type" />
                <SelectInput
                  value={form.offer_type}
                  onChange={setField('offer_type')}
                  options={OFFER_TYPES}
                  placeholder="Select offer type..."
                />
              </div>

              {/* Offer Value */}
              <div>
                <FormLabel label="Offer Value" />
                <input
                  value={form.offer_value}
                  onChange={(e) => setField('offer_value')(e.target.value)}
                  placeholder="e.g. $40 off first order"
                  className={inputCls}
                />
              </div>

              {/* Creative Format */}
              <div>
                <FormLabel label="Creative Format" />
                <SelectInput
                  value={form.creative_format}
                  onChange={setField('creative_format')}
                  options={CREATIVE_FORMATS}
                  placeholder="Select format..."
                />
              </div>

              {/* Product Line */}
              <div>
                <FormLabel label="Product Line" />
                <SelectInput
                  value={form.product_line}
                  onChange={setField('product_line')}
                  options={PRODUCT_LINES}
                  placeholder="Select product line..."
                />
              </div>

              {/* Audience Type */}
              <div>
                <FormLabel label="Audience Type" />
                <SelectInput
                  value={form.audience_type}
                  onChange={setField('audience_type')}
                  options={AUDIENCE_TYPES}
                  placeholder="Select audience..."
                />
              </div>

              {/* USP / Key Message */}
              <div>
                <FormLabel label="USP / Key Message" counter={`${form.usp.length}/120`} />
                <input
                  value={form.usp}
                  onChange={(e) => setField('usp')(e.target.value)}
                  maxLength={120}
                  placeholder="Key value proposition..."
                  className={inputCls}
                />
              </div>

              {/* Review Notes */}
              <div>
                <FormLabel label="Review Notes" counter={`${form.notes.length}/300`} />
                <textarea
                  value={form.notes}
                  onChange={(e) => setField('notes')(e.target.value)}
                  maxLength={300}
                  rows={4}
                  placeholder="Add notes about your corrections or observations..."
                  className={cn(inputCls, 'resize-none')}
                />
              </div>

              {isDirty && (
                <p className="text-center text-xs font-medium text-amber-600">
                  You have unsaved changes
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Sticky action bar */}
      <StickyActionBar
        onSkip={handleSkip}
        onRerun={handleRerun}
        onMarkLowConf={handleMarkLowConf}
        onSaveNext={handleSaveNext}
        onApprove={handleApprove}
        saving={updateReview.isPending && !approveReview.isPending}
        approving={approveReview.isPending}
        rerunning={analyzeAd.isPending}
      />
    </div>
  )
}
