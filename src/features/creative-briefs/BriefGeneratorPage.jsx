import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, Download, Share2, Send, Check, ChevronLeft, ChevronRight,
  Edit3, ArrowUpRight, ExternalLink, Target, Zap, TrendingUp,
  Tag, CheckCircle, Users, AlertTriangle, Heart, MousePointer,
  Video, Eye, MessageCircle, AlignLeft, XCircle, FileText,
  Archive, Image as ImageIcon, Type, Play, BarChart2,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Button from '../../components/ui/Button'
import useBriefStore from '../../store/useBriefStore'

// ── Fixture data ──────────────────────────────────────────────────────────────
const WIZARD_STEPS = [
  { num: 1, label: 'Select Objective', done: true,  current: false },
  { num: 2, label: 'AI Analysis',      done: true,  current: false },
  { num: 3, label: 'Generate Brief',   done: false, current: true  },
  { num: 4, label: 'Review & Export',  done: false, current: false },
]

const BRIEF_SECTIONS = [
  { icon: Target,        label: 'Creative Objective',    value: 'Generate leads and sales with a high-converting UGC video ad.', pill: null },
  { icon: Zap,           label: 'Recommended Hook',      value: 'Fast DTF Transfers. Same Day Shipping.',                        pill: { text: 'High Impact', cls: 'bg-green-100 text-green-700' } },
  { icon: TrendingUp,    label: 'Primary Angle',         value: 'Speed + Quality',                                               sub: 'Highlight speed, quality and reliability together.', pill: null },
  { icon: Tag,           label: 'Offer',                 value: 'Free Shipping on Orders $49+',                                  pill: { text: 'Medium Saturation', cls: 'bg-amber-100 text-amber-700' } },
  { icon: CheckCircle,   label: 'Key Benefit',           value: 'Vibrant Colors, Long Lasting, Wash Durable',                   pill: null },
  { icon: Users,         label: 'Target Audience',       value: 'Print Shop Owners, Small Business Owners',                     pill: null },
  { icon: AlertTriangle, label: 'Pain Point Addressed',  value: 'Slow turnaround, poor print quality, inconsistent results.',   pill: null },
  { icon: Heart,         label: 'Desired Emotion',       value: 'Confidence, Relief, Excitement',                               pill: null },
  { icon: MousePointer,  label: 'Call To Action',        value: '"Order Now"',                                                   pill: { text: 'High Impact', cls: 'bg-green-100 text-green-700' } },
  { icon: Video,         label: 'Recommended Format',    value: 'UGC Video (15-30 sec)',                                         link: 'Why Video?', pill: null },
  { icon: Eye,           label: 'Visual Style',          value: 'Real workspace shots, hands-on demo, bold text overlays',      pill: null },
  { icon: MessageCircle, label: 'Tone of Voice',         value: 'Confident, Direct, Solution-Oriented',                         pill: null },
  { icon: AlignLeft,     label: 'Text Overlay Guidance', bullets: ['Keep text short and bold', 'Highlight speed + quality', 'Display offer clearly', 'Use high contrast colors'] },
  { icon: XCircle,       label: 'Avoid',                 bullets: ['Overused discount-heavy messaging', 'Too much text on screen', 'Stock footage'], avoidStyle: true },
]

const CREATIVE_DIRECTION = [
  { label: 'Angle',            value: 'Speed + Quality',           pill: { text: 'Top Performer', cls: 'bg-green-100 text-green-700' } },
  { label: 'Format',           value: 'UGC Video',                 pill: { text: '15-30s',        cls: 'bg-blue-100 text-blue-700'  } },
  { label: 'Hook Type',        value: 'Benefit Driven',            pill: { text: 'Recommended',   cls: 'bg-primary-100 text-primary-700' } },
  { label: 'Saturation',       value: 'Medium',                    pill: { text: 'Good to Go',    cls: 'bg-amber-100 text-amber-700' } },
  { label: 'Novelty Score',    value: '72 / 100',                  pill: null },
  { label: 'Confidence Score', value: '84%',                       pill: { text: 'High',          cls: 'bg-green-100 text-green-700' } },
]

