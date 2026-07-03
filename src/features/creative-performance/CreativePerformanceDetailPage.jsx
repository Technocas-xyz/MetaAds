import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play, PenLine, MoreHorizontal, Plus, Eye,
  TrendingUp, Zap, Target, BarChart2, Lightbulb,
  ArrowUpRight, ChevronDown, ExternalLink, ChevronRight,
  CheckCircle,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Button from '../../components/ui/Button'
import DateRangePicker from '../../components/ui/DateRangePicker'

// ── Fixture data ──────────────────────────────────────────────────────────────
const sp = (vals) => vals.map((v, i) => ({ i, v }))

const KPI_DATA = [
  { label: 'Impressions',       value: '128,549',  delta: '↑18.4%',  deltaRaw: '+18.4%',  positive: true,  spark: sp([98,105,112,110,118,122,128])  },
  { label: 'CTR (All)',         value: '2.81%',    delta: '↑0.42pp', deltaRaw: '+0.42pp', positive: true,  spark: sp([2.4,2.5,2.6,2.5,2.7,2.75,2.81]) },
  { label: 'Link Clicks',       value: '3,612',    delta: '↑19.7%',  deltaRaw: '+19.7%',  positive: true,  spark: sp([2980,3050,3100,3200,3400,3320,3612]) },
  { label: 'Conversions',       value: '186',      delta: '↑19.7%',  deltaRaw: '+19.7%',  positive: true,  spark: sp([152,155,158,162,168,172,186])  },
  { label: 'Conversion Rate',   value: '5.15%',    delta: '↑0.63pp', deltaRaw: '+0.63pp', positive: true,  spark: sp([4.8,4.85,4.9,5.0,5.1,5.1,5.15]) },
  { label: 'Total Sales',       value: '$6,742',   delta: '↑28.3%',  deltaRaw: '+28.3%',  positive: true,  spark: sp([5100,5300,5500,5700,6100,5900,6742]) },
  { label: 'AOV',               value: '$36.24',   delta: '↑3.8%',   deltaRaw: '+3.8%',   positive: true,  spark: sp([34.0,34.2,34.8,35.0,35.5,35.8,36.24]) },
  { label: 'ROAS',              value: '2.87x',    delta: '↑0.62x',  deltaRaw: '+0.62x',  positive: true,  spark: sp([2.2,2.3,2.4,2.5,2.7,2.6,2.87]) },
]

const TREND_DATA = [
  { date: 'Apr 30', impressions: 18234, clicks: 512,  conversions: 26, sales: 941  },
  { date: 'May 01', impressions: 19102, clicks: 547,  conversions: 28, sales: 1012 },
  { date: 'May 02', impressions: 17648, clicks: 496,  conversions: 25, sales: 901  },
  { date: 'May 03', impressions: 19876, clicks: 558,  conversions: 29, sales: 1052 },
  { date: 'May 04', impressions: 20312, clicks: 566,  conversions: 30, sales: 1086 },
  { date: 'May 05', impressions: 18942, clicks: 534,  conversions: 27, sales: 976  },
  { date: 'May 06', impressions: 14435, clicks: 399,  conversions: 21, sales: 774  },
]

const PLACEMENT_DATA = [
  { name: 'Facebook Feed',     pct: 45.2, value: '$3,043.21', color: '#3B82F6' },
  { name: 'Instagram Feed',    pct: 26.8, value: '$1,806.90', color: '#8B5CF6' },
  { name: 'Instagram Stories', pct: 15.6, value: '$1,051.78', color: '#EC4899' },
  { name: 'Facebook Stories',  pct: 7.8,  value: '$526.09',   color: '#6366F1' },
  { name: 'Audience Network',  pct: 2.4,  value: '$161.81',   color: '#F59E0B' },
  { name: 'Messenger',         pct: 2.2,  value: '$148.33',   color: '#22C55E' },
]

const DEVICE_DATA = [
  { name: 'Mobile',  pct: 88.3, value: '$5,949.33', color: '#6366F1' },
  { name: 'Desktop', pct: 8.7,  value: '$586.71',   color: '#22C55E' },
  { name: 'Tablet',  pct: 3.0,  value: '$206.14',   color: '#F59E0B' },
]

