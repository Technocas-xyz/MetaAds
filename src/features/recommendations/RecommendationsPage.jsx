import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Share2, Bookmark, Sparkles, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Target, Rocket, Flame, Lightbulb, Play,
  GitCompare, Send, TriangleAlert, ChevronRight,
} from 'lucide-react'
import {
  LineChart, Line, ResponsiveContainer,
} from 'recharts'
import toast from 'react-hot-toast'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import HookTypeBadge from '../../components/ui/HookTypeBadge'
import useUIStore from '../../store/useUIStore'
import { cn } from '../../lib/utils'

// ── Inline fixture data ───────────────────────────────────────────────────────
const spark = (vals) => vals.map((v, i) => ({ i, v }))

const MARKET_INTEL = [
  { id: 1, label: 'Speed angle is increasing',     desc: 'Growing competitor usage across Facebook & TikTok',    dir: 'up',   delta: 28,   sparkColor: '#22C55E', sparkData: spark([2,4,5,7,9,11,14]) },
  { id: 2, label: 'Price hooks becoming saturated', desc: 'Heavy usage across all competitor tiers',              dir: 'down', delta: 14,   sparkColor: '#EF4444', sparkData: spark([14,13,12,10,11,9,8]) },
  { id: 3, label: 'Video (UGC) outperforming',     desc: 'Higher engagement rate vs static ads consistently',    dir: 'up',   delta: 24,   sparkColor: '#22C55E', sparkData: spark([5,6,7,9,10,12,15]) },
  { id: 4, label: 'Bundle offers gaining traction', desc: 'Emerging trend in top competitor offer strategies',    dir: 'up',   delta: 18,   sparkColor: '#F59E0B', sparkData: spark([3,4,5,5,7,8,10]) },
  { id: 5, label: 'Quality angle underserved',      desc: 'Few competitors targeting the premium segment',        dir: 'opp',  delta: null, sparkColor: '#3B82F6', sparkData: spark([2,3,3,4,5,6,8]) },
]

const RECS = [
  {
    id: 'r1', rank: 1, score: 84,
    title:   'Fast DTF Transfers Without Quality Loss',
    brief:   'Lead with speed + quality — directly address the objection that fast printing sacrifices quality.',
    angles:  ['Speed', 'Quality'], hook: 'Pain',
    opp: 'high', thumbnail: 'https://placehold.co/120x90/6366f1/ffffff?text=Creative+1',
    isVideo: true, duration: '0:15',
    saturation: 'Low', novelty: 'High', confidence: 'High',
    offer: 'Bundle Deal', audience: 'SMB Owners', cta: 'Order Now', format: 'Short Video',
  },
  {
    id: 'r2', rank: 2, score: 78,
    title:   'Vibrant Prints That Last Longer',
    brief:   'Showcase durability and color richness with real product comparisons and social proof.',
    angles:  ['Quality'], hook: 'Benefit',
    opp: 'high', thumbnail: 'https://placehold.co/120x90/ec4899/ffffff?text=Creative+2',
    isVideo: false, duration: null,
    saturation: 'Low', novelty: 'Medium', confidence: 'High',
    offer: 'Free Shipping', audience: 'Print Sellers', cta: 'Learn More', format: 'Carousel',
  },
  {
    id: 'r3', rank: 3, score: 71,
    title:   'Same Day Shipping — Boost Your Business',
    brief:   'Target time-sensitive buyers with a clear same-day shipping promise and reliability angle.',
    angles:  ['Speed', 'Convenience'], hook: 'Urgency',
    opp: 'medium', thumbnail: 'https://placehold.co/120x90/f59e0b/ffffff?text=Creative+3',
    isVideo: true, duration: '0:30',
    saturation: 'Medium', novelty: 'Medium', confidence: 'Medium',
    offer: 'Discount 20%', audience: 'Event Organizers', cta: 'Shop Now', format: 'Video',
  },
  {
    id: 'r4', rank: 4, score: 65,
    title:   'Premium Quality Every Time',
    brief:   'Position as the premium choice with a trust-based message and a quality guarantee.',
    angles:  ['Quality', 'Trust'], hook: 'Trust',
    opp: 'medium', thumbnail: 'https://placehold.co/120x90/22c55e/ffffff?text=Creative+4',
    isVideo: false, duration: null,
    saturation: 'Low', novelty: 'Low', confidence: 'Medium',
    offer: 'Guarantee', audience: 'Retail Brands', cta: 'Get Started', format: 'Static Image',
  },
]

