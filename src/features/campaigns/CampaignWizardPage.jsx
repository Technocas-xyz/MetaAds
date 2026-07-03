import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Check, ChevronLeft, ChevronRight, ChevronDown, Play,
  Edit3, Rocket, Calendar, Save, Eye, TrendingUp, Heart,
  Users, Smartphone, ShoppingBag, DollarSign, Zap,
  CheckCircle, AlertCircle, Clock, BarChart2, Target,
  Link as LinkIcon, Globe, MonitorPlay, ArrowRight,
  Info, Wifi,
} from 'lucide-react'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Button from '../../components/ui/Button'
import useCampaignStore from '../../store/useCampaignStore'

// ── Static data ───────────────────────────────────────────────────────────────
const WIZARD_STEPS = [
  { num: 1, title: 'Creative',       sub: 'Creative selected'   },
  { num: 2, title: 'Campaign Setup', sub: 'Campaign details'    },
  { num: 3, title: 'Audience',       sub: 'Target audience'     },
  { num: 4, title: 'Ad Set',         sub: 'Budget & schedule'   },
  { num: 5, title: 'Review',         sub: 'Preview & approve'   },
  { num: 6, title: 'Launch',         sub: 'Go live on Meta'     },
]

const OBJECTIVES = [
  { value: 'awareness',    label: 'Awareness',      icon: Eye,         color: 'text-blue-500',    bg: 'bg-blue-50'    },
  { value: 'traffic',      label: 'Traffic',        icon: TrendingUp,  color: 'text-green-500',   bg: 'bg-green-50'   },
  { value: 'engagement',   label: 'Engagement',     icon: Heart,       color: 'text-pink-500',    bg: 'bg-pink-50'    },
  { value: 'leads',        label: 'Leads',          icon: Users,       color: 'text-amber-500',   bg: 'bg-amber-50'   },
  { value: 'app',          label: 'App Promotion',  icon: Smartphone,  color: 'text-purple-500',  bg: 'bg-purple-50'  },
  { value: 'conversions',  label: 'Conversions',    icon: ShoppingBag, color: 'text-primary-600', bg: 'bg-primary-50' },
  { value: 'sales',        label: 'Sales',          icon: DollarSign,  color: 'text-emerald-500', bg: 'bg-emerald-50' },
]

const CREATIVE_SCORE_BULLETS = [
  'Hook is high impact and benefit driven',
  'Strong visual clarity and product display',
  'High predicted CTR (Top 22%)',
  'Low saturation in current market',
]

const VARIANTS = [
  { id: 'v1', seed: 'var1' },
  { id: 'v2', seed: 'var2' },
  { id: 'v3', seed: 'var3' },
]

const READINESS_STEPS = [
  { label: 'Creative',       done: true,  current: false },
  { label: 'Campaign Setup', done: false, current: true  },
  { label: 'Audience',       done: false, current: false },
  { label: 'Ad Set',         done: false, current: false },
  { label: 'Review',         done: false, current: false },
  { label: 'Launch',         done: false, current: false },
]

const AI_INSIGHTS = [
  'Conversions objective with $50/day budget is well-suited for this creative.',
  'Daily budget of $45–$65 is optimal for your audience size (~850K reach).',
  'Run Continuously scheduling maximizes algorithm learning in the first 7 days.',
  'Auction buying type gives best flexibility for ROAS-focused campaigns.',
]

// ── Small helpers ─────────────────────────────────────────────────────────────
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

function FieldLabel({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-text-primary">
      {children}{required && <span className="ml-0.5 text-danger-500">*</span>}
    </label>
  )
}

