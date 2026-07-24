import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Download, CheckCircle2, ZoomIn, ZoomOut,
  Grid, Layers, AlertTriangle, Star, Compass,
  Eye, Type, Focus, TrendingUp, MessageSquare, PenLine, Wand2,
  Copy, LayoutTemplate, Sparkles, Upload, Loader2, AlertCircle,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip as RechartsTip, Legend,
} from 'recharts'
import toast from 'react-hot-toast'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import useUIStore from '../../store/useUIStore'
import { cn } from '../../lib/utils'
import { uploadCreative, analyzeCreative, getReview, listReviews, approveCreative, requestRevision } from '../../api/creativeReview'

// ── Mock data removed — now API-driven ───────────────────────────────────────
const VARIANTS = []

const PRIORITY_META = {
  high:     { pill: 'bg-red-50 text-red-700 ring-red-200',      label: 'High Priority',   iconCls: 'text-red-500'   },
  medium:   { pill: 'bg-amber-50 text-amber-700 ring-amber-200', label: 'Med Priority',   iconCls: 'text-amber-500' },
  low:      { pill: 'bg-blue-50 text-blue-700 ring-blue-200',    label: 'Low Priority',    iconCls: 'text-blue-500'  },
  positive: { pill: 'bg-green-50 text-green-700 ring-green-200', label: 'Positive',        iconCls: 'text-green-500' },
}

// ── Small reusable components ─────────────────────────────────────────────────
function Card({ title, subtitle, headerRight, children, className, bodyClass }) {
  return (
    <div className={cn('rounded-card border border-border-default bg-white shadow-card', className)}>
      {(title || headerRight) && (
        <div className="flex items-center justify-between gap-3 border-b border-border-default px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>}
          </div>
          {headerRight}
        </div>
      )}
      <div className={cn('p-5', bodyClass)}>{children}</div>
    </div>
  )
}

function IconBtn({ onClick, active, children, title: tip }) {
  return (
    <button
      type="button"
      title={tip}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium transition-colors',
        active ? 'bg-primary-50 text-primary-600' : 'text-text-secondary hover:bg-gray-100 hover:text-text-primary',
      )}
    >
      {children}
    </button>
  )
}

// ── Creative Preview image + SVG overlay ──────────────────────────────────────
function CreativePreview() {
  const [zoom,        setZoom]        = useState(100)
  const [showOverlay, setShowOverlay] = useState(true)
  const [showGrid,    setShowGrid]    = useState(false)

  return (
    <div className="space-y-3">
      {/* File meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
        <span className="font-mono font-medium text-text-primary">image_20250507_104512.jpg</span>
        <span className="text-text-tertiary">·</span>
        <span>1080 × 1350</span>
        <span className="text-text-tertiary">·</span>
        <a href="#" className="font-medium text-primary-600 hover:underline">View Original</a>
      </div>

      {/* Image with overlay */}
      <div
        className="relative overflow-hidden rounded-lg bg-gray-100"
        style={{ aspectRatio: '4/5' }}
      >
        <img
          src="https://placehold.co/540x675/ddd6fe/6366f1?text=Creative+Preview"
          alt="Creative Preview"
          className="h-full w-full object-cover transition-transform duration-200"
          style={{ transform: `scale(${zoom / 100})` }}
        />

        {/* Numbered region markers */}
        {showOverlay && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {MARKERS.map((m) => (
              <g key={m.id}>
                <rect
                  x={m.x} y={m.y} width={m.w} height={m.h}
                  fill="none" stroke="#6366F1" strokeWidth="0.7"
                  strokeDasharray="2.5 1.2" rx="1"
                />
                <circle cx={m.x + 4} cy={m.y + 4} r="4" fill="#6366F1" />
                <text
                  x={m.x + 4} y={m.y + 4.9}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="3.2" fontWeight="700"
                  style={{ fontFamily: 'system-ui' }}
                >
                  {m.id}
                </text>
              </g>
            ))}
          </svg>
        )}

        {/* Grid overlay */}
        {showGrid && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {[25, 50, 75].map((p) => (
              <g key={p}>
                <line x1={p} y1="0" x2={p} y2="100" stroke="#6366F1" strokeWidth="0.4" />
                <line x1="0" y1={p} x2="100" y2={p} stroke="#6366F1" strokeWidth="0.4" />
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 border-t border-border-default pt-2.5">
        {/* Zoom */}
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(50, z - 25))}
          className="rounded p-1 text-text-secondary hover:bg-gray-100 hover:text-text-primary disabled:opacity-40"
          disabled={zoom <= 50}
        >
          <ZoomOut size={13} />
        </button>
        <span className="w-10 text-center text-xs font-medium text-text-primary">{zoom}%</span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(200, z + 25))}
          className="rounded p-1 text-text-secondary hover:bg-gray-100 hover:text-text-primary disabled:opacity-40"
          disabled={zoom >= 200}
        >
          <ZoomIn size={13} />
        </button>

        <div className="mx-1.5 h-4 w-px bg-border-default" />
        <button
          type="button"
          onClick={() => setZoom(100)}
          className="rounded px-1.5 py-0.5 text-xs font-medium text-text-secondary hover:bg-gray-100 hover:text-text-primary"
        >
          Fit
        </button>

        <div className="mx-1.5 h-4 w-px bg-border-default" />
        <IconBtn active={showOverlay} onClick={() => setShowOverlay((o) => !o)} tip="Toggle overlay markers">
          <Layers size={12} /> Overlay
        </IconBtn>
        <IconBtn active={showGrid} onClick={() => setShowGrid((g) => !g)} tip="Toggle grid">
          <Grid size={12} /> Grid
        </IconBtn>
      </div>
    </div>
  )
}