const REF_ADS = [
  { id: 'r1', name: 'Fast Print Transfer',     format: 'Video 15s',       performer: 'Top',     color: 'bg-green-100 text-green-700'  },
  { id: 'r2', name: 'Same Day Delivery',       format: 'Video 30s',       performer: 'Top',     color: 'bg-green-100 text-green-700'  },
  { id: 'r3', name: 'Vibrant Color Prints',    format: 'Image 1080×1080', performer: 'Average', color: 'bg-amber-100 text-amber-700'  },
  { id: 'r4', name: 'Bundle & Save Offer',     format: 'Carousel',        performer: 'Average', color: 'bg-amber-100 text-amber-700'  },
  { id: 'r5', name: 'Quality Comparison UGC',  format: 'Video 15s',       performer: 'Top',     color: 'bg-green-100 text-green-700'  },
]

const AI_INSIGHT_BULLETS = [
  'UGC Video creatives see 2.3× better CTR for DTF products.',
  'Speed + Quality angle has 34% lower CPL vs. average.',
  'Free Shipping offer shows 41% higher conversion rate.',
  'Benefit-driven hooks outperform pain-point by 18% in your niche.',
  'Facebook Feed + Instagram Reels are top-performing placements.',
]

const INSIGHT_TREND = [
  { date: 'Apr 30', angle: 3.2, avg: 2.1 },
  { date: 'May 01', angle: 3.4, avg: 2.2 },
  { date: 'May 02', angle: 3.1, avg: 2.0 },
  { date: 'May 03', angle: 3.7, avg: 2.3 },
  { date: 'May 04', angle: 4.0, avg: 2.2 },
  { date: 'May 05', angle: 3.8, avg: 2.1 },
  { date: 'May 06', angle: 4.2, avg: 2.4 },
]