const REF_ADS = [
  { id: 1, comp: 'PrintMagic Pro',  img: 'https://placehold.co/160x120/e2e8f0/94a3b8?text=Ref+1' },
  { id: 2, comp: 'DTFworld',        img: 'https://placehold.co/160x120/ddd6fe/7c3aed?text=Ref+2' },
  { id: 3, comp: 'PrintZone',       img: 'https://placehold.co/160x120/dcfce7/16a34a?text=Ref+3' },
  { id: 4, comp: 'ThreadBeast',     img: 'https://placehold.co/160x120/fee2e2/ef4444?text=Ref+4' },
  { id: 5, comp: 'VividPrints',     img: 'https://placehold.co/160x120/fef9c3/ca8a04?text=Ref+5' },
  { id: 6, comp: 'InkMaster',       img: 'https://placehold.co/160x120/e0f2fe/0284c7?text=Ref+6' },
]

const AVOID = [
  { id: 1, label: 'Heavy Discount / Price Only',  reason: 'High saturation 82% — competitors dominating this angle' },
  { id: 2, label: 'Generic Product Showcase',     reason: 'Low engagement trend across Facebook & Instagram' },
  { id: 3, label: 'Overly Promotional Text',      reason: 'Creative fatigue detected — declining CTR trend' },
]

const QUICK_ACTIONS = [
  { id: 1, icon: Sparkles,    title: 'Generate Creative Brief', sub: 'Turn recommendations into a full brief',      to: '/briefs' },
  { id: 2, icon: GitCompare,  title: 'Compare Similar Ads',     sub: 'See how competitors approach this angle',     to: '/ads'    },
  { id: 3, icon: Send,        title: 'Send to Design Team',     sub: 'Share via email or Slack notification',       action: () => toast.success('Sent to design team!') },
  { id: 4, icon: Bookmark,    title: 'Save Strategy',           sub: 'Save this recommendation set for later',      action: () => toast.success('Strategy saved!') },
  { id: 5, icon: Lightbulb,   title: 'Generate Ad Concept',     sub: 'Create an AI-generated concept for review',   to: '/briefs' },
]

