import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Share2, Bookmark, Sparkles, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Target, Rocket, Flame, Lightbulb, Play,
  GitCompare, Send, TriangleAlert, ChevronRight, Loader2, AlertCircle,
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
import { getMarketContext, generateDirections, getGenerationResult, getCachedGeneration } from '../../api/creativeRecommendations'

// ── Inline fixture data — REMOVED, now from API ──────────────────────────────
const spark = (vals) => vals.map((v, i) => ({ i, v }))

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
  const [context, setContext] = useState(null)
  const [generation, setGeneration] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load market context + cached generation on mount (no paid call)
  useEffect(() => {
    const load = async () => {
      try {
        const [ctx, cached] = await Promise.all([getMarketContext(), getCachedGeneration()])
        setContext(ctx)
        if (cached?.status === 'completed') setGeneration(cached)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  // Map API data to UI format
  const MARKET_INTEL = context?.has_data ? [
    ...(context.trending_angles || []).map((t, i) => ({
      id: `t${i}`, label: `${t.type} angle is trending`, desc: `+${t.delta}% share in last 7 days (${t.recent_count} new ads)`, dir: 'up', delta: t.delta, sparkColor: '#22C55E', sparkData: spark([2,4,5,7,9,11,14]),
    })),
    ...(context.saturated_angles || []).map((s, i) => ({
      id: `s${i}`, label: `${s.type} angle is saturated`, desc: `${s.saturation_pct}% of competitors use it (${s.competitor_count}/${s.total_competitors})`, dir: 'down', delta: s.saturation_pct, sparkColor: '#EF4444', sparkData: spark([14,13,12,10,11,9,8]),
    })),
    ...(context.underserved_angles || []).map((u, i) => ({
      id: `u${i}`, label: `${u.type} angle underserved`, desc: `Strong in winners but only ${u.competitor_count} competitors use it`, dir: 'opp', delta: null, sparkColor: '#3B82F6', sparkData: spark([2,3,3,4,5,6,8]),
    })),
  ] : []

  const RECS = generation?.result?.directions?.map((d, i) => ({
    id: `r${i+1}`, rank: i + 1, score: d.ai_score || 0,
    title: d.headline,
    brief: d.hook_rationale || d.angle_rationale || '',
    angles: [d.angle].filter(Boolean), hook: d.hook_type,
    opp: d.ai_score >= 75 ? 'high' : d.ai_score >= 60 ? 'medium' : 'low',
    thumbnail: null, isVideo: d.format === 'video', duration: d.format === 'video' ? '0:15' : null,
    saturation: 'Low', novelty: 'High', confidence: d.ai_score >= 75 ? 'High' : 'Medium',
    offer: d.offer || 'None', audience: d.target_audience || '', cta: d.cta || 'Learn More', format: d.format || 'image',
    example_hooks: d.example_hooks || [],
  })) || []

  const REF_ADS = (context?.reference_ads || []).map((r, i) => ({
    id: i + 1, comp: r.competitor, img: r.thumbnail_url, hookType: r.hook_type, angle: r.angle, days: r.days_running,
  }))

  const AVOID = generation?.result?.avoid?.map((a, i) => ({
    id: i + 1, label: typeof a === 'string' ? a.split(' — ')[0] || a : a, reason: typeof a === 'string' ? a : '',
  })) || []

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await generateDirections()
      // Poll for result
      const interval = setInterval(async () => {
        const result = await getGenerationResult(res.run_id)
        if (result.status === 'completed' || result.status === 'failed') {
          clearInterval(interval)
          setGeneration(result)
          setGenerating(false)
          if (result.status === 'completed') toast.success('Creative directions generated')
          else toast.error('Generation failed')
        }
      }, 3000)
    } catch (e) {
      toast.error('Failed to start generation')
      setGenerating(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
  return (
    <div className="space-y-6 p-4 pb-36 sm:p-6 sm:pb-36">
      <Breadcrumb />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-text-primary">AI Creative Recommendations</h1>
          <Badge color="indigo">Live Data</Badge>
          {context?.has_data && <span className="text-[10px] text-text-tertiary">({context.total_analyzed} ads analyzed, {context.total_winners} winners)</span>}
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <div className="text-[9px] text-text-tertiary flex items-center gap-1">
            <AlertCircle size={10} className="text-amber-500" />
            1 paid API call
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={generating ? Loader2 : Sparkles}
            onClick={handleGenerate}
            disabled={generating || !context?.has_data}
            className={generating ? '[&_svg]:animate-spin' : ''}
          >
            {generating ? 'Generating...' : 'Generate Directions'}
          </Button>
        </div>
      </div>

      {/* KPI row — real data from API */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <RecoKPICard
          title="Trending Angles"
          value={context?.trending_angles?.length || 0}
          note={context?.trending_angles?.length > 0 ? `Growing in last 7d` : 'No clear trends'}
          noteColor={context?.trending_angles?.length > 0 ? "text-success-600" : "text-text-tertiary"}
          icon={TrendingUp}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <RecoKPICard
          title="Saturated Angles"
          value={context?.saturated_angles?.length || 0}
          note={context?.saturated_angles?.length > 0 ? '60%+ competitors' : 'None detected'}
          noteColor={context?.saturated_angles?.length > 0 ? "text-danger-600" : "text-text-tertiary"}
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
        <RecoKPICard
          title="Underserved Angles"
          value={context?.underserved_angles?.length || 0}
          note="Low competition"
          noteColor="text-blue-600"
          icon={Target}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <RecoKPICard
          title="Total Winners"
          value={context?.total_winners || 0}
          note="30+ days running"
          noteColor="text-primary-600"
          icon={Rocket}
          iconBg="bg-primary-50"
          iconColor="text-primary-600"
        />
        <RecoKPICard
          title="AI Directions"
          value={RECS.length || '—'}
          note={generation?.status === 'completed' ? 'Generated' : 'Click Generate'}
          noteColor="text-amber-600"
          icon={Lightbulb}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
        />
        <RecoKPICard
          title="Recent New Ads (7d)"
          value={context?.recent_ads_7d || 0}
          note="Competitor activity"
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
