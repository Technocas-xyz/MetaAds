import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, Download, TrendingUp,
  DollarSign, Users, Target, BarChart2, Zap,
  CheckCircle, AlertTriangle, ChevronRight,
  Layers, Send,
  Columns3, SlidersHorizontal, LayoutGrid, Eye,
  ArrowUpRight, ArrowDownRight, ShoppingBag,
  GitCompare, Boxes, FileText, Shuffle, MonitorPlay,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Button from '../../components/ui/Button'
import DateRangePicker from '../../components/ui/DateRangePicker'
import useUIStore from '../../store/useUIStore'
import { useCreativePerformance } from '../../hooks/queries/usePerformance'

// ── Fixture data ──────────────────────────────────────────────────────────────
const KPI_DATA = [
  { title: 'Total Creatives',         value: '428',        trend: 16.8, up: true,  icon: Layers,       iconBg: 'bg-primary-50',  iconColor: 'text-primary-600' },
  { title: 'Total Spend',             value: '$45,231.68', trend: 12.6, up: true,  icon: DollarSign,   iconBg: 'bg-indigo-50',   iconColor: 'text-indigo-600' },
  { title: 'Leads (Total)',           value: '1,246',      trend: 23.4, up: true,  icon: Users,        iconBg: 'bg-green-50',    iconColor: 'text-green-600' },
  { title: 'Cost Per Lead',           value: '$36.30',     trend: 8.7,  up: false, icon: Target,       iconBg: 'bg-amber-50',    iconColor: 'text-amber-600' },
  { title: 'Conversions (Customers)', value: '284',        trend: 18.8, up: true,  icon: ShoppingBag,  iconBg: 'bg-blue-50',     iconColor: 'text-blue-600' },
  { title: 'CPA (Cost/Acquisition)',  value: '$159.26',    trend: 9.3,  up: false, icon: BarChart2,    iconBg: 'bg-purple-50',   iconColor: 'text-purple-600' },
  { title: 'Revenue (From Ads)',      value: '$78,652.40', trend: 24.3, up: true,  icon: Zap,          iconBg: 'bg-emerald-50',  iconColor: 'text-emerald-600' },
  { title: 'ROAS (Revenue/Spend)',    value: '1.74x',      trend: 10.4, up: true,  icon: TrendingUp,   iconBg: 'bg-rose-50',     iconColor: 'text-rose-600' },
]

const PERF_TIMELINE = [
  { date: 'Apr 30', spend: 6200,  leads: 168, conversions: 38, roas: 1.62 },
  { date: 'May 01', spend: 6480,  leads: 175, conversions: 41, roas: 1.68 },
  { date: 'May 02', spend: 6150,  leads: 162, conversions: 36, roas: 1.59 },
  { date: 'May 03', spend: 6890,  leads: 192, conversions: 44, roas: 1.78 },
  { date: 'May 04', spend: 7210,  leads: 201, conversions: 47, roas: 1.85 },
  { date: 'May 05', spend: 6740,  leads: 183, conversions: 40, roas: 1.71 },
  { date: 'May 06', spend: 5560,  leads: 165, conversions: 38, roas: 1.65 },
]

const FUNNEL = [
  { stage: 'Impressions', count: 2645231, pct: null,     metric: '$0.02 CPM',    color: 'bg-indigo-500', width: 100 },
  { stage: 'Clicks',      count: 86452,   pct: '3.04%',  metric: '$0.52 CPC',    color: 'bg-blue-500',   width: 72 },
  { stage: 'Leads',       count: 1246,    pct: '1.44%',  metric: '$36.30 CPL',   color: 'bg-amber-500',  width: 46 },
  { stage: 'Conversions', count: 284,     pct: '22.78%', metric: '$159.26 CPA',  color: 'bg-green-500',  width: 28 },
]

const WHAT_WORKING = [
  'UGC Video creatives are generating 2.1x more leads.',
  "Hook type 'Benefit Driven' has the lowest CPL ($28.14).",
  "Offers with 'Free Shipping' get 35% higher conversion rate.",
  'Creatives with strong first 3s attention perform better.',
]