const DAILY_ROWS = [
  { date: 'Apr 30', impr: '18,234', clicks: '512', ctr: '2.81%', conv: '26', cvr: '5.08%', sales: '$941.26',   aov: '$36.20', roas: '2.82x' },
  { date: 'May 01', impr: '19,102', clicks: '547', ctr: '2.86%', conv: '28', cvr: '5.12%', sales: '$1,012.40', aov: '$36.16', roas: '2.90x' },
  { date: 'May 02', impr: '17,648', clicks: '496', ctr: '2.81%', conv: '25', cvr: '5.04%', sales: '$900.75',   aov: '$36.03', roas: '2.81x' },
  { date: 'May 03', impr: '19,876', clicks: '558', ctr: '2.81%', conv: '29', cvr: '5.20%', sales: '$1,052.34', aov: '$36.29', roas: '2.88x' },
  { date: 'May 04', impr: '20,312', clicks: '566', ctr: '2.79%', conv: '30', cvr: '5.30%', sales: '$1,085.70', aov: '$36.19', roas: '2.91x' },
  { date: 'May 05', impr: '18,942', clicks: '534', ctr: '2.82%', conv: '27', cvr: '5.06%', sales: '$975.88',   aov: '$36.14', roas: '2.85x' },
  { date: 'May 06', impr: '14,435', clicks: '399', ctr: '2.76%', conv: '21', cvr: '5.26%', sales: '$773.85',   aov: '$36.85', roas: '2.88x' },
]

const DAILY_FOOTER = {
  date: 'Total / Avg', impr: '128,549', clicks: '3,612', ctr: '2.81%',
  conv: '186', cvr: '5.15%', sales: '$6,742.18', aov: '$36.24', roas: '2.87x',
}

const TOP_CONVERSIONS = [
  { rank: 1, orderId: 'ORD-48291', value: 89.99 },
  { rank: 2, orderId: 'ORD-48156', value: 79.99 },
  { rank: 3, orderId: 'ORD-47934', value: 69.99 },
  { rank: 4, orderId: 'ORD-47821', value: 64.99 },
  { rank: 5, orderId: 'ORD-47698', value: 59.99 },
]

const AGE_DATA = [
  { label: '18-24', pct: 22.4, color: '#6366F1' },
  { label: '25-34', pct: 41.7, color: '#3B82F6' },
  { label: '35-44', pct: 22.8, color: '#22C55E' },
  { label: '45-54', pct: 9.3,  color: '#F59E0B' },
  { label: '55+',   pct: 3.8,  color: '#EF4444' },
]

const AI_INSIGHTS = [
  { icon: TrendingUp, iconBg: 'bg-green-100',  iconColor: 'text-green-600',  heading: 'Strong Performer',       text: 'This creative is performing 28.3% better than your account average in total sales.' },
  { icon: Zap,        iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   heading: 'High Converting Hook',   text: '"Same Day Shipping" hook shows high engagement with 2.81% CTR.' },
  { icon: Target,     iconBg: 'bg-purple-100', iconColor: 'text-purple-600', heading: 'Conversion Driver',      text: 'Free Shipping offer is driving 5.15% conversion rate, higher than account avg.' },
  { icon: BarChart2,  iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',  heading: 'Scaling Opportunity',    text: 'Consider increasing budget. This creative has maintained stable performance for 7 days.' },
  { icon: Eye,        iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', heading: 'Placement Insight',      text: 'Facebook Feed and Instagram Feed are the top revenue drivers — 72% of total sales.' },
  { icon: Lightbulb,  iconBg: 'bg-orange-100', iconColor: 'text-orange-600', heading: 'Optimization Suggestion',text: 'Test shorter version (6s) for Stories placements to improve CTR and lower CPV.' },
]

const META_ROWS = [
  { label: 'Format',     value: 'UGC Video 15s',       editable: false },
  { label: 'Hook/Angle', value: 'Speed + Quality',     editable: true  },
  { label: 'Offer',      value: 'Free Shipping $49+',  editable: true  },
  { label: 'CTA',        value: 'Order Now',           editable: false },
  { label: 'Targeting',  value: 'Broad',               editable: false },
  { label: 'First Seen', value: 'Apr 18, 2026',        editable: false },
]

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'daily',    label: 'Daily'    },
  { value: 'weekly',   label: 'Weekly'   },
  { value: 'overall',  label: 'Overall'  },
]