function HelperText({ children, className = '' }) {
  return <p className={`mt-1 text-[11px] text-text-tertiary ${className}`}>{children}</p>
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
        value ? 'bg-primary-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// 270° arc gauge (same technique as CreativeReview)
function CreativeScoreGauge({ score }) {
  const cx = 52, cy = 52, r = 40
  const circ = 2 * Math.PI * r
  const arc  = circ * 0.75
  const fill = arc * (score / 100)
  const color = score >= 70 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="104" height="104" viewBox="0 0 104 104" aria-label={`Score: ${score}/100`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth="8"
          strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`} />
        <text x={cx} y={cy - 5}  textAnchor="middle" fontSize="22" fontWeight="700" fill="#0F172A">{score}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="11" fill="#94A3B8">/ 100</text>
      </svg>
      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
        High Performing
      </span>
    </div>
  )
}

// Split button (Launch + Launch & Schedule dropdown)
function SplitLaunchButton({ onLaunch }) {
  return (
    <div className="flex items-stretch">
      <button
        onClick={onLaunch}
        className="flex h-9 items-center gap-2 rounded-l-btn bg-success-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-success-700"
      >
        <Rocket size={15} /> Launch Campaign
      </button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex h-9 w-8 items-center justify-center rounded-r-btn border-l border-success-700 bg-success-600 text-white transition-colors hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-1">
            <ChevronDown size={14} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 min-w-[180px] rounded-card border border-border-default bg-white p-1.5 shadow-lg"
          >
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary outline-none hover:bg-gray-50"
              onSelect={() => {}}
            >
              <Calendar size={14} className="text-text-secondary" /> Launch &amp; Schedule
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}

// ── 6-step stepper ────────────────────────────────────────────────────────────
function CampaignStepper({ currentStep }) {
  return (
    <div className="rounded-card border border-border-default bg-white px-6 py-4 shadow-card">
      <div className="flex items-start">
        {WIZARD_STEPS.map((step, i) => {
          const done    = step.num < currentStep
          const current = step.num === currentStep
          return (
            <div key={step.num} className="flex flex-1 items-start">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  done    ? 'bg-primary-600 text-white'
                  : current ? 'border-2 border-primary-600 bg-white text-primary-600'
                  : 'border-2 border-gray-200 bg-white text-text-tertiary'
                }`}>
                  {done ? <Check size={15} /> : step.num}
                </div>
                <div className="text-center">
                  <p className={`whitespace-nowrap text-[11px] font-semibold ${current ? 'text-primary-600' : done ? 'text-text-primary' : 'text-text-tertiary'}`}>
                    {step.title}
                  </p>
                  <p className="whitespace-nowrap text-[10px] text-text-tertiary">{step.sub}</p>
                </div>
              </div>
              {i < WIZARD_STEPS.length - 1 && (
                <div className={`mx-1 mt-4 h-0.5 flex-1 ${done ? 'bg-primary-600' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Form field: Objective grid ────────────────────────────────────────────────
function ObjectiveGrid({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {OBJECTIVES.map((obj) => {
        const Icon     = obj.icon
        const selected = value === obj.value
        return (
          <button
            key={obj.value}
            type="button"
            onClick={() => onChange(obj.value)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all ${
              selected
                ? 'border-primary-500 bg-primary-50 shadow-sm'
                : 'border-border-default bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${selected ? obj.bg : 'bg-gray-50'}`}>
              <Icon size={16} className={selected ? obj.color : 'text-text-tertiary'} />
            </span>
            <span className={`text-[10px] font-semibold ${selected ? 'text-primary-700' : 'text-text-secondary'}`}>
              {obj.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Campaign Setup form (step 2 content) ─────────────────────────────────────
function CampaignSetupForm({ defaultValues, onUpdate }) {
  const { register, control, watch } = useForm({ defaultValues })
  const nameVal = watch('name', defaultValues.name)
  const cbo     = watch('cboEnabled', defaultValues.cboEnabled)
  const sched   = watch('schedule', defaultValues.schedule)

  const inputCls = 'w-full rounded-btn border border-border-default bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500'
  const selectCls = inputCls + ' appearance-none cursor-pointer'

  return (
    <Card title="Campaign Setup">
      <div className="space-y-5">
        {/* Campaign Objective */}
        <div>
          <FieldLabel required>Campaign Objective</FieldLabel>
          <Controller
            name="objective"
            control={control}
            render={({ field }) => (
              <ObjectiveGrid value={field.value} onChange={(v) => { field.onChange(v); onUpdate({ objective: v }) }} />
            )}
          />
          {watch('objective') === 'conversions' && (
            <HelperText>Drive valuable actions on your website or app.</HelperText>
          )}
        </div>

        {/* Campaign Name */}
        <div>
          <FieldLabel htmlFor="camp-name" required>Campaign Name</FieldLabel>
          <div className="relative">
            <input
              id="camp-name"
              {...register('name', { onChange: (e) => onUpdate({ name: e.target.value }) })}
              className={inputCls}
              maxLength={100}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text-tertiary">
              {nameVal.length}/100
            </span>
          </div>
        </div>

        {/* Buying Type */}
        <div>
          <FieldLabel htmlFor="buying-type">Buying Type</FieldLabel>
          <div className="relative">
            <select id="buying-type" {...register('buyingType')} className={selectCls}>
              <option value="auction">Auction</option>
              <option value="reach_frequency">Reach &amp; Frequency</option>
              <option value="fixed_cpm">Fixed CPM</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          </div>
        </div>

        {/* Campaign Budget Optimization */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-primary">Campaign Budget Optimization</p>
              <p className="text-[11px] text-text-tertiary">Let Meta distribute budget across ad sets</p>
            </div>
            <Controller
              name="cboEnabled"
              control={control}
              render={({ field }) => (
                <Toggle value={field.value} onChange={(v) => { field.onChange(v); onUpdate({ cboEnabled: v }) }} />
              )}
            />
          </div>
        </div>

        {/* Budget */}
        {cbo && (
          <div>
            <FieldLabel required>Budget</FieldLabel>
            <div className="flex gap-2">
              <div className="relative w-36 shrink-0">
                <select {...register('budgetType')} className={selectCls}>
                  <option value="daily">Daily Budget</option>
                  <option value="lifetime">Lifetime Budget</option>
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              </div>
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  {...register('budgetAmount', { onChange: (e) => onUpdate({ budgetAmount: e.target.value }) })}
                  className={inputCls + ' pl-7'}
                />
              </div>
              <div className="relative w-20 shrink-0">
                <select {...register('currency')} className={selectCls}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              </div>
            </div>
            <HelperText>Recommended budget based on AI analysis: $40 – $70 / day</HelperText>
          </div>
        )}

        {/* Campaign Schedule */}
        <div>
          <FieldLabel>Campaign Schedule</FieldLabel>
          <Controller
            name="schedule"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                {[
                  { value: 'continuous', label: 'Run continuously starting today' },
                  { value: 'dates',      label: 'Set start and end dates'         },
                ].map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-default p-3 transition-colors hover:bg-gray-50">
                    <input
                      type="radio"
                      value={opt.value}
                      checked={field.value === opt.value}
                      onChange={() => { field.onChange(opt.value); onUpdate({ schedule: opt.value }) }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-text-primary">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          />
          {sched === 'dates' && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="start-date">Start Date</FieldLabel>
                <input id="start-date" type="date" {...register('startDate')} className={inputCls} />
              </div>
              <div>
                <FieldLabel htmlFor="end-date">End Date</FieldLabel>
                <input id="end-date" type="date" {...register('endDate')} className={inputCls} />
              </div>
            </div>
          )}
        </div>

        {/* AI Budget Recommendation infobox */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-primary-600" />
              <p className="text-xs font-semibold text-primary-800">AI Budget Recommendation</p>
            </div>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Recommended</span>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-blue-700">
            Based on your objective, audience size and creative performance prediction.
          </p>
          <div className="space-y-2.5">
            {/* Budget range row */}
            <div className="flex items-start justify-between gap-3 rounded-lg bg-white/70 px-3 py-2.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Recommended Daily Budget</p>
                <p className="mt-0.5 text-sm font-bold text-text-primary">$45.00 – $65.00</p>
              </div>
              <p className="shrink-0 text-[10px] text-text-tertiary">Optimal range for best results</p>
            </div>
            {/* Estimated results row */}
            <div className="rounded-lg bg-white/70 px-3 py-2.5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Estimated Results (Daily)</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Leads',            value: '22–38'       },
                  { label: 'Cost per Lead',     value: '$18–$28'     },
                  { label: 'ROAS',              value: '2.8×–3.5×'   },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-sm font-bold text-primary-700">{value}</p>
                    <p className="text-[10px] text-text-tertiary">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CampaignWizardPage() {
  const navigate    = useNavigate()
  const currentStep = useCampaignStore((s) => s.currentStep)
  const formData    = useCampaignStore((s) => s.formData)
  const setStep     = useCampaignStore((s) => s.setStep)
  const setFormData = useCampaignStore((s) => s.setFormData)

  return (
    <div className="space-y-5 p-4 pb-24 sm:p-6">
      <Breadcrumb items={[
        { label: 'Campaigns', to: '/campaigns' },
        { label: 'New Campaign' },
      ]} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-text-primary">Campaign Publishing Workflow</h1>
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
              New Campaign
            </span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Set up and launch your campaign directly to Meta Ads from your creative brief
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={Save}>Save as Draft</Button>
          <Button variant="outline" size="sm" icon={Calendar}>Schedule</Button>
          <SplitLaunchButton onLaunch={() => navigate('/campaigns')} />
        </div>
      </div>

      {/* ── Stepper ─────────────────────────────────────────────────────────── */}
      <CampaignStepper currentStep={currentStep} />

      {/* ── Three-column body ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

        {/* LEFT */}
        <div className="space-y-5 xl:col-span-3">
          {/* Selected Creative */}
          <Card
            title="Selected Creative"
            headerRight={
              <button className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline">
                <Edit3 size={12} /> Edit
              </button>
            }
          >
            <div className="relative overflow-hidden rounded-xl bg-gray-900" style={{ aspectRatio: '4/5' }}>
              <img
                src="https://picsum.photos/seed/dtf-creative/320/400"
                alt="Creative thumbnail"
                className="h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 shadow-lg">
                  <Play size={20} className="ml-1 text-gray-800" />
                </span>
              </div>
              <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">15s</span>
            </div>
            <div className="mt-3">
              <p className="text-sm font-semibold text-text-primary">
                Fast DTF Transfers – Same Day Shipping
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {['UGC Video', '15s', 'Approved'].map((tag, i) => (
                  <span
                    key={tag}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      i === 2
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          {/* AI Creative Score */}
          <Card title="AI Creative Score">
            <div className="flex flex-col items-center">
              <CreativeScoreGauge score={87} />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-text-primary">Why this creative?</p>
              <ul className="space-y-1.5">
                {CREATIVE_SCORE_BULLETS.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle size={12} className="mt-0.5 shrink-0 text-green-500" />
                    <span className="text-[11px] leading-snug text-text-secondary">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4">
              <button
                onClick={() => navigate('/creative-review')}
                className="flex w-full items-center justify-center gap-1.5 rounded-btn border border-border-default bg-white px-4 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-gray-50"
              >
                <BarChart2 size={13} /> View Creative Analysis
              </button>
            </div>
          </Card>

          {/* Creative Variants */}
          <Card
            title="Creative Variants (3)"
            headerRight={
              <button
                onClick={() => navigate('/creative-review')}
                className="text-[11px] font-medium text-primary-600 hover:underline"
              >
                View All
              </button>
            }
          >
            <div className="flex gap-2.5">
              {VARIANTS.map((v) => (
                <div
                  key={v.id}
                  className="relative flex-1 cursor-pointer overflow-hidden rounded-lg bg-gray-100 transition-opacity hover:opacity-90"
                  style={{ aspectRatio: '4/5' }}
                >
                  <img
                    src={`https://picsum.photos/seed/${v.seed}/80/100`}
                    alt="Variant"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/70">
                      <Play size={10} className="ml-0.5 text-gray-700" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* MIDDLE */}
        <div className="xl:col-span-6">
          <CampaignSetupForm defaultValues={formData} onUpdate={setFormData} />
        </div>

        {/* RIGHT */}
        <div className="space-y-5 xl:col-span-3">
          {/* Launch Readiness */}
          <Card title="Launch Readiness">
            <ul className="space-y-2.5">
              {READINESS_STEPS.map((step, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    step.done
                      ? 'bg-green-500 text-white'
                      : step.current
                      ? 'border-2 border-primary-600 text-primary-600'
                      : 'border-2 border-gray-200 text-text-tertiary'
                  }`}>
                    {step.done ? <Check size={11} /> : i + 1}
                  </span>
                  <span className={`text-xs font-medium ${
                    step.done ? 'text-green-700' : step.current ? 'text-primary-700' : 'text-text-tertiary'
                  }`}>
                    {step.label}
                  </span>
                  <span className={`ml-auto text-[10px] font-semibold ${
                    step.done ? 'text-green-600' : step.current ? 'text-primary-600' : 'text-text-tertiary'
                  }`}>
                    {step.done ? 'Done' : step.current ? 'In Progress' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-[10px] text-text-tertiary">
                <span>Progress</span>
                <span>1 / 6 steps</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-[17%] rounded-full bg-primary-600 transition-all" />
              </div>
            </div>
          </Card>

          {/* Campaign Summary */}
          <Card title="Campaign Summary">
            <dl className="space-y-2.5">
              {[
                { label: 'Objective',  value: 'Conversions'                            },
                { label: 'Budget',     value: `$${formData.budgetAmount} / day`        },
                { label: 'Schedule',   value: formData.schedule === 'continuous' ? 'Run continuously' : 'Custom dates' },
                { label: 'Platform',   value: 'Meta Ads (Facebook + Instagram)'        },
                { label: 'Creative',   value: 'Fast DTF Transfers – Same Day Shipping' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <dt className="text-[11px] font-medium text-text-tertiary">{label}</dt>
                  <dd className="text-right text-[11px] font-semibold text-text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* AI Campaign Insights */}
          <Card title="AI Campaign Insights">
            <ul className="space-y-2">
              {AI_INSIGHTS.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle size={12} className="mt-0.5 shrink-0 text-green-500" />
                  <span className="text-[11px] leading-snug text-text-secondary">{b}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Connected Ad Account */}
          <Card title="Connected Ad Account">
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-border-default p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600">
                  <Globe size={16} className="text-white" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-primary">DecoInks Media</p>
                  <p className="text-[10px] text-text-tertiary">Act # 1234567890</p>
                </div>
                <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-green-600">
                  <Wifi size={10} /> Connected
                </span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5">
                <Info size={12} className="mt-0.5 shrink-0 text-amber-500" />
                <p className="text-[10px] text-amber-700">
                  Publishing will create the campaign directly in your Meta Ads account.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Wizard nav footer ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-card border border-border-default bg-white px-6 py-4 shadow-card">
        <Button
          variant="outline"
          icon={ChevronLeft}
          onClick={() => currentStep > 1 && setStep(currentStep - 1)}
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
              aria-label={`Step ${s.num}`}
            />
          ))}
        </div>
        <Button
          variant="primary"
          icon={ChevronRight}
          onClick={() => currentStep < 6 && setStep(currentStep + 1)}
          disabled={currentStep === 6}
        >
          {currentStep === 5 ? 'Review & Launch' : 'Next Step'}
        </Button>
      </div>
    </div>
  )
}
