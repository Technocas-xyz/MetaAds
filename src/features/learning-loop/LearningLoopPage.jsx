import { useState } from 'react'
import {
  Download, Zap, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Award, Lightbulb, XCircle, BarChart2,
  Target, Eye, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
  Activity, Brain,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Button from '../../components/ui/Button'
import DateRangePicker from '../../components/ui/DateRangePicker'

// ── Fixture data ──────────────────────────────────────────────────────────────
const KPI_DATA = [
  { label: 'Total Recommendations', value: '256',   note: 'All time',              icon: Brain,     iconBg: 'bg-primary-50',  iconColor: 'text-primary-600' },
  { label: 'Recommendations Used',  value: '142',   note: '55.5% adoption rate',   icon: CheckCircle,iconBg: 'bg-green-50',   iconColor: 'text-green-600'  },
  { label: 'Avg ROAS (Used)',        value: '2.87x', note: 'vs 1.62x not used',     icon: TrendingUp, iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-600' },
  { label: 'High Impact Decisions',  value: '38',    note: 'Score ≥ 80',            icon: Award,      iconBg: 'bg-amber-50',   iconColor: 'text-amber-600'  },
  { label: 'Model Accuracy',         value: '84%',   note: '↑2% this week',         icon: Target,     iconBg: 'bg-purple-50',  iconColor: 'text-purple-600' },
  { label: 'Learning Velocity',      value: '1.32×', note: 'vs last period',        icon: Zap,        iconBg: 'bg-rose-50',    iconColor: 'text-rose-600'   },
]

const FUNNEL_STAGES = [
  { label: 'Recommendations Generated', count: 256, pct: '100%',  width: 100, color: 'from-indigo-500 to-indigo-600' },
  { label: 'Recommendations Reviewed',  count: 186, pct: '72.7%', width: 76,  color: 'from-blue-500 to-blue-600'    },
  { label: 'Recommendations Used',      count: 142, pct: '55.5%', width: 58,  color: 'from-amber-500 to-amber-600'  },
  { label: 'Delivered in Campaigns',    count: 112, pct: '43.8%', width: 44,  color: 'from-green-500 to-green-600'  },
]

const WHAT_LEARNING = [
  { icon: CheckCircle, iconBg: 'bg-green-50',  iconColor: 'text-green-600',  label: 'UGC Videos Outperform',     sub: 'UGC video 15s outperforms static images by 2.1× for DTF products.',       pill: { text: 'Strong Pattern', cls: 'bg-green-100 text-green-700'  } },
  { icon: AlertTriangle,iconBg: 'bg-red-50',   iconColor: 'text-red-500',    label: 'Ad Fatigue Detected',       sub: 'Frequency > 3.5 is increasing CPL by 32% in active campaigns.',           pill: { text: 'Fatigue Detected',cls: 'bg-red-100 text-red-700'    } },
  { icon: Award,        iconBg: 'bg-indigo-50',iconColor: 'text-indigo-600', label: '15s Format is Winning',     sub: 'UGC videos with benefit hooks at 15s drive the highest conversion rate.',  pill: { text: 'Winning Format',  cls: 'bg-indigo-100 text-indigo-700'} },
  { icon: Lightbulb,    iconBg: 'bg-purple-50',iconColor: 'text-purple-600', label: 'Free Shipping Drives CVR',  sub: 'Free Shipping $49+ offer shows 41% higher conversion rate vs no offer.',   pill: { text: 'High Impact Offer',cls: 'bg-purple-100 text-purple-700'} },
  { icon: XCircle,      iconBg: 'bg-red-50',   iconColor: 'text-red-500',    label: 'Pain Point Hooks Declining',sub: 'Pain-point hooks converting at 12.1%, 28% below account average.',         pill: { text: 'Avoid Pattern',   cls: 'bg-red-100 text-red-700'    } },
]

const sp = (vals) => vals.map((v, i) => ({ i, v }))

const SIGNALS = [
  { signal: 'Speed-focused UGC content',        impact: 'High',   conf: 92, trend: sp([3.1,3.4,3.6,3.8,4.0,4.2,4.4]), up: true  },
  { signal: 'Benefit-driven hooks',             impact: 'High',   conf: 88, trend: sp([2.8,3.0,3.1,3.3,3.5,3.6,3.8]), up: true  },
  { signal: 'Free Shipping offer',              impact: 'Medium', conf: 85, trend: sp([3.2,3.3,3.2,3.4,3.3,3.4,3.5]), up: true  },
  { signal: 'Facebook Feed placement',          impact: 'High',   conf: 91, trend: sp([3.5,3.6,3.8,3.7,3.9,4.0,4.1]), up: true  },
  { signal: '15s video format',                 impact: 'Medium', conf: 79, trend: sp([2.9,3.0,3.1,3.2,3.3,3.2,3.4]), up: true  },
  { signal: 'Pain Point hooks (declining)',     impact: 'Low',    conf: 67, trend: sp([2.8,2.7,2.5,2.3,2.2,2.1,1.9]), up: false },
  { signal: 'High frequency (>3.5) fatigue',   impact: 'High',   conf: 94, trend: sp([1.2,1.5,1.8,2.1,2.4,2.6,2.8]), up: false },
]

const IMPACT_SCORE_COLOR = (s) =>
  s >= 85 ? 'bg-green-100 text-green-700 border-green-200'
  : s >= 70 ? 'bg-amber-100 text-amber-700 border-amber-200'
  : 'bg-red-100 text-red-700 border-red-200'

const DECISIONS = [
  { type: 'Creative Selection',  used: 38, roasImpact: '+77%', cpaImpact: '-48%', score: 92 },
  { type: 'Hook Type Selection', used: 28, roasImpact: '+34%', cpaImpact: '-22%', score: 78 },
  { type: 'Offer Selection',     used: 22, roasImpact: '+41%', cpaImpact: '-31%', score: 84 },
  { type: 'Budget Allocation',   used: 31, roasImpact: '+28%', cpaImpact: '-19%', score: 71 },
  { type: 'Placement Selection', used: 23, roasImpact: '+55%', cpaImpact: '-36%', score: 88 },
]

const MODEL_PERF = [
  { week: 'W1', accuracy: 74, impact: 62 },
  { week: 'W2', accuracy: 77, impact: 65 },
  { week: 'W3', accuracy: 78, impact: 68 },
  { week: 'W4', accuracy: 80, impact: 72 },
  { week: 'W5', accuracy: 81, impact: 75 },
  { week: 'W6', accuracy: 82, impact: 78 },
  { week: 'W7', accuracy: 83, impact: 81 },
  { week: 'W8', accuracy: 84, impact: 84 },
]

const ROAS_BARS = [
  { type: 'Used',     value: 2.87 },
  { type: 'Not Used', value: 1.62 },
]
const CPA_BARS = [
  { type: 'Used',     value: 28.41 },
  { type: 'Not Used', value: 54.72 },
]

const RECENT_EVENTS = [
  { date: 'May 06', event: 'Creative Performance Update',  learned: 'UGC video 15s outperforms image by 2.1× for DTF products',          impact: 'High',   conf: '94%', source: 'Campaign Data',     action: 'Updated recommendations' },
  { date: 'May 04', event: 'Audience Fatigue Detection',   learned: 'Frequency > 3.5 increases CPL by 32% in active campaigns',           impact: 'High',   conf: '91%', source: 'Ad Analytics',      action: 'Flagged campaigns'       },
  { date: 'May 02', event: 'Hook Pattern Recognition',     learned: 'Benefit-driven hooks show 34% lower CPL vs pain point hooks',         impact: 'High',   conf: '88%', source: 'A/B Test Results',  action: 'Updated hook library'    },
  { date: 'Apr 30', event: 'Offer Performance Insight',    learned: 'Free Shipping $49+ boosts conversion rate by 41%',                   impact: 'Medium', conf: '85%', source: 'Conversion Data',   action: 'Added to offer recs'     },
  { date: 'Apr 28', event: 'Placement ROI Shift',          learned: 'Instagram Reels now generating 22% higher ROAS than Facebook Feed',   impact: 'Medium', conf: '82%', source: 'Placement Report',  action: 'Updated placement recs'  },
]

const TABS = [
  'Overview',
  'Recommendations Learning',
  'Creative Performance Learning',
  'Decision Impact',
  'Model Performance',
  'Feedback & Input',
]

const IMPACT_COLOR = { High: 'bg-red-100 text-red-700', Medium: 'bg-amber-100 text-amber-700', Low: 'bg-gray-100 text-gray-600' }
const SIGNAL_IMPACT_COLOR = { High: 'text-red-600', Medium: 'text-amber-600', Low: 'text-gray-500' }

// ── Small helpers ─────────────────────────────────────────────────────────────
const TT = { contentStyle: { fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,.06)' } }

function Card({ title, subtitle, headerRight, children, noPad = false, className = '' }) {
  return (
    <div className={`rounded-card border border-border-default bg-white shadow-card ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-border-default px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">{title}</p>
            {subtitle && <p className="text-xs text-text-tertiary">{subtitle}</p>}
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-5'}>{children}</div>
    </div>
  )
}

function MiniSparkline({ data, up }) {
  return (
    <ResponsiveContainer width={64} height={24}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke={up ? '#22C55E' : '#EF4444'} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function ViewAllLink({ onClick }) {
  return (
    <button onClick={onClick} className="text-[11px] font-medium text-primary-600 hover:underline">
      View All
    </button>
  )
}

// ── Overview sub-sections ─────────────────────────────────────────────────────
function FunnelViz() {
  return (
    <div className="space-y-1">
      {FUNNEL_STAGES.map((stage, i) => (
        <div key={i} className="flex flex-col items-center">
          <div
            className={`flex h-11 items-center justify-between rounded-lg bg-gradient-to-r px-3 text-white ${stage.color}`}
            style={{ width: `${stage.width}%`, minWidth: 160 }}
          >
            <span className="truncate text-[11px] font-semibold leading-tight">{stage.label}</span>
            <div className="ml-2 flex shrink-0 items-baseline gap-1.5">
              <span className="text-sm font-bold">{stage.count.toLocaleString()}</span>
              <span className="text-[10px] opacity-80">{stage.pct}</span>
            </div>
          </div>
          {i < FUNNEL_STAGES.length - 1 && (
            <div className="my-0.5 h-3 w-px bg-gray-200" />
          )}
        </div>
      ))}
    </div>
  )
}

function PerfImpactCard() {
  const barColors = ['#22C55E', '#EF4444']
  return (
    <Card title="Performance Impact: Used vs Not Used">
      <div className="grid grid-cols-2 gap-4">
        {/* ROAS */}
        <div>
          <p className="mb-2 text-center text-xs font-semibold text-text-secondary">ROAS</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={ROAS_BARS} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="type" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 4]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}x`} />
              <Tooltip {...TT} formatter={(v) => [`${v}x`, 'ROAS']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {ROAS_BARS.map((_, i) => <Cell key={i} fill={barColors[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* CPA */}
        <div>
          <p className="mb-2 text-center text-xs font-semibold text-text-secondary">CPA</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={CPA_BARS} margin={{ top: 8, right: 4, left: -4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="type" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 70]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip {...TT} formatter={(v) => [`$${v}`, 'CPA']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {CPA_BARS.map((_, i) => <Cell key={i} fill={barColors[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2.5">
        <CheckCircle size={13} className="mt-0.5 shrink-0 text-green-600" />
        <p className="text-[11px] leading-relaxed text-green-800">
          Recommendations that were used delivered <strong>77% higher ROAS</strong> and{' '}
          <strong>48% lower CPA</strong> on average compared to recommendations that were not used.
        </p>
      </div>
    </Card>
  )
}

function WhatLearningCard() {
  return (
    <Card
      title="What We're Learning"
      headerRight={<button className="text-[11px] font-medium text-primary-600 hover:underline">View All Insights</button>}
    >
      <ul className="divide-y divide-border-default">
        {WHAT_LEARNING.map((item, i) => (
          <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}>
              <item.icon size={13} className={item.iconColor} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-xs font-semibold text-text-primary">{item.label}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.pill.cls}`}>
                  {item.pill.text}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">{item.sub}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function LearningSignalsCard() {
  return (
    <Card title="Top Learning Signals (This Week)" headerRight={<ViewAllLink />}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px]">
          <thead>
            <tr className="border-b border-border-default">
              {['Signal', 'Impact', 'Conf.', 'Trend'].map((h) => (
                <th key={h} className="pb-2.5 pr-3 text-left text-[10px] font-semibold uppercase tracking-wide text-text-tertiary last:pr-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {SIGNALS.map((row, i) => (
              <tr key={i} className="transition-colors hover:bg-gray-50">
                <td className="py-2.5 pr-3 text-[11px] font-medium leading-tight text-text-primary max-w-[130px] truncate">{row.signal}</td>
                <td className={`py-2.5 pr-3 text-[11px] font-semibold ${SIGNAL_IMPACT_COLOR[row.impact]}`}>{row.impact}</td>
                <td className="py-2.5 pr-3 text-[11px] text-text-secondary">{row.conf}%</td>
                <td className="py-2.5">
                  <MiniSparkline data={row.trend} up={row.up} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function DecisionImpactCard() {
  return (
    <Card title="Decision Impact Tracker" headerRight={<ViewAllLink />}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[300px]">
          <thead>
            <tr className="border-b border-border-default">
              {['Decision Type', 'Used', 'ROAS', 'CPA', 'Score'].map((h) => (
                <th key={h} className="pb-2.5 pr-3 text-left text-[10px] font-semibold uppercase tracking-wide text-text-tertiary last:pr-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {DECISIONS.map((row, i) => (
              <tr key={i} className="transition-colors hover:bg-gray-50">
                <td className="py-2.5 pr-3 text-[11px] font-medium text-text-primary">{row.type}</td>
                <td className="py-2.5 pr-3 text-[11px] text-text-secondary">{row.used}</td>
                <td className="py-2.5 pr-3 text-[11px] font-semibold text-green-700">{row.roasImpact}</td>
                <td className="py-2.5 pr-3 text-[11px] font-semibold text-green-700">{row.cpaImpact}</td>
                <td className="py-2.5">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold ${IMPACT_SCORE_COLOR(row.score)}`}>
                    {row.score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function ModelPerfCard() {
  return (
    <Card
      title="AI Model Performance Over Time"
      headerRight={<span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-text-secondary">Last 8 Weeks</span>}
    >
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
        {[['Accuracy %', '#6366F1'], ['Impact Score', '#22C55E']].map(([l, c]) => (
          <span key={l} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span className="h-2 w-4 rounded-sm" style={{ background: c }} /> {l}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={MODEL_PERF} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip {...TT} formatter={(v, name) => [`${v}%`, name === 'accuracy' ? 'Accuracy' : 'Impact Score']} />
          <Line type="monotone" dataKey="accuracy" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="impact"   stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

function RecentEventsCard() {
  const TH = ({ children }) => (
    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
      {children}
    </th>
  )
  const TD = ({ children, className = '' }) => (
    <td className={`whitespace-nowrap px-3 py-2.5 text-xs ${className}`}>{children}</td>
  )

  return (
    <Card title="Recent Learning Events">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-gray-50">
            <tr>
              <TH>Date</TH>
              <TH>Event</TH>
              <TH>What We Learned</TH>
              <TH>Impact</TH>
              <TH>Confidence</TH>
              <TH>Source</TH>
              <TH>Action Taken</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {RECENT_EVENTS.map((row, i) => (
              <tr key={i} className="transition-colors hover:bg-gray-50">
                <TD className="text-text-tertiary">{row.date}</TD>
                <TD className="font-medium text-text-primary max-w-[120px] truncate">{row.event}</TD>
                <TD className="max-w-[200px] text-text-secondary" style={{ whiteSpace: 'normal' }}>{row.learned}</TD>
                <TD>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${IMPACT_COLOR[row.impact]}`}>
                    {row.impact}
                  </span>
                </TD>
                <TD className="font-semibold text-primary-700">{row.conf}</TD>
                <TD className="text-text-secondary">{row.source}</TD>
                <TD className="text-text-secondary">{row.action}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function FeedbackCard() {
  const [expanded, setExpanded] = useState({})
  const toggle = (k) => setExpanded((p) => ({ ...p, [k]: !p[k] }))

  const VOTES = [
    { icon: ThumbsUp,   color: 'text-green-500', label: 'Recommendations helpful', pct: 89, barColor: 'bg-green-500' },
    { icon: ThumbsDown, color: 'text-red-400',   label: 'Not relevant',            pct: 11, barColor: 'bg-red-400'   },
  ]

  const TOP_FEEDBACK = [
    { key: 'ugc',         text: 'More UGC script examples',          detail: 'Users want more concrete examples of high-converting UGC scripts for DTF products.' },
    { key: 'competitor',  text: 'Show real competitor references',   detail: 'Users want real competitor ad examples with performance data, not generic suggestions.' },
  ]

  return (
    <Card title="Feedback from Users" headerRight={<ViewAllLink />}>
      <div className="space-y-3">
        {VOTES.map(({ icon: Icon, color, label, pct, barColor }) => (
          <div key={label} className="flex items-center gap-2.5">
            <Icon size={14} className={color} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[11px]">
                <span className="truncate text-text-secondary">{label}</span>
                <span className="ml-2 shrink-0 font-bold text-text-primary">{pct}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold text-text-primary">Top Feedback</p>
        <div className="space-y-2">
          {TOP_FEEDBACK.map(({ key, text, detail }) => (
            <div key={key} className="rounded-lg border border-border-default">
              <button
                onClick={() => toggle(key)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
              >
                <span className="text-[11px] font-medium text-text-primary">{text}</span>
                {expanded[key] ? <ChevronUp size={13} className="text-text-tertiary" /> : <ChevronDown size={13} className="text-text-tertiary" />}
              </button>
              {expanded[key] && (
                <div className="border-t border-border-default px-3 pb-3 pt-2">
                  <p className="text-[11px] leading-relaxed text-text-secondary">{detail}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {KPI_DATA.map((kpi) => (
          <div key={kpi.label} className="rounded-card border border-border-default bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium leading-tight text-text-secondary">{kpi.label}</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-text-primary">{kpi.value}</p>
                <p className="mt-0.5 text-[10px] text-text-tertiary">{kpi.note}</p>
              </div>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${kpi.iconBg}`}>
                <kpi.icon size={16} className={kpi.iconColor} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Funnel | PerfImpact | WhatLearning */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Recommendation Adoption Funnel">
          <FunnelViz />
          <p className="mt-3 text-[10px] text-text-tertiary">
            From generation to delivery in live campaigns
          </p>
        </Card>
        <PerfImpactCard />
        <WhatLearningCard />
      </div>

      {/* Row 3: Signals | Decision | Model */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <LearningSignalsCard />
        <DecisionImpactCard />
        <ModelPerfCard />
      </div>

      {/* Row 4: Recent Events + Feedback */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
        <RecentEventsCard />
        <FeedbackCard />
      </div>
    </div>
  )
}

// ── Placeholder tab ───────────────────────────────────────────────────────────
function PlaceholderTab({ name }) {
  return (
    <div className="rounded-card border border-border-default bg-white p-12 text-center shadow-card">
      <Activity size={36} className="mx-auto mb-3 text-text-tertiary" />
      <p className="text-base font-semibold text-text-primary">{name}</p>
      <p className="mt-1 text-sm text-text-secondary">This section is coming soon.</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LearningLoopPage() {
  const [activeTab, setActiveTab] = useState('Overview')

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <Breadcrumb />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-text-primary">Learning Loop</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
              <Zap size={11} /> AI
            </span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Continuous improvement system that learns from results and improves future recommendations
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DateRangePicker />
          <Button variant="outline" size="sm" icon={Download}>Export Report</Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center overflow-x-auto rounded-card border border-border-default bg-white shadow-card">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview'
        ? <OverviewTab />
        : <PlaceholderTab name={activeTab} />
      }
    </div>
  )
}
