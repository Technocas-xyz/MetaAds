import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ExternalLink, Play, Edit2, RotateCcw, SkipForward, RefreshCw,
  Flag, Save, Check, MessageSquare, Tag, Compass, Gift,
  DollarSign, Layout, Package, Users, Star, BarChart2,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfidenceBadge from '../../components/ui/ConfidenceBadge'
import HookTypeBadge from '../../components/ui/HookTypeBadge'
import { useAd, useUpdateAd } from '../../hooks/queries/useAds'
import { useAnalyzeAd } from '../../hooks/queries/useAI'
import { getConfidenceLevel } from '../../lib/confidence'
import useUIStore from '../../store/useUIStore'
import { cn } from '../../lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_MAP = {
  approved: { label: 'Active',   color: 'green' },
  pending:  { label: 'Pending',  color: 'amber' },
  flagged:  { label: 'Flagged',  color: 'red'   },
  rejected: { label: 'Removed',  color: 'slate' },
}

const PLATFORM_DOT = {
  Facebook:  'bg-blue-500',
  Instagram: 'bg-pink-500',
  TikTok:    'bg-black',
  YouTube:   'bg-red-500',
}

// ── Shared card wrapper ────────────────────────────────────────────────────────
function Card({ title, rightSlot, children, className }) {
  return (
    <div className={cn('rounded-card border border-border-default bg-white shadow-card', className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-border-default px-5 py-3.5">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          {rightSlot}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Page skeleton ──────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-72 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-btn bg-gray-200" />
          <div className="h-9 w-36 animate-pulse rounded-btn bg-gray-200" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {[320, 180, 220].map((h, i) => (
            <div key={i} className="animate-pulse rounded-card border border-border-default bg-white p-5 shadow-card">
              <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
              <div className="rounded-lg bg-gray-100" style={{ height: h }} />
            </div>
          ))}
        </div>
        <div className="space-y-5">
          {[360, 200, 120].map((h, i) => (
            <div key={i} className="animate-pulse rounded-card border border-border-default bg-white p-5 shadow-card">
              <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-8 rounded bg-gray-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── AI Insight row with inline edit ───────────────────────────────────────────
const INSIGHT_META = [
  { key: 'hook',            label: 'Hook',            icon: MessageSquare, apiKey: 'hook_text'   },
  { key: 'hook_type',       label: 'Hook Type',       icon: Tag,           apiKey: 'hook_type'   },
  { key: 'angle',           label: 'Angle',           icon: Compass,       apiKey: 'angle'       },
  { key: 'offer_type',      label: 'Offer Type',      icon: Gift,          apiKey: 'offer_type'  },
  { key: 'offer_value',     label: 'Offer Value',     icon: DollarSign,    apiKey: 'offer_value' },
  { key: 'creative_format', label: 'Creative Format', icon: Layout,        apiKey: null          },
  { key: 'product_line',    label: 'Product Line',    icon: Package,       apiKey: null          },
  { key: 'audience_type',   label: 'Audience Type',   icon: Users,         apiKey: null          },
  { key: 'usp_detected',    label: 'USP Detected',    icon: Star,          apiKey: null          },
]

function InsightRow({ adId, meta, data, updateAd }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(data.value)
  const level                 = getConfidenceLevel(data.confidence)
  const isLow                 = level === 'Low'

  const save = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== data.value && meta.apiKey) {
      updateAd.mutate(
        { id: adId, [meta.apiKey]: trimmed },
        { onSuccess: () => toast.success(`${meta.label} updated`) }
      )
    }
    setEditing(false)
  }

  const Icon = meta.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg py-2 pl-3 transition-colors',
        isLow ? 'border-l-2 border-danger-400 bg-danger-50/40' : 'border-l-2 border-transparent hover:bg-gray-50/60'
      )}
    >
      <Icon size={14} className="mt-0.5 flex-shrink-0 text-text-secondary" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">{meta.label}</p>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  { e.preventDefault(); save() }
              if (e.key === 'Escape') { setDraft(data.value); setEditing(false) }
            }}
            onBlur={save}
            className="mt-0.5 w-full rounded border border-primary-400 bg-white px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setDraft(data.value); setEditing(true) }}
            title="Click to edit"
            className="group flex items-center gap-1 text-left"
          >
            <span className="mt-0.5 text-sm font-medium text-text-primary group-hover:text-primary-600 transition-colors">
              {data.value ?? '—'}
            </span>
            <Edit2 size={10} className="opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0" />
          </button>
        )}
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1 pt-0.5">
        <ConfidenceBadge score={data.confidence} />
        {isLow && (
          <span className="text-[10px] font-medium text-danger-600">Needs review</span>
        )}
      </div>
    </div>
  )
}