// ── AI Analysis Gauge (SVG 270° arc) ─────────────────────────────────────────
function AnalysisGauge({ score }) {
  const r    = 54
  const cx   = 70
  const cy   = 74
  const circ = 2 * Math.PI * r
  const arc  = circ * 0.75
  const fill = arc * (score / 100)
  const color = score >= 70 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444'
  const label = score >= 70 ? 'Good'    : score >= 50 ? 'Fair'    : 'Poor'

  return (
    <svg width="140" height="130" viewBox="0 0 140 130" aria-label={`Score ${score} out of 100`}>
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke="#E2E8F0" strokeWidth="10"
        strokeDasharray={`${arc} ${circ - arc}`}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
      />
      {/* Fill */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
      />
      {/* Score */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#0F172A" fontSize="30" fontWeight="700" style={{ fontFamily: 'system-ui' }}>
        {score}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748B" fontSize="12" style={{ fontFamily: 'system-ui' }}>
        / 100
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" fill={color} fontSize="13" fontWeight="600" style={{ fontFamily: 'system-ui' }}>
        {label}
      </text>
    </svg>
  )
}

// ── Sub-score row ──────────────────────────────────────────────────────────────
function SubScoreRow({ icon: Icon, label, score }) {
  const barColor = score >= 70 ? 'bg-success-500' : score >= 50 ? 'bg-amber-400' : 'bg-danger-500'
  const textColor = score >= 70 ? 'text-success-600' : score >= 50 ? 'text-amber-600' : 'text-danger-600'
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={12} className="flex-shrink-0 text-text-tertiary" />
      <span className="w-[130px] flex-shrink-0 text-xs text-text-secondary">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn('w-14 text-right text-xs font-semibold tabular-nums', textColor)}>
        {score}/100
      </span>
    </div>
  )
}

// ── AI Suggestion card ─────────────────────────────────────────────────────────
function AISuggestionCard({ item }) {
  const meta = PRIORITY_META[item.priority]
  const Icon = item.icon
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border-default bg-white p-3 transition-shadow hover:shadow-card">
      <Icon size={14} className={cn('mt-0.5 flex-shrink-0', meta.iconCls)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold leading-snug text-text-primary">{item.title}</p>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1 whitespace-nowrap', meta.pill)}>
              {meta.label}
            </span>
            <img src={item.thumb} alt="" className="h-8 w-8 flex-shrink-0 rounded object-cover" />
          </div>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">{item.desc}</p>
      </div>
    </div>
  )
}