const DELIVERABLES = [
  { icon: FileText,   label: 'Creative Brief',          fmt: 'PDF', iconBg: 'bg-red-50',    iconColor: 'text-red-600'    },
  { icon: Type,       label: 'Hook & Copy Suggestions', fmt: 'DOC', iconBg: 'bg-blue-50',   iconColor: 'text-blue-600'   },
  { icon: AlignLeft,  label: 'Text Overlay Guide',      fmt: 'PDF', iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
  { icon: ImageIcon,  label: 'Moodboard (Visual Style)', fmt: 'PNG', iconBg: 'bg-pink-50',  iconColor: 'text-pink-600'   },
  { icon: Archive,    label: 'Reference Ads',           fmt: 'ZIP', iconBg: 'bg-amber-50',  iconColor: 'text-amber-600'  },
]

const NEXT_STEPS = [
  { label: 'Send to Design Team',    sub: 'Share brief directly'      },
  { label: 'Create & Upload Draft',  sub: 'Upload finished creative'  },
  { label: 'AI Review & Approve',    sub: 'Run quality analysis'      },
  { label: 'Launch Campaign',        sub: 'Go live on Meta Ads'       },
]

const STEP_1_FIELDS = [
  { label: 'Objective',      key: 'objective'      },
  { label: 'Campaign Goal',  key: 'campaignGoal'   },
  { label: 'Target Audience',key: 'targetAudience' },
  { label: 'Geography',      key: 'geography'      },
  { label: 'Product/Service',key: 'product'        },
  { label: 'Key Benefit',    key: 'keyBenefit'     },
  { label: 'Offer',          key: 'offer'          },
]

// ── Sub-components ────────────────────────────────────────────────────────────
function Card({ title, subtitle, headerRight, children, noPad = false }) {
  return (
    <div className="rounded-card border border-border-default bg-white shadow-card">
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

function HorizontalStepper({ steps }) {
  return (
    <div className="rounded-card border border-border-default bg-white px-6 py-4 shadow-card">
      <div className="flex items-center">
        {steps.map((step, i) => (
          <div key={step.num} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step.done
                  ? 'bg-primary-600 text-white'
                  : step.current
                  ? 'border-2 border-primary-600 bg-white text-primary-600'
                  : 'border-2 border-gray-200 bg-white text-text-tertiary'
              }`}>
                {step.done ? <Check size={14} /> : step.num}
              </div>
              <span className={`whitespace-nowrap text-[11px] font-medium ${
                step.current ? 'text-primary-600' : step.done ? 'text-text-primary' : 'text-text-tertiary'
              }`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 ${step.done ? 'bg-primary-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Confidence ring SVG
function ConfidenceRing({ score }) {
  const r    = 20
  const circ = 2 * Math.PI * r
  const fill = circ * (score / 100)
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#C7D2FE" strokeWidth="4" />
      <circle
        cx="26" cy="26" r={r} fill="none" stroke="#6366F1" strokeWidth="4"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round" transform="rotate(-90 26 26)"
      />
      <text x="26" y="27" textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill="#4338CA">
        {score}%
      </text>
    </svg>
  )
}

// ── Step content components ───────────────────────────────────────────────────
function Step1Content() {
  return (
    <div className="space-y-4 p-6">
      <p className="text-sm font-semibold text-text-primary">Select Your Campaign Objective</p>
      <p className="text-xs text-text-secondary">Define what you want to achieve with this creative brief.</p>
      <div className="rounded-lg border-2 border-primary-500 bg-primary-50 p-4">
        <p className="text-sm font-semibold text-primary-700">Lead Generation + Sales</p>
        <p className="text-xs text-primary-600">Generate qualified leads and drive conversions</p>
      </div>
    </div>
  )
}

function Step2Content() {
  return (
    <div className="space-y-4 p-6">
      <p className="text-sm font-semibold text-text-primary">AI Analyzing Your Account…</p>
      <div className="space-y-2">
        {['Market data analyzed', 'Competitor ads reviewed', 'Top angles identified', 'Best hooks shortlisted'].map((t) => (
          <div key={t} className="flex items-center gap-2 text-sm text-text-secondary">
            <CheckCircle size={14} className="text-green-500" /> {t}
          </div>
        ))}
      </div>
    </div>
  )
}

function Step4Content() {
  return (
    <div className="space-y-4 p-6">
      <p className="text-sm font-semibold text-text-primary">Review & Export Your Brief</p>
      <p className="text-xs text-text-secondary">Review the final brief and export it for your design team.</p>
      <Button variant="primary" icon={Download}>Download PDF Brief</Button>
    </div>
  )
}

function Step3Content({ objective }) {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* ── LEFT ───────────────────────────────────────────────────────────── */}
      <div className="space-y-5 xl:col-span-3">
        {/* Brief Objective */}
        <Card
          title="Brief Objective"
          headerRight={
            <button className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline">
              <Edit3 size={12} /> Edit
            </button>
          }
        >
          <dl className="space-y-2.5">
            {STEP_1_FIELDS.map(({ label, key }) => (
              <div key={key}>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</dt>
                <dd className="mt-0.5 text-xs font-medium text-text-primary">{objective[key]}</dd>
              </div>
            ))}
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">KPI Focus</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {objective.kpiFocus.map((k) => (
                  <span key={k} className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">{k}</span>
                ))}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Market Opportunity */}
        <Card
          title="Market Opportunity"
          headerRight={
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-semibold text-green-700">High</span>
          }
        >
          <p className="text-xs leading-relaxed text-text-secondary">
            DTF printing demand is growing at 18% YoY. Speed + Quality positioning has low market
            saturation (34% novelty) with strong conversion potential in your niche.
          </p>
          <button className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary-600 hover:underline">
            View Full Market Analysis <ChevronRight size={11} />
          </button>
        </Card>

        {/* Recommended Creative Direction */}
        <Card title="Recommended Creative Direction">
          <dl className="space-y-2.5">
            {CREATIVE_DIRECTION.map(({ label, value, pill }) => (
              <div key={label} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</dt>
                  <dd className="mt-0.5 text-xs font-medium text-text-primary">{value}</dd>
                </div>
                {pill && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill.cls}`}>
                    {pill.text}
                  </span>
                )}
              </div>
            ))}
          </dl>
        </Card>
      </div>

      {/* ── MIDDLE ─────────────────────────────────────────────────────────── */}
      <div className="space-y-5 xl:col-span-6">
        {/* AI Generated Brief */}
        <Card
          title="Your AI Generated Creative Brief"
          headerRight={
            <Button variant="outline" size="sm" icon={RefreshCw}>Regenerate</Button>
          }
        >
          <div className="divide-y divide-border-default">
            {BRIEF_SECTIONS.map((sec, i) => (
              <div key={i} className={`flex items-start gap-3 py-3 first:pt-0 last:pb-0 ${sec.avoidStyle ? 'opacity-90' : ''}`}>
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${sec.avoidStyle ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <sec.icon size={13} className={sec.avoidStyle ? 'text-red-500' : 'text-text-secondary'} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${sec.avoidStyle ? 'text-red-600' : 'text-text-tertiary'}`}>
                    {sec.label}
                  </p>
                  {sec.bullets ? (
                    <ul className="mt-1 space-y-0.5">
                      {sec.bullets.map((b, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-xs text-text-primary">
                          <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${sec.avoidStyle ? 'bg-red-400' : 'bg-text-tertiary'}`} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium text-text-primary">{sec.value}</p>
                      {sec.sub && <p className="text-[11px] text-text-tertiary">{sec.sub}</p>}
                      {sec.pill && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sec.pill.cls}`}>
                          {sec.pill.text}
                        </span>
                      )}
                      {sec.link && (
                        <button className="flex items-center gap-0.5 text-[11px] font-medium text-primary-600 hover:underline">
                          {sec.link} <ExternalLink size={10} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Brief Summary */}
        <Card title="Brief Summary">
          <p className="text-sm leading-relaxed text-text-secondary">
            This brief targets Print Shop Owners and Small Business Owners with a UGC video ad
            highlighting fast DTF transfers and same-day shipping. The Speed + Quality angle combined
            with a Free Shipping offer positions this creative for high lead volume and strong ROAS.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-[11px] font-semibold text-green-800">Estimated Impact</p>
              <div className="mt-1.5 flex items-center justify-center gap-1">
                <span className="text-2xl font-bold text-green-700">High</span>
                <ArrowUpRight size={18} className="text-green-600" />
              </div>
            </div>
            <div className="rounded-xl border border-primary-200 bg-primary-50 p-3 text-center">
              <p className="text-[11px] font-semibold text-primary-800">Confidence Score</p>
              <div className="mt-1 flex justify-center">
                <ConfidenceRing score={84} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── RIGHT ──────────────────────────────────────────────────────────── */}
      <div className="space-y-5 xl:col-span-3">
        {/* Reference Competitor Ads */}
        <Card
          title="Reference Competitor Ads"
          subtitle="For Inspiration"
          headerRight={
            <button className="text-[11px] font-medium text-primary-600 hover:underline">View All</button>
          }
          noPad
        >
          <div className="flex gap-3 overflow-x-auto p-4 pb-3">
            {REF_ADS.map((ad) => (
              <div key={ad.id} className="flex w-28 shrink-0 flex-col gap-1.5">
                <div className="relative overflow-hidden rounded-lg bg-gray-200" style={{ aspectRatio: '4/5' }}>
                  <img
                    src={`https://picsum.photos/seed/${ad.id}/112/140`}
                    alt={ad.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70">
                      <Play size={12} className="ml-0.5 text-gray-700" />
                    </span>
                  </div>
                </div>
                <p className="line-clamp-2 text-[10px] font-medium leading-tight text-text-primary">{ad.name}</p>
                <div className="flex flex-wrap gap-1">
                  <span className="rounded bg-gray-100 px-1 py-0.5 text-[9px] text-text-tertiary">{ad.format}</span>
                  <span className={`rounded px-1 py-0.5 text-[9px] font-semibold ${ad.color}`}>{ad.performer}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* AI Insights */}
        <Card
          title="AI Insights Behind This Brief"
          headerRight={
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-text-secondary">Last 7 Days</span>
          }
        >
          <ul className="space-y-2">
            {AI_INSIGHT_BULLETS.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle size={12} className="mt-0.5 shrink-0 text-green-500" />
                <span className="text-[11px] leading-snug text-text-secondary">{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <p className="mb-1 text-[10px] font-semibold text-text-tertiary">Speed + Quality Angle vs Market Avg</p>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={INSIGHT_TREND} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                <Line type="monotone" dataKey="angle" stroke="#6366F1" strokeWidth={2} dot={false} name="Speed+Quality" />
                <Line type="monotone" dataKey="avg"   stroke="#9CA3AF" strokeWidth={1.5} dot={false} strokeDasharray="4 3" name="Market Avg" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Deliverables */}
        <Card
          title="Deliverables To Design Team"
          headerRight={
            <Button variant="outline" size="sm" icon={Download}>Download All</Button>
          }
        >
          <div className="grid grid-cols-2 gap-2.5">
            {DELIVERABLES.map(({ icon: Icon, label, fmt, iconBg, iconColor }) => (
              <div
                key={label}
                className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-border-default p-3 text-center transition-colors hover:bg-gray-50"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
                  <Icon size={16} className={iconColor} />
                </span>
                <p className="text-[10px] font-medium leading-tight text-text-primary">{label}</p>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-text-tertiary">{fmt}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Next Steps */}
        <Card title="Next Steps">
          <div className="space-y-3">
            {NEXT_STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  i === 0 ? 'bg-primary-600 text-white' : 'border-2 border-gray-200 text-text-tertiary'
                }`}>
                  {i === 0 ? <ChevronRight size={13} /> : i + 1}
                </div>
                {i < NEXT_STEPS.length - 1 && (
                  <div className="absolute ml-3 mt-7 h-3 w-0.5 bg-gray-200" style={{ marginLeft: 14, marginTop: 28, position: 'absolute' }} />
                )}
                <div>
                  <p className={`text-xs font-semibold ${i === 0 ? 'text-primary-700' : 'text-text-primary'}`}>{step.label}</p>
                  <p className="text-[10px] text-text-tertiary">{step.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              className="w-full"
              onClick={() => navigate('/review')}
            >
              Send to Design Team
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BriefGeneratorPage() {
  const navigate     = useNavigate()
  const currentStep  = useBriefStore((s) => s.currentStep)
  const objective    = useBriefStore((s) => s.objective)
  const setStep      = useBriefStore((s) => s.setStep)

  const stepContent = {
    1: <Step1Content />,
    2: <Step2Content />,
    3: <Step3Content objective={objective} />,
    4: <Step4Content />,
  }

  const handlePrev = () => {
    if (currentStep > 1) setStep(currentStep - 1)
  }
  const handleNext = () => {
    if (currentStep < 4) setStep(currentStep + 1)
  }

  return (
    <div className="space-y-5 p-4 pb-24 sm:p-6">
      <Breadcrumb items={[
        { label: 'Creative Briefs', to: '/briefs' },
        { label: 'New Brief' },
      ]} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-text-primary">Creative Brief Generator</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
              <Zap size={11} /> AI
            </span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Generate data-driven creative briefs powered by AI market intelligence
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={FileText}>Save Brief</Button>
          <Button variant="outline" size="sm" icon={Share2}>Share Brief</Button>
          <Button variant="primary" size="sm" icon={Send}>Send to Design Team</Button>
        </div>
      </div>

      {/* Stepper */}
      <HorizontalStepper
        steps={WIZARD_STEPS.map((s) => ({
          ...s,
          current: s.num === currentStep,
          done:    s.num < currentStep,
        }))}
      />

      {/* Step content */}
      {stepContent[currentStep] ?? stepContent[3]}

      {/* Wizard navigation footer */}
      <div className="flex items-center justify-between rounded-card border border-border-default bg-white px-6 py-4 shadow-card">
        <Button
          variant="outline"
          icon={ChevronLeft}
          onClick={handlePrev}
          disabled={currentStep === 1}
        >
          Previous Step
        </Button>
        <div className="flex items-center gap-1.5">
          {WIZARD_STEPS.map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`h-2 rounded-full transition-all ${
                s.num === currentStep ? 'w-6 bg-primary-600' : 'w-2 bg-gray-200 hover:bg-gray-300'
              }`}
              aria-label={`Go to step ${s.num}`}
            />
          ))}
        </div>
        <Button
          variant="primary"
          icon={ChevronRight}
          onClick={handleNext}
          disabled={currentStep === 4}
        >
          {currentStep === 3 ? 'Review & Export' : 'Next Step'}
        </Button>
      </div>
    </div>
  )
}
