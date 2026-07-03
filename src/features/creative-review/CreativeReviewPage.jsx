import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Download, CheckCircle2, ZoomIn, ZoomOut,
  Grid, Layers, AlertTriangle, Star, Compass,
  Eye, Type, Focus, TrendingUp, MessageSquare, PenLine, Wand2,
  Copy, LayoutTemplate, Sparkles,
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

// ── Inline mock data ──────────────────────────────────────────────────────────
const MARKERS = [
  { id: 1, x: 12, y: 8,  w: 34, h: 20 },
  { id: 2, x: 56, y: 6,  w: 30, h: 18 },
  { id: 3, x: 8,  y: 60, w: 40, h: 22 },
  { id: 4, x: 54, y: 66, w: 36, h: 20 },
]

const VARIANTS = [
  { id: 1, label: 'Variant 1', img: 'https://placehold.co/80x100/6366f1/ffffff?text=V1' },
  { id: 2, label: 'Variant 2', img: 'https://placehold.co/80x100/ec4899/ffffff?text=V2' },
  { id: 3, label: 'Variant 3', img: 'https://placehold.co/80x100/22c55e/ffffff?text=V3' },
  { id: 4, label: 'Variant 4', img: 'https://placehold.co/80x100/f59e0b/ffffff?text=V4' },
]

const SUB_SCORES = [
  { icon: Eye,            label: 'Visual Impact',      score: 82 },
  { icon: Type,           label: 'Copy Clarity',       score: 75 },
  { icon: Focus,          label: 'CTA Visibility',     score: 58 },
  { icon: MessageSquare,  label: 'Hook Strength',      score: 88 },
  { icon: Layers,         label: 'Brand Consistency',  score: 71 },
  { icon: TrendingUp,     label: 'Engagement Potential', score: 79 },
  { icon: AlertTriangle,  label: 'Saturation Risk',    score: 45 },
  { icon: Star,           label: 'Uniqueness',         score: 83 },
]

const RADAR_DATA = [
  { axis: 'Hook',        mine: 88, avg: 65 },
  { axis: 'Clarity',    mine: 75, avg: 70 },
  { axis: 'Visual',     mine: 82, avg: 60 },
  { axis: 'CTA',        mine: 58, avg: 72 },
  { axis: 'Uniqueness', mine: 83, avg: 55 },
  { axis: 'Saturation', mine: 45, avg: 68 },
  { axis: 'Engagement', mine: 79, avg: 63 },
  { axis: 'Offer',      mine: 65, avg: 70 },
]

const SUGGESTIONS = [
  {
    id: 1, priority: 'high',
    icon: AlertTriangle,
    title: 'Make Offer More Visible',
    desc: 'The 40% discount offer is buried in secondary text. Move it to the headline for an estimated 23% higher CTR.',
    thumb: 'https://placehold.co/36x36/fee2e2/ef4444?text=!',
  },
  {
    id: 2, priority: 'high',
    icon: AlertTriangle,
    title: 'Increase CTA Visibility',
    desc: 'CTA button blends with background. Increase contrast — aim for a 4.5:1 ratio for accessibility and conversion.',
    thumb: 'https://placehold.co/36x36/fee2e2/ef4444?text=!',
  },
  {
    id: 3, priority: 'medium',
    icon: Star,
    title: 'Improve Visual Hierarchy',
    desc: 'Eye tracking suggests the visual flow is unclear. Guide viewers from headline → product → CTA.',
    thumb: 'https://placehold.co/36x36/fef9c3/ca8a04?text=★',
  },
  {
    id: 4, priority: 'medium',
    icon: Star,
    title: 'Add Social Proof',
    desc: 'Adding a customer count or rating near the offer can increase trust and conversion rates by ~15%.',
    thumb: 'https://placehold.co/36x36/fef9c3/ca8a04?text=★',
  },
  {
    id: 5, priority: 'low',
    icon: Compass,
    title: 'Test UGC Version',
    desc: 'UGC-style creatives in this angle show 18% higher CTR. Consider a user-generated content variant.',
    thumb: 'https://placehold.co/36x36/eff6ff/2563eb?text=↗',
  },
  {
    id: 6, priority: 'positive',
    icon: CheckCircle2,
    title: 'Good Hook',
    desc: 'The pain-point hook in the opening is effective and scores above average for this product category.',
    thumb: 'https://placehold.co/36x36/dcfce7/16a34a?text=✓',
  },
  {
    id: 7, priority: 'positive',
    icon: CheckCircle2,
    title: 'Good Print Quality',
    desc: 'High-quality product imagery improves perceived value. This creative executes this well.',
    thumb: 'https://placehold.co/36x36/dcfce7/16a34a?text=✓',
  },
]

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