const ANGLE_HEX = {
  Speed:       '#22C55E',
  Quality:     '#6366F1',
  Price:       '#F59E0B',
  Convenience: '#EC4899',
  Trust:       '#3B82F6',
  Innovation:  '#8B5CF6',
  Benefit:     '#14B8A6',
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Card({ title, subtitle, headerRight, children, className }) {
  return (
    <div className={cn('rounded-card border border-border-default bg-white shadow-card', className)}>
      {(title || headerRight) && (
        <div className="flex items-start justify-between gap-3 border-b border-border-default px-5 py-3.5">
          <div>
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

function RecoKPICard({ title, value, note, noteColor, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="rounded-card border border-border-default bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-text-primary">{value ?? '—'}</p>
          <p className={cn('mt-1 text-xs font-medium', noteColor ?? 'text-text-secondary')}>{note}</p>
        </div>
        <div className={cn('flex-shrink-0 rounded-xl p-2.5', iconBg)}>
          <Icon size={22} className={iconColor} />
        </div>
      </div>
    </div>
  )
}

function Sparkline({ data, color }) {
  return (
    <ResponsiveContainer width={72} height={28}>
      <LineChart data={data} margin={{ top: 3, right: 0, bottom: 3, left: 0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function DirIcon({ dir }) {
  if (dir === 'up')   return <TrendingUp  size={13} className="text-success-600" />
  if (dir === 'down') return <TrendingDown size={13} className="text-danger-500" />
  if (dir === 'opp')  return <Target       size={13} className="text-blue-500"   />
  return <Minus size={13} className="text-text-tertiary" />
}

function MarketIntelRow({ item }) {
  const deltaColor = item.dir === 'up' ? 'bg-success-50 text-success-700 ring-success-200'
                   : item.dir === 'down' ? 'bg-danger-50 text-danger-700 ring-danger-200'
                   : 'bg-blue-50 text-blue-700 ring-blue-200'
  const deltaLabel = item.dir === 'opp'  ? 'High Opp'
                   : item.dir === 'up'   ? `↑${item.delta}%`
                   :                       `↓${item.delta}%`
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex-shrink-0"><DirIcon dir={item.dir} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-text-primary leading-snug">{item.label}</p>
        <p className="mt-0.5 text-[11px] text-text-tertiary leading-snug">{item.desc}</p>
      </div>
      <Sparkline data={item.sparkData} color={item.sparkColor} />
      <span className={cn('inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', deltaColor)}>
        {deltaLabel}
      </span>
    </div>
  )
}

function AIScoreCircle({ score }) {
  const r = 22, circ = 2 * Math.PI * r
  const off = circ - (score / 100) * circ
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#E2E8F0" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r} fill="none" stroke="#6366F1" strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={off}
          strokeLinecap="round" transform="rotate(-90 28 28)"
        />
      </svg>
      <div className="absolute text-center leading-none">
        <span className="text-[12px] font-bold text-text-primary">{score}%</span>
        <br />
        <span className="text-[8px] text-text-tertiary">AI Score</span>
      </div>
    </div>
  )
}

function AnglePill({ angle }) {
  const hex = ANGLE_HEX[angle] ?? '#64748B'
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ring-0"
      style={{ backgroundColor: hex }}
    >
      {angle}
    </span>
  )
}

function levelPill(level, type) {
  if (type === 'saturation') {
    return level === 'Low'    ? 'bg-green-50 text-green-700 ring-green-200'
         : level === 'Medium' ? 'bg-amber-50 text-amber-700 ring-amber-200'
         : 'bg-red-50 text-red-700 ring-red-200'
  }
  return level === 'High'   ? 'bg-green-50 text-green-700 ring-green-200'
       : level === 'Medium' ? 'bg-amber-50 text-amber-700 ring-amber-200'
       : 'bg-gray-50 text-gray-600 ring-gray-200'
}

function MetricPill({ label, value, type }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] font-medium uppercase tracking-wide text-text-tertiary">{label}</span>
      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', levelPill(value, type))}>
        {value}
      </span>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="w-14 flex-shrink-0 text-text-tertiary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  )
}

function RecommendationCard({ rec }) {
  const navigate = useNavigate()
  const oppColor = rec.opp === 'high'   ? 'bg-green-50 text-green-700 ring-green-200'
                 : rec.opp === 'medium' ? 'bg-amber-50 text-amber-700 ring-amber-200'
                 : 'bg-gray-50 text-gray-600 ring-gray-200'
  const oppLabel = rec.opp === 'high'   ? 'High Opportunity'
                 : rec.opp === 'medium' ? 'Medium Opportunity'
                 : 'Low Opportunity'
  return (
    <div className="flex gap-3 rounded-xl border border-border-default bg-white p-4 shadow-sm transition-shadow hover:shadow-card-hover sm:gap-4">
      {/* Left: rank + score + opp */}
      <div className="flex w-[58px] flex-shrink-0 flex-col items-center gap-2.5 pt-0.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-600">
          {String(rec.rank).padStart(2, '0')}
        </div>
        <AIScoreCircle score={rec.score} />
        <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-center text-[9px] font-semibold ring-1 leading-tight', oppColor)}>
          {oppLabel}
        </span>
      </div>

      {/* Thumbnail */}
      <div className="relative hidden h-[90px] w-[110px] flex-shrink-0 overflow-hidden rounded-lg sm:block">
        <img src={rec.thumbnail} alt="" className="h-full w-full object-cover" />
        {rec.isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow">
              <Play size={12} className="ml-0.5 fill-primary-600 text-primary-600" />
            </div>
          </div>
        )}
        {rec.isVideo && rec.duration && (
          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
            {rec.duration}
          </span>
        )}
      </div>

      {/* Right: details */}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-snug text-text-primary">{rec.title}</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{rec.brief}</p>

        {/* Tags */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rec.angles.map((a) => <AnglePill key={a} angle={a} />)}
          <HookTypeBadge type={rec.hook} />
        </div>

        {/* Metrics */}
        <div className="mt-3 flex items-center gap-4 rounded-lg bg-gray-50/70 px-3 py-2">
          <MetricPill label="Saturation"  value={rec.saturation}  type="saturation"  />
          <MetricPill label="Novelty"     value={rec.novelty}     type="novelty"     />
          <MetricPill label="Confidence"  value={rec.confidence}  type="confidence"  />
        </div>

        {/* Detail rows */}
        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
          <DetailRow label="Offer"    value={rec.offer}    />
          <DetailRow label="Audience" value={rec.audience} />
          <DetailRow label="CTA"      value={rec.cta}      />
          <DetailRow label="Format"   value={rec.format}   />
        </div>

        {/* Actions */}
        <div className="mt-3 flex gap-2 border-t border-border-default pt-3">
          <Button variant="outline" size="sm" className="flex-1">View Details</Button>
          <Button
            variant="primary" size="sm" icon={Sparkles} className="flex-1"
            onClick={() => navigate(`/briefs/new?fromRecommendation=${rec.id}`)}
          >
            Generate Brief
          </Button>
        </div>
      </div>
    </div>
  )
}

function SortSelect() {
  const [val, setVal] = useState('AI Score')
  return (
    <select
      value={val}
      onChange={(e) => setVal(e.target.value)}
      className="h-7 rounded-btn border border-border-default bg-white px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      {['AI Score', 'Confidence', 'Saturation', 'Novelty'].map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  )
}

// ── Sticky quick action bar ───────────────────────────────────────────────────
function QuickActionBar() {
  const navigate = useNavigate()
  const { sidebarCollapsed } = useUIStore()
  return (
    <div className={cn(
      'fixed inset-x-0 bottom-0 z-20 border-t border-border-default bg-white/95 shadow-lg backdrop-blur-sm',
      'transition-all duration-200',
      sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-60',
    )}>
      <div className="flex items-stretch gap-0 overflow-x-auto divide-x divide-border-default">
        {QUICK_ACTIONS.map(({ id, icon: Icon, title, sub, to, action }) => {
          const handleClick = () => {
            if (action) action()
            else if (to) navigate(to)
          }
          return (
            <button
              key={id}
              type="button"
              onClick={handleClick}
              className="flex min-w-[160px] flex-1 flex-col items-center gap-1.5 px-4 py-3 text-center transition-colors hover:bg-gray-50/80"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                <Icon size={16} className="text-primary-600" />
              </div>
              <span className="text-xs font-semibold text-text-primary leading-tight">{title}</span>
              <span className="text-[10px] leading-tight text-text-tertiary">{sub}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RecommendationsPage() {
  return (
    <div className="space-y-6 p-4 pb-36 sm:p-6 sm:pb-36">
      <Breadcrumb />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-text-primary">AI Creative Recommendations</h1>
          <Badge color="indigo">Beta</Badge>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={Share2} onClick={() => toast.success('Share link copied!')}>Share</Button>
          <Button variant="outline" size="sm" icon={Bookmark} onClick={() => toast.success('Strategy saved!')}>Save Strategy</Button>
          <Button variant="primary" size="sm" icon={Sparkles} to="/briefs">Generate Creative Brief</Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <RecoKPICard
          title="Trending Angles"
          value={8}
          note="↑28% vs last 7 days"
          noteColor="text-success-600"
          icon={TrendingUp}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <RecoKPICard
          title="Saturated Hooks"
          value={5}
          note="↑14% saturation risk"
          noteColor="text-danger-600"
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
        <RecoKPICard
          title="Underserved Angles"
          value={6}
          note="Low competition"
          noteColor="text-blue-600"
          icon={Target}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <RecoKPICard
          title="Fastest Growing"
          value="Speed + Quality"
          note="↑32% growth"
          noteColor="text-primary-600"
          icon={Rocket}
          iconBg="bg-primary-50"
          iconColor="text-primary-600"
        />
        <RecoKPICard
          title="Recommended Themes"
          value={4}
          note="High opportunity"
          noteColor="text-amber-600"
          icon={Lightbulb}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
        />
        <RecoKPICard
          title="Market Heat Score"
          value="72 / 100"
          note="High activity"
          noteColor="text-red-600"
          icon={Flame}
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
      </div>

      {/* Three-column grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

        {/* ── LEFT ────────────────────────────────────────────────────────── */}
        <div className="space-y-5 xl:col-span-3">

          {/* Market Intelligence Summary */}
          <Card title="Market Intelligence Summary" subtitle="This Week">
            <div className="divide-y divide-border-default">
              {MARKET_INTEL.map((item) => (
                <MarketIntelRow key={item.id} item={item} />
              ))}
            </div>
            <Link
              to="/ai-analysis"
              className="mt-4 flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
            >
              View Full Market Report <ChevronRight size={12} />
            </Link>
          </Card>

          {/* AI Strategic Reasoning */}
          <Card title="AI Strategic Reasoning">
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                <Sparkles size={13} className="text-white" />
              </div>
              <p className="text-[12.5px] leading-relaxed text-text-secondary">
                Analysis suggests focusing on{' '}
                <span className="rounded bg-yellow-100 px-1 font-semibold text-yellow-800">
                  speed + quality
                </span>{' '}
                as a combined angle. Competitors either lead with speed alone or quality alone, creating
                a gap for{' '}
                <span className="rounded bg-yellow-100 px-1 font-semibold text-yellow-800">
                  fast results, reliability, and premium quality
                </span>{' '}
                messaging. The{' '}
                <span className="rounded bg-yellow-100 px-1 font-semibold text-yellow-800">
                  low saturation
                </span>{' '}
                in this combination makes it a high-opportunity creative direction with strong novelty signals.
              </p>
            </div>
          </Card>
        </div>

        {/* ── MIDDLE ──────────────────────────────────────────────────────── */}
        <div className="xl:col-span-6">
          <Card
            title="AI Recommended Creative Directions"
            headerRight={<SortSelect />}
          >
            <div className="space-y-4">
              {RECS.map((rec) => <RecommendationCard key={rec.id} rec={rec} />)}
            </div>
            <button
              type="button"
              className="mt-5 flex w-full items-center justify-center gap-1 text-xs font-medium text-primary-600 hover:underline"
            >
              View More Recommendations ↓
            </button>
          </Card>
        </div>

        {/* ── RIGHT ───────────────────────────────────────────────────────── */}
        <div className="space-y-5 xl:col-span-3">

          {/* Reference Competitor Ads */}
          <Card
            title="Reference Competitor Ads"
            headerRight={
              <Link to="/ads" className="text-xs font-medium text-primary-600 hover:underline">
                View All
              </Link>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              {REF_ADS.map((ad) => (
                <div key={ad.id} className="group cursor-pointer">
                  <div className="overflow-hidden rounded-lg border border-border-default">
                    <img
                      src={ad.img}
                      alt={ad.comp}
                      className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-1 truncate text-center text-[10px] font-medium text-text-secondary">
                    {ad.comp}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Avoid / Low Opportunity Angles */}
          <Card
            title="Avoid / Low Opportunity Angles"
            headerRight={
              <Link to="/angles" className="text-xs font-medium text-primary-600 hover:underline">
                View All
              </Link>
            }
          >
            <div className="space-y-3">
              {AVOID.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-lg border border-danger-100 bg-danger-50/40 p-3">
                  <TriangleAlert size={14} className="mt-0.5 flex-shrink-0 text-danger-500" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary">{item.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">{item.reason}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-4 text-xs font-medium text-danger-600 hover:underline"
            >
              See all saturated angles →
            </button>
          </Card>
        </div>
      </div>

      {/* Sticky quick action bar */}
      <QuickActionBar />
    </div>
  )
}