// ── Small helpers ─────────────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  contentStyle: { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,.08)' },
}

function Sparkline({ data, color = '#6366F1', positive = true }) {
  const stroke = positive ? '#22C55E' : '#EF4444'
  return (
    <ResponsiveContainer width="100%" height={28}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke={stroke} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function DonutChart({ data, total, title, subtitle }) {
  return (
    <div className="rounded-card border border-border-default bg-white p-5 shadow-card">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {subtitle && <p className="text-xs text-text-tertiary">{subtitle}</p>}
      <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={46} outerRadius={72} dataKey="pct" strokeWidth={2}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v, name) => [`${v}%`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-sm font-bold text-text-primary">{total}</p>
            <p className="text-[10px] text-text-tertiary">Total Sales</p>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5">
          {data.map((d) => (
            <li key={d.name} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
                {d.name}
              </span>
              <span className="text-[11px] font-semibold text-text-primary">
                {d.pct}% <span className="font-normal text-text-tertiary">({d.value})</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CreativePerformanceDetailPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [compareMode, setCompareMode] = useState(false)
  const [tablePeriod, setTablePeriod] = useState('Daily')
  const [audienceDim, setAudienceDim] = useState('By Age')

  const TH = ({ children, right = false }) => (
    <th className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
  const TD = ({ children, right = false, className = '' }) => (
    <td className={`whitespace-nowrap px-3 py-2.5 text-xs text-text-primary ${right ? 'text-right' : ''} ${className}`}>
      {children}
    </td>
  )

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Performance Intelligence', to: '/performance' },
        { label: 'Creative Performance',     to: '/performance' },
        { label: 'Fast DTF Transfers - Same Day Shipping' },
      ]} />

      {/* ── Header card ────────────────────────────────────────────────────── */}
      <div className="rounded-card border border-border-default bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: thumbnail + meta */}
          <div className="flex min-w-0 flex-1 items-start gap-4">
            {/* Video thumbnail */}
            <div className="relative shrink-0 overflow-hidden rounded-xl bg-gray-900" style={{ width: 120, height: 90 }}>
              <img
                src="https://picsum.photos/seed/dtf-video/240/180"
                alt="Creative thumbnail"
                className="h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow">
                  <Play size={18} className="ml-0.5 text-gray-800" />
                </span>
              </div>
              <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white">15s</span>
            </div>

            {/* Meta info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-text-tertiary">Creative Performance Intelligence</p>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Active</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">UGC Video</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <h1 className="text-base font-semibold text-text-primary">Fast DTF Transfers – Same Day Shipping</h1>
                <button className="shrink-0 text-text-tertiary hover:text-primary-600">
                  <PenLine size={13} />
                </button>
              </div>
              <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-0.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
                {META_ROWS.map(({ label, value, editable }) => (
                  <div key={label} className="flex items-center gap-1.5 py-0.5">
                    <dt className="shrink-0 font-medium text-text-tertiary">{label}:</dt>
                    <dd className="flex items-center gap-1 font-semibold text-text-primary">
                      {value}
                      {editable && (
                        <button className="text-text-tertiary hover:text-primary-600">
                          <PenLine size={10} />
                        </button>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Right: date picker + action buttons */}
          <div className="flex shrink-0 flex-col items-end gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" icon={PenLine}>Edit Creative</Button>
              <Button variant="outline" size="sm" icon={ExternalLink}>View Ad</Button>
              <button className="flex h-8 w-8 items-center justify-center rounded-btn border border-border-default bg-white text-text-secondary transition-colors hover:bg-gray-50">
                <MoreHorizontal size={15} />
              </button>
            </div>
            <DateRangePicker />
          </div>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-default bg-white px-4 py-3 shadow-card">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'bg-primary-600 text-white'
                  : 'text-text-secondary hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Compare controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCompareMode((c) => !c)}
            className={`flex h-8 items-center gap-1.5 rounded-btn border px-3 text-xs font-medium transition-colors ${
              compareMode
                ? 'border-primary-400 bg-primary-50 text-primary-700'
                : 'border-border-default bg-white text-text-secondary hover:bg-gray-50'
            }`}
          >
            Compare
          </button>
          <div className="flex h-8 items-center gap-1.5 rounded-btn border border-border-default bg-white px-3 text-xs font-medium text-text-secondary">
            Select Creative
            <ChevronDown size={13} />
          </div>
          <Button variant="primary" size="sm" icon={Plus}>Add to Comparison</Button>
        </div>
      </div>

      {/* ── 8 KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        {KPI_DATA.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-card border border-border-default bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div className="flex items-start justify-between gap-1">
              <p className="text-[11px] font-medium leading-tight text-text-secondary">{kpi.label}</p>
              <span className={`shrink-0 text-[10px] font-semibold ${kpi.positive ? 'text-success-600' : 'text-danger-600'}`}>
                <ArrowUpRight size={10} className="inline -mt-0.5" />
                {kpi.delta.replace('↑', '')}
              </span>
            </div>
            <p className="mt-1 text-xl font-bold tracking-tight text-text-primary">{kpi.value}</p>
            <div className="mt-1">
              <Sparkline data={kpi.spark} positive={kpi.positive} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Performance Trend line chart ──────────────────────────────────────── */}
      <div className="rounded-card border border-border-default bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-text-primary">Performance Trend</p>
            <p className="text-xs text-text-tertiary">All metrics over time</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-text-secondary">Last 7 Days</span>
        </div>
        <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {[['Impressions','#6366F1'],['Clicks','#22C55E'],['Conversions','#F59E0B'],['Total Sales','#EC4899']].map(([l,c]) => (
            <span key={l} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <span className="h-2 w-4 rounded-sm" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={TREND_DATA} margin={{ top: 4, right: 36, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left"  tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={36} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `$${v}`} width={42} />
            <Tooltip {...TOOLTIP_STYLE}
              formatter={(v, name) => name === 'sales' ? [`$${v}`, 'Total Sales'] : [v.toLocaleString(), name.charAt(0).toUpperCase() + name.slice(1)]}
            />
            <Line yAxisId="left"  type="monotone" dataKey="impressions" stroke="#6366F1" strokeWidth={2} dot={false} />
            <Line yAxisId="left"  type="monotone" dataKey="clicks"      stroke="#22C55E" strokeWidth={2} dot={false} />
            <Line yAxisId="left"  type="monotone" dataKey="conversions" stroke="#F59E0B" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="sales"       stroke="#EC4899" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Two donut charts ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DonutChart
          data={PLACEMENT_DATA}
          total="$6,742"
          title="Performance by Placement"
          subtitle="Revenue split by ad placement"
        />
        <DonutChart
          data={DEVICE_DATA}
          total="$6,742"
          title="Performance by Device"
          subtitle="Revenue split by device type"
        />
      </div>

      {/* ── Three-column body ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* LEFT: AI Performance Analysis */}
        <div className="flex flex-col rounded-card border border-border-default bg-white shadow-card">
          <div className="border-b border-border-default px-5 py-4">
            <p className="text-sm font-semibold text-text-primary">AI Performance Analysis</p>
            <p className="text-xs text-text-tertiary">Deep analysis of this creative's performance</p>
          </div>
          <div className="flex-1 divide-y divide-border-default">
            {AI_INSIGHTS.map((ins) => (
              <div key={ins.heading} className="flex items-start gap-3 px-5 py-3.5">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ins.iconBg}`}>
                  <ins.icon size={15} className={ins.iconColor} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-primary">{ins.heading}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">{ins.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4">
            <button
              onClick={() => navigate('/recommendations')}
              className="flex w-full items-center justify-center gap-2 rounded-btn border border-border-default bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
            >
              View AI Recommendations
            </button>
          </div>
        </div>

        {/* MIDDLE: Performance Over Time table */}
        <div className="rounded-card border border-border-default bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
            <p className="text-sm font-semibold text-text-primary">Performance Over Time</p>
            <div className="flex items-center gap-1 rounded-lg border border-border-default bg-gray-50 p-0.5">
              {['Daily', 'Weekly'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTablePeriod(opt)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    tablePeriod === opt ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px]">
              <thead className="bg-gray-50">
                <tr>
                  <TH>Date</TH>
                  <TH right>Impr.</TH>
                  <TH right>Clicks</TH>
                  <TH right>CTR</TH>
                  <TH right>Conv.</TH>
                  <TH right>CVR</TH>
                  <TH right>Sales</TH>
                  <TH right>AOV</TH>
                  <TH right>ROAS</TH>
                </tr>
              </thead>
              <tbody>
                {DAILY_ROWS.map((row) => (
                  <tr key={row.date} className="border-b border-border-default transition-colors hover:bg-gray-50">
                    <TD>{row.date}</TD>
                    <TD right>{row.impr}</TD>
                    <TD right>{row.clicks}</TD>
                    <TD right>{row.ctr}</TD>
                    <TD right>{row.conv}</TD>
                    <TD right>{row.cvr}</TD>
                    <TD right className="font-medium text-green-700">{row.sales}</TD>
                    <TD right>{row.aov}</TD>
                    <TD right className="font-semibold text-indigo-700">{row.roas}</TD>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <TD className="font-semibold text-text-secondary">{DAILY_FOOTER.date}</TD>
                  <TD right className="font-semibold">{DAILY_FOOTER.impr}</TD>
                  <TD right className="font-semibold">{DAILY_FOOTER.clicks}</TD>
                  <TD right className="font-semibold">{DAILY_FOOTER.ctr}</TD>
                  <TD right className="font-semibold">{DAILY_FOOTER.conv}</TD>
                  <TD right className="font-semibold">{DAILY_FOOTER.cvr}</TD>
                  <TD right className="font-semibold text-green-700">{DAILY_FOOTER.sales}</TD>
                  <TD right className="font-semibold">{DAILY_FOOTER.aov}</TD>
                  <TD right className="font-semibold text-indigo-700">{DAILY_FOOTER.roas}</TD>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* RIGHT: Top Conversions + Audience Breakdown */}
        <div className="flex flex-col gap-6">
          {/* Top Conversions */}
          <div className="rounded-card border border-border-default bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
              <p className="text-sm font-semibold text-text-primary">Top Conversions</p>
              <div className="flex items-center gap-1 rounded-lg border border-border-default bg-gray-50 p-0.5">
                {['By Value', 'By Date'].map((opt) => (
                  <button
                    key={opt}
                    className="rounded-md px-2.5 py-1 text-[11px] font-medium text-text-secondary first:bg-white first:text-text-primary first:shadow-sm hover:text-text-primary"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <ul className="divide-y divide-border-default">
              {TOP_CONVERSIONS.map((c) => (
                <li key={c.rank} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-text-secondary">
                      {c.rank}
                    </span>
                    <span className="text-xs font-medium text-text-primary">{c.orderId}</span>
                  </div>
                  <span className="text-xs font-semibold text-green-700">${c.value.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-border-default px-5 py-3">
              <button
                onClick={() => {}}
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
              >
                View All Conversions <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {/* Audience Breakdown */}
          <div className="rounded-card border border-border-default bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
              <p className="text-sm font-semibold text-text-primary">Audience Breakdown</p>
              <div className="flex h-7 items-center gap-1 rounded-btn border border-border-default bg-white px-2.5 text-[11px] font-medium text-text-secondary">
                <select
                  value={audienceDim}
                  onChange={(e) => setAudienceDim(e.target.value)}
                  className="appearance-none bg-transparent text-[11px] focus:outline-none"
                >
                  {['By Age', 'By Gender', 'By Country'].map((o) => <option key={o}>{o}</option>)}
                </select>
                <ChevronDown size={11} />
              </div>
            </div>
            <div className="px-5 py-4">
              {/* Stacked bar */}
              <div className="flex h-7 overflow-hidden rounded-full">
                {AGE_DATA.map((seg) => (
                  <div
                    key={seg.label}
                    style={{ width: `${seg.pct}%`, background: seg.color }}
                    title={`${seg.label}: ${seg.pct}%`}
                    className="transition-opacity hover:opacity-80"
                  />
                ))}
              </div>
              {/* Legend */}
              <ul className="mt-3 space-y-1.5">
                {AGE_DATA.map((seg) => (
                  <li key={seg.label} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1.5 text-text-secondary">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: seg.color }} />
                      {seg.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full" style={{ width: `${seg.pct}%`, background: seg.color }} />
                      </div>
                      <span className="w-10 text-right font-semibold text-text-primary">{seg.pct}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