// ── Evidence row ───────────────────────────────────────────────────────────────
function EvidenceRow({ label, text }) {
  if (!text) return null
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className="text-sm leading-relaxed text-text-secondary">
        {text.startsWith('"') ? (
          <span className="italic">{text}</span>
        ) : text}
      </p>
    </div>
  )
}

// ── Sticky action bar ──────────────────────────────────────────────────────────
function StickyActionBar({ ad, onSkip, onRerun, isRerunning }) {
  const { sidebarCollapsed } = useUIStore()
  const navigate             = useNavigate()
  const updateAd             = useUpdateAd()

  const handleFlag = () => {
    updateAd.mutate(
      { id: ad.id, status: 'flagged' },
      { onSuccess: () => toast.success('Marked as low confidence') }
    )
  }

  const handleApprove = () => {
    updateAd.mutate(
      { id: ad.id, status: 'approved' },
      { onSuccess: () => { toast.success('Ad approved'); navigate('/ads') } }
    )
  }

  const handleSaveNext = () => {
    const nextId = String(Number(ad.id) + 1)
    toast.success('Saved')
    navigate(`/ads/${nextId}`)
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 inset-x-0 z-30 border-t border-border-default bg-white/95 backdrop-blur-sm shadow-lg',
        'transition-all duration-200',
        sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-60'
      )}
    >
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 sm:justify-end sm:overflow-visible">
        <Button variant="ghost" size="sm" icon={SkipForward} onClick={onSkip}>
          Skip
        </Button>
        <Button variant="ghost" size="sm" icon={RefreshCw} loading={isRerunning} onClick={onRerun}>
          Re-run AI
        </Button>
        <div className="mx-1 hidden h-5 w-px bg-border-default sm:block" />
        <Button variant="warning" size="sm" icon={Flag} onClick={handleFlag}>
          Mark as Low Confidence
        </Button>
        <Button variant="outline" size="sm" icon={Save} onClick={handleSaveNext}>
          Save &amp; Review Next
        </Button>
        <Button variant="success" size="sm" icon={Check} onClick={handleApprove}>
          Approve &amp; Publish
        </Button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdDetailPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { data: ad, isLoading } = useAd(id)
  const updateAd     = useUpdateAd()
  const analyzeAd    = useAnalyzeAd()
  const [evidenceOpen, setEvidenceOpen] = useState(true)

  const isRerunning = analyzeAd.isPending

  const handleRerun = () => {
    analyzeAd.mutate(id, {
      onSuccess: () => toast.success('AI analysis complete'),
      onError:   () => toast.error('Analysis failed — try again'),
    })
  }

  const handleSkip = () => {
    const nextId = String(Number(id) + 1)
    navigate(`/ads/${nextId}`)
  }

  if (isLoading) return <Skeleton />

  if (!ad) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-text-primary">Ad not found</p>
        <p className="mt-1 text-sm text-text-secondary">This ad may have been removed or the ID is invalid.</p>
        <Link to="/ads" className="mt-4 text-sm font-medium text-primary-600 hover:underline">
          ← Back to Ads Library
        </Link>
      </div>
    )
  }

  const statusInfo = STATUS_MAP[ad.status] ?? { label: ad.status, color: 'gray' }
  const insights   = ad.ai_insights ?? {}
  const evidence   = ad.evidence   ?? {}

  return (
    <div className="space-y-5 pb-20">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Dashboard',   to: '/dashboard' },
        { label: 'Ads Library', to: '/ads' },
        { label: ad.headline ?? `Ad #${ad.id}` },
      ]} />

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-text-primary leading-snug">
              {ad.headline}
            </h1>
            <Badge color={statusInfo.color}>{statusInfo.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            First seen: {fmtDate(ad.captured_at)}
            {ad.competitor?.name && (
              <> · <span className="font-medium">{ad.competitor.name}</span></>
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={Edit2} to={`/ads/${id}/edit`}>
            Edit Creative
          </Button>
          {ad.ad_url && (
            <Button variant="outline" size="sm" icon={ExternalLink} href={ad.ad_url} target="_blank" rel="noopener noreferrer">
              View Original Ad
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={RotateCcw}
            loading={isRerunning}
            onClick={handleRerun}
          >
            Re-run AI Analysis
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* ── LEFT COLUMN ───────────────────────────────────────────── */}
        <div className="space-y-5 xl:col-span-2">

          {/* Ad Preview */}
          <Card title="Ad Preview">
            <div className="overflow-hidden rounded-lg border border-border-default bg-gray-50">
              {ad.is_video ? (
                <div className="relative flex aspect-[4/3] items-center justify-center bg-gray-900">
                  <img
                    src={ad.media_url}
                    alt={ad.headline}
                    className="h-full w-full object-cover opacity-60"
                  />
                  <div className="absolute flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                    <Play size={24} className="fill-primary-600 text-primary-600 ml-0.5" />
                  </div>
                </div>
              ) : (
                <img
                  src={ad.media_url}
                  alt={ad.headline}
                  className="w-full object-contain max-h-80"
                />
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-full', PLATFORM_DOT[ad.platform] ?? 'bg-gray-400')} />
                <span className="text-sm font-medium text-text-primary">{ad.platform}</span>
              </div>
              <span className="text-text-tertiary">·</span>
              <span className="text-sm text-text-secondary">Seen: {fmtDate(ad.captured_at)}</span>
              {ad.last_seen && ad.last_seen !== ad.captured_at && (
                <>
                  <span className="text-text-tertiary">→</span>
                  <span className="text-sm text-text-secondary">{fmtDate(ad.last_seen)}</span>
                </>
              )}
              <span className="text-text-tertiary">·</span>
              <Badge color={statusInfo.color}>{statusInfo.label}</Badge>
              {ad.is_video && <Badge color="indigo">Video</Badge>}
              {ad.variants > 1 && (
                <span className="text-xs text-text-secondary">{ad.variants} variants</span>
              )}
            </div>
          </Card>

          {/* Raw Content */}
          <Card title="Raw Content">
            <div className="space-y-4">
              {ad.primary_text && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Primary Text</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{ad.primary_text}</p>
                </div>
              )}
              {ad.headline && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Headline</p>
                  <p className="text-sm font-medium text-text-primary">{ad.headline}</p>
                </div>
              )}
              {ad.cta && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">CTA</p>
                  <span className="inline-flex rounded-md bg-primary-600 px-3 py-1 text-xs font-semibold text-white">
                    {ad.cta}
                  </span>
                </div>
              )}
              {ad.landing_url && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Landing URL</p>
                  <a
                    href={ad.landing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary-600 hover:underline break-all"
                  >
                    <ExternalLink size={12} className="flex-shrink-0" />
                    {ad.landing_url}
                  </a>
                </div>
              )}
              {ad.notes && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Notes</p>
                  <p className="text-sm italic text-text-secondary">{ad.notes}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Basic Information */}
          <Card title="Basic Information">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {[
                { label: 'Competitor',    value: ad.competitor?.name },
                { label: 'Platform',      value: ad.platform },
                { label: 'Ad ID',         value: `#${ad.id}` },
                { label: 'Status',        value: statusInfo.label },
                { label: 'First Seen',    value: fmtDate(ad.captured_at) },
                { label: 'Last Seen',     value: fmtDate(ad.last_seen ?? ad.captured_at) },
                { label: 'Running',       value: `${ad.running_since_days} days` },
                { label: 'Variants',      value: ad.variants },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-baseline justify-between gap-2 border-b border-gray-50 pb-2 sm:flex-col sm:border-0 sm:pb-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</dt>
                  <dd className="text-sm font-medium text-text-primary">{value ?? '—'}</dd>
                </div>
              ))}
              {/* Links */}
              {ad.ad_url && (
                <div className="flex items-baseline justify-between gap-2 border-b border-gray-50 pb-2 sm:flex-col sm:border-0 sm:pb-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Ad URL</dt>
                  <dd>
                    <a href={ad.ad_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary-600 hover:underline">
                      <ExternalLink size={11} /> View
                    </a>
                  </dd>
                </div>
              )}
              {ad.landing_url && (
                <div className="flex items-baseline justify-between gap-2 sm:flex-col">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Landing Page</dt>
                  <dd>
                    <a href={ad.landing_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary-600 hover:underline">
                      <ExternalLink size={11} /> Open
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ──────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* AI Extracted Insights */}
          <Card
            title="AI Extracted Insights"
            rightSlot={
              insights.overall !== undefined ? (
                <ConfidenceBadge score={insights.overall} />
              ) : null
            }
          >
            {INSIGHT_META.some((m) => insights[m.key]) ? (
              <div className="space-y-0.5">
                {INSIGHT_META.map((meta) => {
                  const data = insights[meta.key]
                  if (!data) return null
                  return (
                    <InsightRow
                      key={meta.key}
                      adId={ad.id}
                      meta={meta}
                      data={data}
                      updateAd={updateAd}
                    />
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <BarChart2 size={28} className="mb-2 text-text-tertiary" />
                <p className="text-sm text-text-secondary">No AI analysis yet</p>
                <button
                  type="button"
                  onClick={handleRerun}
                  className="mt-2 text-xs font-medium text-primary-600 hover:underline"
                >
                  Run analysis →
                </button>
              </div>
            )}

            {/* Hook + angle quick-ref */}
            {(ad.hook_type || ad.angle) && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-default pt-3">
                {ad.hook_type && <HookTypeBadge type={ad.hook_type} />}
                {ad.angle && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    {ad.angle}
                  </span>
                )}
                {ad.offer_type && (
                  <Badge color="indigo">{ad.offer_type}</Badge>
                )}
              </div>
            )}
          </Card>

          {/* Evidence Used */}
          <Card
            title="Evidence Used"
            rightSlot={
              <button
                type="button"
                onClick={() => setEvidenceOpen((v) => !v)}
                className="rounded p-0.5 text-text-tertiary hover:text-text-primary"
              >
                {evidenceOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            }
          >
            {evidenceOpen ? (
              <div className="space-y-4">
                <EvidenceRow label="Primary Text"  text={evidence.primary_text} />
                <EvidenceRow label="Headline"      text={evidence.headline} />
                <EvidenceRow label="CTA"           text={evidence.cta} />
                <EvidenceRow label="Landing Page"  text={evidence.landing_page} />
                <EvidenceRow label="Visual"        text={evidence.visual} />
                {!evidence.primary_text && !evidence.headline && (
                  <p className="text-sm text-text-secondary">No evidence recorded yet.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary">Click to expand evidence.</p>
            )}
          </Card>

          {/* AI Notes */}
          <Card title="AI Notes / Reasoning">
            {ad.ai_notes ? (
              <p className="text-sm leading-relaxed text-text-secondary">{ad.ai_notes}</p>
            ) : ad.analysis?.summary ? (
              <p className="text-sm leading-relaxed text-text-secondary">{ad.analysis.summary}</p>
            ) : (
              <p className="text-sm text-text-tertiary italic">No reasoning recorded. Run AI analysis to generate notes.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Sticky action bar */}
      <StickyActionBar
        ad={ad}
        onSkip={handleSkip}
        onRerun={handleRerun}
        isRerunning={isRerunning}
      />
    </div>
  )
}