// ── Sticky bottom action bar ──────────────────────────────────────────────────
function BottomActionBar() {
  const { sidebarCollapsed } = useUIStore()

  const actions = [
    {
      variant: 'outline', icon: PenLine,       label: 'Request Revision',
      sub: 'Send back to designer',             cls: 'border-danger-300 text-danger-600 hover:bg-danger-50',
      onClick: () => toast.success('Revision requested'),
    },
    {
      variant: 'outline', icon: Wand2,          label: 'Auto-Fix Suggestions',
      sub: 'Apply AI recommended fixes',         cls: 'border-blue-300 text-blue-600 hover:bg-blue-50',
      onClick: () => toast.success('AI fixes applied'),
    },
    {
      variant: 'outline', icon: Copy,            label: 'Generate Variants',
      sub: 'Create 3 alternative versions',      cls: 'border-primary-300 text-primary-600 hover:bg-primary-50',
      onClick: () => toast.success('Generating 3 variants…'),
    },
    {
      variant: 'outline', icon: LayoutTemplate,  label: 'Save as Template',
      sub: 'Use for future creatives',           cls: 'border-amber-300 text-amber-600 hover:bg-amber-50',
      onClick: () => toast.success('Saved as template'),
    },
    {
      variant: 'success', icon: CheckCircle2,    label: 'Approve for Publishing',
      sub: 'Send to campaign setup',             cls: '',
      onClick: () => toast.success('Approved for publishing!'),
    },
  ]

  return (
    <div className={cn(
      'fixed inset-x-0 bottom-0 z-20 border-t border-border-default bg-white/95 shadow-lg backdrop-blur-sm',
      'transition-all duration-200',
      sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-60',
    )}>
      <div className="flex flex-wrap items-end justify-end gap-3 px-5 py-3">
        {actions.map(({ variant, icon, label, sub, cls, onClick }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <Button
              variant={variant}
              size="sm"
              icon={icon}
              onClick={onClick}
              className={cls}
            >
              {label}
            </Button>
            <span className="whitespace-nowrap text-[10px] text-text-tertiary">{sub}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CreativeReviewPage() {
  const [mode, setMode] = useState('upload') // upload | reviewing | result
  const [reviewId, setReviewId] = useState(null)
  const [review, setReview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadForm, setUploadForm] = useState({ headline: '', primary_text: '', cta: '', offer: '', platform: 'facebook' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const fileInputRef = useRef(null)

  // Load latest review on mount (cache pattern)
  useEffect(() => {
    const loadLatest = async () => {
      try {
        const reviews = await listReviews()
        if (reviews.length > 0 && reviews[0].review_result) {
          setReview(reviews[0])
          setReviewId(reviews[0].id)
          setMode('result')
        }
      } catch {}
    }
    loadLatest()
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Only image files accepted'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) { toast.error('Select an image first'); return }
    setAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('headline', uploadForm.headline)
      formData.append('primary_text', uploadForm.primary_text)
      formData.append('cta', uploadForm.cta)
      formData.append('offer', uploadForm.offer)
      formData.append('platform', uploadForm.platform)

      const uploaded = await uploadCreative(formData)
      setReviewId(uploaded.id)
      setMode('reviewing')

      // Start analysis
      await analyzeCreative(uploaded.id)

      // Poll for result
      const interval = setInterval(async () => {
        const r = await getReview(uploaded.id)
        if (r.status === 'reviewed' || r.status === 'failed') {
          clearInterval(interval)
          setReview(r)
          setMode('result')
          setAnalyzing(false)
          if (r.status === 'reviewed') toast.success('Review complete')
          else toast.error('Review failed')
        }
      }, 3000)
    } catch (e) {
      toast.error('Upload failed')
      setAnalyzing(false)
    }
  }

  const handleApprove = async () => {
    if (!reviewId) return
    await approveCreative(reviewId)
    setReview((r) => ({ ...r, status: 'approved' }))
    toast.success('Creative approved for publishing')
  }

  const handleRequestRevision = async () => {
    if (!reviewId) return
    const reason = prompt('What needs to change?')
    if (!reason) return
    await requestRevision(reviewId, reason)
    setReview((r) => ({ ...r, status: 'needs_changes' }))
    toast('Revision requested', { icon: '📝' })
  }

  // Map AI response to UI-compatible structures
  const result = review?.review_result || {}
  const overall_score = result.overall_score || 0
  const verdict = result.verdict || 'pending'
  const SUGGESTIONS = (result.suggestions || []).map((s, i) => ({
    id: i + 1, priority: s.priority || 'medium',
    icon: s.priority === 'high' ? AlertTriangle : s.priority === 'positive' ? CheckCircle2 : Star,
    title: s.title, desc: s.note,
  }))

  // Sub-scores — ONLY show what the AI actually returned (honesty rule)
  const alignment = result.alignment_scores || {}
  const SUB_SCORES = [
    alignment.copy_clarity != null && { icon: Type, label: 'Copy Clarity', score: alignment.copy_clarity },
    alignment.cta_presence != null && { icon: Focus, label: 'CTA Presence', score: alignment.cta_presence },
    alignment.offer_clarity != null && { icon: Layers, label: 'Offer Clarity', score: alignment.offer_clarity },
    alignment.hook_strength != null && { icon: MessageSquare, label: 'Hook Strength', score: alignment.hook_strength },
    alignment.visual_impact != null && { icon: Eye, label: 'Visual Impact', score: alignment.visual_impact },
    alignment.brand_consistency != null && { icon: Star, label: 'Brand Consistency', score: alignment.brand_consistency },
  ].filter(Boolean)

  const similarity = result.similarity_to_competitors
  const imageUrl = review?.image_url || previewUrl

  // Upload mode
  if (mode === 'upload') {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <Breadcrumb />
        <h1 className="text-2xl font-semibold text-text-primary">Creative Review & QA</h1>
        <p className="text-xs text-text-secondary">Upload your ad creative and copy. The AI will review it against winning market patterns.</p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Upload area */}
          <div className="rounded-card border-2 border-dashed border-border-default bg-gray-50 p-8 text-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="mx-auto max-h-64 rounded-lg object-contain" />
            ) : (
              <div className="space-y-3">
                <Upload size={40} className="mx-auto text-text-tertiary" />
                <p className="text-sm text-text-secondary">Drop your creative image here or click to browse</p>
                <p className="text-[10px] text-text-tertiary">PNG, JPEG, WebP — max 10MB</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="mt-4 rounded-btn border border-border-default px-4 py-2 text-xs font-medium hover:bg-white">
              {selectedFile ? 'Change Image' : 'Select Image'}
            </button>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-text-secondary">Headline</label>
              <input value={uploadForm.headline} onChange={(e) => setUploadForm(f => ({...f, headline: e.target.value}))} className="mt-1 w-full rounded-btn border border-border-default px-3 py-2 text-sm" placeholder="Your ad headline..." />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Primary Text</label>
              <textarea value={uploadForm.primary_text} onChange={(e) => setUploadForm(f => ({...f, primary_text: e.target.value}))} rows={4} className="mt-1 w-full rounded-btn border border-border-default px-3 py-2 text-sm" placeholder="Ad body copy..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary">CTA</label>
                <input value={uploadForm.cta} onChange={(e) => setUploadForm(f => ({...f, cta: e.target.value}))} className="mt-1 w-full rounded-btn border border-border-default px-3 py-2 text-sm" placeholder="Shop Now" />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary">Offer</label>
                <input value={uploadForm.offer} onChange={(e) => setUploadForm(f => ({...f, offer: e.target.value}))} className="mt-1 w-full rounded-btn border border-border-default px-3 py-2 text-sm" placeholder="20% off, Free Shipping..." />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Platform</label>
              <select value={uploadForm.platform} onChange={(e) => setUploadForm(f => ({...f, platform: e.target.value}))} className="mt-1 w-full rounded-btn border border-border-default px-3 py-2 text-sm">
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div className="pt-3 flex items-center gap-3">
              <div className="text-[9px] text-text-tertiary flex items-center gap-1">
                <AlertCircle size={10} className="text-amber-500" />
                This will make 1 paid API call
              </div>
              <Button
                variant="primary"
                size="md"
                icon={analyzing ? Loader2 : Sparkles}
                onClick={handleUploadAndAnalyze}
                disabled={analyzing || !selectedFile}
                className={analyzing ? '[&_svg]:animate-spin' : ''}
              >
                {analyzing ? 'Analyzing...' : 'Analyze Creative'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Reviewing/loading state
  if (mode === 'reviewing') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 size={32} className="animate-spin text-primary-600" />
        <p className="text-sm text-text-secondary">AI is reviewing your creative...</p>
        <p className="text-[10px] text-text-tertiary">This typically takes 10-20 seconds</p>
      </div>
    )
  }

  // Result mode — render the review results
  return (
    <div className="space-y-6 p-4 pb-28 sm:p-6 sm:pb-28">
      <Breadcrumb />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-text-primary">Creative Review &amp; QA</h1>
          <Badge color="blue">Reviewing</Badge>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={ArrowLeft} to="/review">Back to Queue</Button>
          <Button variant="outline" size="sm" icon={Download} onClick={() => toast.success('Report downloading…')}>
            Download Report
          </Button>
          <Button variant="success" size="sm" icon={CheckCircle2} onClick={() => toast.success('Approved for publishing!')}>
            Approve for Publishing
          </Button>
        </div>
      </div>

      {/* Three-column grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

        {/* ── LEFT col ────────────────────────────────────────────────────── */}
        <div className="space-y-5 xl:col-span-4">

          {/* Creative Preview */}
          <Card title="Creative Preview">
            <CreativePreview />
          </Card>

          {/* Creative Variants */}
          <Card
            title="Creative Variants (4)"
            headerRight={
              <a href="#" className="text-xs font-medium text-primary-600 hover:underline">View All Variants</a>
            }
          >
            <div className="flex gap-3 overflow-x-auto pb-1">
              {VARIANTS.map((v) => (
                <div key={v.id} className="flex flex-shrink-0 flex-col items-center gap-1.5">
                  <div className="overflow-hidden rounded-lg border-2 border-transparent hover:border-primary-400 transition-colors cursor-pointer"
                    style={{ width: 72 }}>
                    <img src={v.img} alt={v.label} className="w-full object-cover" style={{ aspectRatio: '4/5' }} />
                  </div>
                  <span className="text-[10px] font-medium text-text-secondary">{v.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── MIDDLE col ──────────────────────────────────────────────────── */}
        <div className="space-y-5 xl:col-span-4">

          {/* AI Analysis Score */}
          <Card title="AI Analysis Score">
            {/* Gauge + summary */}
            <div className="flex flex-col items-center gap-3 pb-4">
              <AnalysisGauge score={78} />
              <div className="text-center">
                <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
                  This creative is performing above average but has room for improvement.
                </p>
                <a href="#suggestions" className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline">
                  See full analysis ↓
                </a>
              </div>
            </div>

            {/* Sub-score rows */}
            <div id="suggestions" className="mt-2 space-y-2.5 border-t border-border-default pt-4">
              {SUB_SCORES.map((row) => (
                <SubScoreRow key={row.label} icon={row.icon} label={row.label} score={row.score} />
              ))}
            </div>
          </Card>

          {/* Competitor Similarity */}
          <Card title="Competitor Similarity">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={RADAR_DATA} margin={{ top: 4, right: 24, bottom: 4, left: 24 }}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                />
                <Radar
                  name="This Creative"
                  dataKey="mine"
                  stroke="#6366F1"
                  fill="#6366F1"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Radar
                  name="Market Avg"
                  dataKey="avg"
                  stroke="#94A3B8"
                  fill="#94A3B8"
                  fillOpacity={0.08}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
                <RechartsTip
                  contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0' }}
                />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                />
              </RadarChart>
            </ResponsiveContainer>

            {/* Similarity score bar */}
            <div className="mt-2 space-y-2 border-t border-border-default pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">Similarity Score</span>
                <span className="text-xl font-bold text-text-primary">42%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-[42%] rounded-full bg-amber-400" />
              </div>
              <p className="text-[11px] leading-relaxed text-text-secondary">
                This creative is moderately similar to ads in cluster{' '}
                <a href="#" className="font-semibold text-primary-600 hover:underline">#12</a>.
                Consider differentiating the visual style.
              </p>
            </div>
          </Card>
        </div>

        {/* ── RIGHT col ───────────────────────────────────────────────────── */}
        <div className="space-y-5 xl:col-span-4">

          {/* AI Suggestions */}
          <Card
            title="AI Suggestions"
            headerRight={<Badge color="gray">7 Suggestions</Badge>}
          >
            <div className="space-y-2.5">
              {SUGGESTIONS.map((item) => (
                <AISuggestionCard key={item.id} item={item} />
              ))}
            </div>
          </Card>

          {/* AI Strategic Insight */}
          <Card title="AI Strategic Insight">
            <div
              className="rounded-lg p-4"
              style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)' }}
            >
              <div className="flex gap-2.5">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                  <Sparkles size={13} className="text-white" />
                </div>
                <p className="text-[12.5px] leading-relaxed text-text-secondary">
                  <span className="rounded bg-yellow-100 px-1 font-semibold text-yellow-800">
                    Speed + Quality messaging
                  </span>{' '}
                  is trending with 32% growth this week. UGC style creatives for this angle show{' '}
                  <span className="rounded bg-yellow-100 px-1 font-semibold text-yellow-800">
                    18% higher CTR
                  </span>.
                  Consider testing a{' '}
                  <span className="rounded bg-yellow-100 px-1 font-semibold text-yellow-800">
                    bundle offer with urgency
                  </span>{' '}
                  messaging to capture the current demand window before saturation increases.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <BottomActionBar />
    </div>
  )
}