const NEEDS_ATTENTION = [
  'Pain Point hooks show high CTR but low conversion (12.1%).',
  'Image ads have 28% higher CPL compared to videos.',
  'Frequency > 3.5 is increasing CPL by 32%.',
  '3 creatives are showing fatigue (CTR down > 25%).',
]

const DISTRIBUTION = [
  { name: 'High Performers (ROAS > 2x)', value: 67,  pct: '15.7%', color: '#22C55E' },
  { name: 'Average Performers (1x–2x)',  value: 182, pct: '42.5%', color: '#3B82F6' },
  { name: 'Low Performers (<1x)',        value: 111, pct: '25.9%', color: '#F59E0B' },
  { name: 'Unprofitable (ROAS < 0.5x)', value: 68,  pct: '15.9%', color: '#EF4444' },
]

const AI_RECS = [
  {
    id: 'r1',
    title: 'Scale Top Creatives',
    priority: 'high',
    desc: 'Increase budget on 3 high performing creatives ROAS > 2x with low CPL.',
    action: 'View Creatives',
    actionHref: '/performance',
  },
  {
    id: 'r2',
    title: 'Pause Low Performers',
    priority: 'high',
    desc: 'Pause 7 creatives with high spend but low leads & conversions.',
    action: 'View Creatives',
    actionHref: '/performance',
  },
  {
    id: 'r3',
    title: 'Refresh Fatigued Creatives',
    priority: 'medium',
    desc: '3 creatives are showing fatigue signs. CTR dropped > 25% in 7 days.',
    action: 'View Creatives',
    actionHref: '/performance',
  },
  {
    id: 'r4',
    title: 'Test New Hooks',
    priority: 'medium',
    desc: 'Benefit hooks are winning. Test 4 new benefit-driven hooks.',
    action: 'Create Brief',
    actionHref: '/briefs/new',
  },
  {
    id: 'r5',
    title: 'Improve Conversion Rate',
    priority: 'low',
    desc: 'Add urgency or social proof to top 5 high lead but low conversion creatives.',
    action: 'View Suggestions',
    actionHref: '/recommendations',
  },
]

const QUICK_ACTIONS = [
  { icon: GitCompare,  label: 'Compare Creatives',  href: '/performance' },
  { icon: Boxes,       label: 'Creative Clusters',   href: '/performance' },
  { icon: FileText,    label: 'AI Creative Brief',   href: '/briefs/new' },
  { icon: Shuffle,     label: 'Create Variants',     href: '/creative-review' },
  { icon: Send,        label: 'Send to Review',      href: '/review' },
  { icon: MonitorPlay, label: 'Create Campaign',     href: '/campaigns' },
]

const CPL_BENCHMARK = 40

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt$(n) { return `$${n.toFixed(2)}` }

function PriorityBadge({ priority }) {
  const cfg = {
    high:   'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low:    'bg-blue-100 text-blue-600',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${cfg[priority]}`}>
      {priority}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = {
    high:    { cls: 'bg-green-100 text-green-700',  label: 'High Performer' },
    average: { cls: 'bg-amber-100 text-amber-700',  label: 'Average' },
    low:     { cls: 'bg-red-100   text-red-700',    label: 'Low Performer' },
  }
  const { cls, label } = cfg[status] ?? cfg.low
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>
}

// ── KPI shimmer ───────────────────────────────────────────────────────────────
function KPIShimmer() {
  return (
    <div className="animate-pulse rounded-card border border-border-default bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-gray-200" />
          <div className="h-8 w-20 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}

// ── Performance over time chart ───────────────────────────────────────────────
const LINE_TOOLTIP_STYLE = {
  contentStyle: { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,.08)' },
  itemStyle: { padding: '1px 0' },
}

function PerformanceLineChart() {
  return (
    <div className="rounded-card border border-border-default bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text-primary">Performance Over Time</p>
          <p className="text-xs text-text-tertiary">All Creatives</p>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-text-secondary">Last 7 Days</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
        {[['Spend','#6366F1'],['Leads','#22C55E'],['Conversions','#F59E0B'],['ROAS','#EC4899']].map(([l,c]) => (
          <span key={l} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span className="h-2 w-4 rounded-sm" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={PERF_TIMELINE} margin={{ top: 4, right: 32, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
            width={42}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip {...LINE_TOOLTIP_STYLE} formatter={(v, name) => name === 'spend' ? fmt$(v) : name === 'roas' ? `${v}x` : v} />
          <Line yAxisId="left"  type="monotone" dataKey="spend"       stroke="#6366F1" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="leads"       stroke="#22C55E" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#F59E0B" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="roas"        stroke="#EC4899" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Funnel card ───────────────────────────────────────────────────────────────
function FunnelStageRow({ stage, count, pct, metric, color, width }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span className="font-medium text-text-primary">{stage}</span>
        <span>{pct ?? ''}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-7 flex-1 items-center overflow-hidden rounded" style={{ background: '#f1f5f9' }}>
          <div
            className={`flex h-full items-center justify-center text-[10px] font-bold text-white ${color}`}
            style={{ width: `${width}%`, minWidth: 40 }}
          >
            {count.toLocaleString()}
          </div>
        </div>
        <span className="w-28 shrink-0 text-right text-[10px] text-text-tertiary">{metric}</span>
      </div>
    </div>
  )
}

function FunnelCard() {
  return (
    <div className="rounded-card border border-border-default bg-white p-5 shadow-card">
      <p className="mb-4 text-sm font-semibold text-text-primary">Performance by Funnel Stage</p>
      <div className="space-y-3">
        {FUNNEL.map((s) => (
          <FunnelStageRow key={s.stage} {...s} />
        ))}
      </div>
      <p className="mt-3 text-[10px] text-text-tertiary">
        Total spend: $45,231.68 across all stages
      </p>
    </div>
  )
}

// ── AI Performance Summary ────────────────────────────────────────────────────
function AIPerformanceSummary() {
  return (
    <div className="rounded-card border border-border-default bg-white p-5 shadow-card">
      <div className="mb-4">
        <p className="text-sm font-semibold text-text-primary">AI Performance Summary</p>
        <p className="text-xs text-text-tertiary">Based on creative results</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* What's working */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-green-800">
            <CheckCircle size={12} className="text-green-600" />
            What's Working
          </p>
          <ul className="space-y-1.5">
            {WHAT_WORKING.map((t, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <CheckCircle size={11} className="mt-0.5 shrink-0 text-green-500" />
                <span className="text-[11px] leading-snug text-green-900">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Needs attention */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-red-800">
            <AlertTriangle size={12} className="text-red-500" />
            Needs Attention
          </p>
          <ul className="space-y-1.5">
            {NEEDS_ATTENTION.map((t, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <AlertTriangle size={11} className="mt-0.5 shrink-0 text-red-500" />
                <span className="text-[11px] leading-snug text-red-900">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ── Donut distribution chart ──────────────────────────────────────────────────
const DONUT_TOOLTIP_STYLE = {
  contentStyle: { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' },
}

function CreativeDistribution() {
  return (
    <div className="rounded-card border border-border-default bg-white p-5 shadow-card">
      <p className="mb-1 text-sm font-semibold text-text-primary">Creative Performance Distribution</p>
      <p className="mb-3 text-xs text-text-tertiary">All 428 creatives by ROAS tier</p>
      <div className="relative mx-auto" style={{ width: '100%', maxWidth: 240 }}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={DISTRIBUTION}
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={88}
              dataKey="value"
              strokeWidth={2}
            >
              {DISTRIBUTION.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              {...DONUT_TOOLTIP_STYLE}
              formatter={(v, name) => [`${v} creatives`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-bold text-text-primary">428</p>
            <p className="text-[10px] text-text-secondary">Creatives</p>
          </div>
        </div>
      </div>
      <ul className="mt-2 space-y-1.5">
        {DISTRIBUTION.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="shrink-0 text-[11px] font-semibold text-text-primary">{d.value} <span className="font-normal text-text-tertiary">({d.pct})</span></span>
          </li>
        ))}
      </ul>
      <button className="mt-3 text-[11px] font-medium text-primary-600 hover:underline">
        View all creative segments →
      </button>
    </div>
  )
}

// ── Creatives table ───────────────────────────────────────────────────────────
function CreativeRow({ row, onRowClick }) {
  const cplColor = row.cpl <= CPL_BENCHMARK ? 'text-green-600' : 'text-red-600'
  const roasColor = row.roas >= 2 ? 'text-green-600' : row.roas >= 1 ? 'text-amber-600' : 'text-red-600'
  const ctrColor  = row.ctr >= 3 ? 'text-green-600' : row.ctr >= 2 ? 'text-amber-600' : 'text-red-600'

  return (
    <tr
      className="cursor-pointer border-b border-border-default transition-colors hover:bg-gray-50"
      onClick={() => onRowClick(row.id)}
    >
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <img src={row.thumbnail} alt="" className="h-10 w-10 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">{row.name}</p>
            <p className="text-[11px] text-text-tertiary">{row.format} {row.length}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <p className="text-xs font-medium text-text-primary">{row.hook}</p>
        <p className="text-[11px] text-text-tertiary">{row.angle}</p>
      </td>
      <td className="px-3 py-3 text-xs text-text-secondary">{row.format} {row.length}</td>
      <td className="px-3 py-3 text-right text-xs font-medium text-text-primary">{fmt$(row.spend)}</td>
      <td className="px-3 py-3 text-right text-sm font-semibold text-text-primary">{row.leads}</td>
      <td className={`px-3 py-3 text-right text-xs font-semibold ${cplColor}`}>{fmt$(row.cpl)}</td>
      <td className="px-3 py-3 text-right text-sm font-semibold text-text-primary">{row.conversions}</td>
      <td className="px-3 py-3 text-right text-xs text-text-secondary">{fmt$(row.cpa)}</td>
      <td className={`px-3 py-3 text-right text-xs font-bold ${roasColor}`}>{row.roas}x</td>
      <td className={`px-3 py-3 text-right text-xs font-medium ${ctrColor}`}>{row.ctr}%</td>
      <td className="px-3 py-3 text-right text-xs text-text-secondary">{row.frequency}</td>
      <td className="px-3 py-3 text-right">
        <StatusBadge status={row.status} />
      </td>
    </tr>
  )
}

function CreativesTable({ creatives, loading }) {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('table')

  const TH = ({ children, className = '' }) => (
    <th className={`px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-tertiary ${className}`}>
      {children}
    </th>
  )

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 rounded-card border border-border-default bg-white p-5 shadow-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded bg-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-card border border-border-default bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">Top Performing Creatives</p>
          <p className="text-xs text-text-tertiary">By Leads &amp; Conversions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(v => v === 'table' ? 'grid' : 'table')}
            className="flex h-8 w-8 items-center justify-center rounded-btn border border-border-default bg-white text-text-secondary transition-colors hover:bg-gray-50"
            title="Toggle view"
          >
            {viewMode === 'table' ? <LayoutGrid size={15} /> : <Columns3 size={15} />}
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-btn border border-border-default bg-white px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-gray-50">
            <Eye size={13} /> Columns
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-btn border border-border-default bg-white px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-gray-50">
            <SlidersHorizontal size={13} /> Filters
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50">
            <tr>
              <TH className="w-10" />
              <TH className="min-w-[160px]">Creative</TH>
              <TH className="min-w-[120px]">Hook / Angle</TH>
              <TH className="min-w-[90px]">Format</TH>
              <TH className="min-w-[80px] text-right">Spend</TH>
              <TH className="w-16 text-right">Leads</TH>
              <TH className="w-20 text-right">CPL</TH>
              <TH className="w-24 text-right">Conversions</TH>
              <TH className="w-20 text-right">CPA</TH>
              <TH className="w-20 text-right">ROAS</TH>
              <TH className="w-16 text-right">CTR</TH>
              <TH className="w-20 text-right">Frequency</TH>
              <TH className="min-w-[110px] text-right">Status</TH>
            </tr>
          </thead>
          <tbody>
            {creatives.map((row) => (
              <CreativeRow key={row.id} row={row} onRowClick={(id) => navigate(`/performance/creative/${id}`)} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border-default px-5 py-3">
        <p className="text-xs text-text-tertiary">
          Showing 1 to {creatives.length} of 428 creatives
        </p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, '…', 86].map((p, i) => (
            <button
              key={i}
              className={`flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-xs transition-colors ${
                p === 1
                  ? 'bg-primary-600 font-semibold text-white'
                  : 'text-text-secondary hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── AI Recommendations card ───────────────────────────────────────────────────
function AIRecommendationsCard() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col rounded-card border border-border-default bg-white shadow-card">
      <div className="border-b border-border-default px-5 py-4">
        <p className="text-sm font-semibold text-text-primary">AI Recommendations</p>
        <p className="text-xs text-text-tertiary">Creative Based</p>
      </div>
      <div className="flex-1 divide-y divide-border-default">
        {AI_RECS.map((rec) => (
          <div key={rec.id} className="px-4 py-3.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-text-primary">{rec.title}</p>
              <PriorityBadge priority={rec.priority} />
            </div>
            <p className="mb-2 text-[11px] leading-relaxed text-text-secondary">{rec.desc}</p>
            <button
              onClick={() => navigate(rec.actionHref)}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:underline"
            >
              {rec.action} <ChevronRight size={11} />
            </button>
          </div>
        ))}
      </div>
      <div className="p-4">
        <button
          onClick={() => navigate('/recommendations')}
          className="flex w-full items-center justify-center gap-2 rounded-btn bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          View All Recommendations
        </button>
      </div>
    </div>
  )
}

// ── Bottom quick-action bar ───────────────────────────────────────────────────
function QuickActionBar() {
  const navigate = useNavigate()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const offset = collapsed ? 'lg:pl-[72px]' : 'lg:pl-60'

  return (
    <div className={`fixed bottom-0 inset-x-0 z-20 border-t border-border-default bg-white shadow-lg ${offset}`}>
      <div className="flex items-center justify-center gap-1 overflow-x-auto px-4 py-2">
        {QUICK_ACTIONS.map(({ icon: Icon, label, href }) => (
          <button
            key={label}
            onClick={() => navigate(href)}
            className="flex min-w-[110px] flex-col items-center gap-1 rounded-xl px-3 py-2.5 text-center transition-colors hover:bg-gray-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-50">
              <Icon size={16} className="text-primary-600" />
            </span>
            <span className="text-[10px] font-medium text-text-secondary">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PerformancePage() {
  const { data, isLoading } = useCreativePerformance()
  const creatives = data?.data ?? []

  return (
    <div className="space-y-6 p-4 pb-28 sm:p-6">
      <Breadcrumb />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-text-primary">Creative Performance Intelligence</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
              <Zap size={11} /> AI
            </span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Deep insights from individual ad creative performance including leads &amp; conversions
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DateRangePicker />
          <Button variant="outline" size="sm" icon={RefreshCw}>Sync with Meta Ads API</Button>
          <Button variant="outline" size="sm" icon={Download}>Export Report</Button>
        </div>
      </div>

      {/* 8 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
        {KPI_DATA.map((kpi) => (
          <div
            key={kpi.title}
            className="rounded-card border border-border-default bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-text-secondary">{kpi.title}</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-text-primary">{kpi.value}</p>
                <div className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${kpi.up ? 'text-success-600' : 'text-danger-600'}`}>
                  {kpi.up
                    ? <ArrowUpRight size={11} />
                    : <ArrowDownRight size={11} />}
                  <span>{kpi.up ? '↑' : '↓'}{kpi.trend}% vs last 7d</span>
                </div>
              </div>
              <div className={`shrink-0 rounded-xl p-2 ${kpi.iconBg}`}>
                <kpi.icon size={18} className={kpi.iconColor} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4-chart grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <PerformanceLineChart />
        <FunnelCard />
        <AIPerformanceSummary />
        <CreativeDistribution />
      </div>

      {/* Table + AI Recommendations */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <CreativesTable creatives={creatives} loading={isLoading} />
        <AIRecommendationsCard />
      </div>

      <QuickActionBar />
    </div>
  )
}
