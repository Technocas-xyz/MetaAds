import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import {
  RefreshCw, X, Brain, Settings2, Database, BarChart2,
  Link2, Bell, Server, Code2, CreditCard, Activity,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Button from '../../components/ui/Button'
import client from '../../api/client'

// ── helpers ──────────────────────────────────────────────────────────────────

function Card({ title, subtitle, children, className = '' }) {
  return (
    <div className={`rounded-card border border-border-default bg-white shadow-card ${className}`}>
      {(title || subtitle) && (
        <div className="border-b border-border-default px-5 py-4">
          {title && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

function FieldRow({ label, helper, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-text-primary">{label}</label>
      {children}
      {helper && <p className="text-[11px] text-text-tertiary">{helper}</p>}
    </div>
  )
}

function SelectInput({ ...props }) {
  return (
    <select
      className="w-full rounded-md border border-border-default bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
      {...props}
    />
  )
}

function NumberInput({ ...props }) {
  return (
    <input
      type="number"
      className="w-full rounded-md border border-border-default bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
      {...props}
    />
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
        checked ? 'bg-primary-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function ToggleRow({ label, sub, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-text-primary">{label}</p>
        {sub && <p className="text-[11px] text-text-tertiary">{sub}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// Chip multi-select ─────────────────────────────────────────────────────────

function ChipSelect({ value = [], onChange, options }) {
  const [input, setInput] = useState('')
  const add = (opt) => {
    if (!value.includes(opt)) onChange([...value, opt])
  }
  const remove = (opt) => onChange(value.filter((v) => v !== opt))
  const remaining = options.filter((o) => !value.includes(o))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-medium text-primary-700"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              className="text-primary-400 hover:text-primary-700"
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      {remaining.length > 0 && (
        <select
          className="w-full rounded-md border border-border-default bg-white px-3 py-1.5 text-xs text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
          value=""
          onChange={(e) => { if (e.target.value) add(e.target.value) }}
        >
          <option value="">+ Add classification…</option>
          {remaining.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}
    </div>
  )
}

// Save mutation helper ───────────────────────────────────────────────────────

function useSaveSettings(section) {
  return useMutation({
    mutationFn: (body) => client.patch('/api/settings', { section, ...body }).then((r) => r.data),
    onSuccess: () => toast.success('Settings saved'),
    onError: () => toast.error('Failed to save settings'),
  })
}

// ── AI Model Configuration card ─────────────────────────────────────────────

function AIModelCard() {
  const { mutate, isPending } = useSaveSettings('ai_model')
  const { register, control, handleSubmit, watch } = useForm({
    defaultValues: {
      primaryModel:        'gpt-4o',
      visionModel:         'gpt-4o-vision',
      temperature:         0.2,
      maxTokens:           1500,
      highConfidence:      70,
      medConfidence:       40,
      autoApproveHigh:     true,
      autoFlagLow:         true,
    },
  })
  const temp = watch('temperature')

  return (
    <Card
      title="AI Model Configuration"
      subtitle="Configure the AI models and parameters used for ad analysis."
    >
      <form onSubmit={handleSubmit(mutate)} className="space-y-4">
        {/* Primary Model */}
        <FieldRow label="Primary AI Model">
          <div className="flex items-center gap-2">
            <SelectInput {...register('primaryModel')} className="flex-1 rounded-md border border-border-default bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="gpt-4o">OpenAI GPT-4o</option>
              <option value="gpt-4-turbo">OpenAI GPT-4 Turbo</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
            </SelectInput>
            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              Active
            </span>
          </div>
        </FieldRow>

        {/* Vision Model */}
        <FieldRow label="Vision Model">
          <SelectInput {...register('visionModel')}>
            <option value="gpt-4o-vision">GPT-4o Vision</option>
            <option value="gpt-4-vision-preview">GPT-4 Vision Preview</option>
          </SelectInput>
        </FieldRow>

        {/* Temperature */}
        <FieldRow label="Temperature" helper="Lower values = more consistent results">
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            className="w-full rounded-md border border-border-default bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            {...register('temperature', { valueAsNumber: true })}
          />
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[10px] text-text-tertiary">0</span>
            <Controller
              control={control}
              name="temperature"
              render={({ field }) => (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={field.value}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  className="flex-1 accent-primary-600"
                />
              )}
            />
            <span className="text-[10px] text-text-tertiary">1.0</span>
            <span className="w-8 text-right text-[10px] font-medium text-text-primary">{Number(temp).toFixed(2)}</span>
          </div>
        </FieldRow>

        {/* Max Tokens */}
        <FieldRow label="Max Tokens" helper="Maximum tokens per analysis request">
          <NumberInput {...register('maxTokens', { valueAsNumber: true })} />
        </FieldRow>

        {/* Confidence Thresholds */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-text-primary">Confidence Thresholds</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'highConfidence', label: 'High Confidence', suffix: '% and above', color: 'text-green-700 bg-green-50 border-green-200' },
              { key: 'medConfidence',  label: 'Medium Confidence', suffix: '% to 69%',  color: 'text-amber-700 bg-amber-50 border-amber-200' },
              { key: 'lowLabel',       label: 'Low Confidence',   static: 'Below 40%',  color: 'text-red-700 bg-red-50 border-red-200' },
            ].map(({ key, label, suffix, static: staticVal, color }) => (
              <div key={key} className={`rounded-lg border p-2 text-center ${color}`}>
                <p className="text-[10px] font-medium">{label}</p>
                {staticVal ? (
                  <p className="mt-0.5 text-xs font-semibold">{staticVal}</p>
                ) : (
                  <div className="mt-0.5 flex items-center justify-center gap-0.5">
                    <input
                      type="number"
                      className="w-10 rounded border-0 bg-transparent text-center text-xs font-semibold focus:outline-none"
                      {...register(key, { valueAsNumber: true })}
                    />
                    <span className="text-[10px]">{suffix}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Auto Actions */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-primary">Auto Actions</p>
          <label className="flex items-start gap-2 text-xs text-text-secondary">
            <input type="checkbox" className="mt-0.5 accent-primary-600" {...register('autoApproveHigh')} />
            Auto-approve high confidence results ≥ 70%
          </label>
          <label className="flex items-start gap-2 text-xs text-text-secondary">
            <input type="checkbox" className="mt-0.5 accent-primary-600" {...register('autoFlagLow')} />
            Auto-flag low confidence results &lt; 40% to review queue
          </label>
        </div>

        <Button variant="primary" type="submit" loading={isPending}>Save Changes</Button>
      </form>
    </Card>
  )
}

// ── Analysis Queue card ──────────────────────────────────────────────────────

function AnalysisQueueCard() {
  const { mutate, isPending } = useSaveSettings('queue')
  const { register, handleSubmit } = useForm({
    defaultValues: { maxConcurrent: 5, rateLimit: 60 },
  })

  return (
    <Card
      title="Analysis Queue Settings"
      subtitle="Configure concurrent analysis and rate limits."
    >
      <form onSubmit={handleSubmit(mutate)} className="space-y-4">
        <FieldRow label="Max Concurrent Analyses" helper="Maximum ads to analyze simultaneously">
          <NumberInput {...register('maxConcurrent', { valueAsNumber: true })} />
        </FieldRow>
        <FieldRow label="Rate Limit (Requests/Min)" helper="API requests per minute">
          <NumberInput {...register('rateLimit', { valueAsNumber: true })} />
        </FieldRow>
        <Button variant="primary" type="submit" loading={isPending}>Save Queue Settings</Button>
      </form>
    </Card>
  )
}

// ── Analysis Preferences card ────────────────────────────────────────────────

const HOOK_OPTS   = ['Pain Point', 'Benefit', 'Curiosity', 'Price/Discount', 'How To', 'Social Proof', 'Other']
const ANGLE_OPTS  = ['Quality', 'Price', 'Speed', 'Convenience', 'Innovation', 'Trust', 'Sustainability', 'Other']
const OFFER_OPTS  = ['Discount', 'Bundle', 'Free Shipping', 'BOGO', 'Limited Time', 'Guarantee', 'Other']
const LANG_OPTS   = ['English (US)', 'English (UK)', 'Spanish', 'French', 'German', 'Portuguese']

function AnalysisPrefsCard() {
  const { mutate, isPending } = useSaveSettings('analysis_prefs')
  const { control, handleSubmit } = useForm({
    defaultValues: {
      hookTypes:       ['Pain Point', 'Benefit', 'Curiosity', 'Price/Discount', 'How To', 'Social Proof', 'Other'],
      angleTypes:      ['Quality', 'Price', 'Speed', 'Convenience', 'Innovation', 'Trust', 'Sustainability', 'Other'],
      offerTypes:      ['Discount', 'Bundle', 'Free Shipping', 'BOGO', 'Limited Time', 'Guarantee', 'Other'],
      formatDetection: true,
      audienceDetect:  true,
      language:        'English (US)',
    },
  })

  return (
    <Card
      title="Analysis Preferences"
      subtitle="Customize how ads are analyzed and categorized."
    >
      <form onSubmit={handleSubmit(mutate)} className="space-y-4">
        <FieldRow label="Hook Classification">
          <Controller control={control} name="hookTypes"
            render={({ field }) => <ChipSelect value={field.value} onChange={field.onChange} options={HOOK_OPTS} />} />
        </FieldRow>

        <FieldRow label="Angle Classification">
          <Controller control={control} name="angleTypes"
            render={({ field }) => <ChipSelect value={field.value} onChange={field.onChange} options={ANGLE_OPTS} />} />
        </FieldRow>

        <FieldRow label="Offer Type Detection">
          <Controller control={control} name="offerTypes"
            render={({ field }) => <ChipSelect value={field.value} onChange={field.onChange} options={OFFER_OPTS} />} />
        </FieldRow>

        <div className="space-y-3 border-t border-border-default pt-3">
          <Controller control={control} name="formatDetection"
            render={({ field }) => (
              <ToggleRow
                label="Enable Creative Format Detection"
                sub="Detect the format and style of ad creatives"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller control={control} name="audienceDetect"
            render={({ field }) => (
              <ToggleRow
                label="Enable Audience Type Detection"
                sub="Detect target audience from ad content"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <FieldRow label="Language for Analysis">
          <Controller control={control} name="language"
            render={({ field }) => (
              <SelectInput value={field.value} onChange={field.onChange}>
                {LANG_OPTS.map((l) => <option key={l} value={l}>{l}</option>)}
              </SelectInput>
            )}
          />
        </FieldRow>

        <Button variant="primary" type="submit" loading={isPending}>Save Preferences</Button>
      </form>
    </Card>
  )
}

// ── Export Settings card ─────────────────────────────────────────────────────

function ExportSettingsCard() {
  const { mutate, isPending } = useSaveSettings('export')
  const { register, control, handleSubmit } = useForm({
    defaultValues: { format: 'csv', includeImages: true, maxRecords: 5000 },
  })

  return (
    <Card title="Export Settings" subtitle="Configure default export options.">
      <form onSubmit={handleSubmit(mutate)} className="space-y-4">
        <FieldRow label="Default Export Format">
          <SelectInput {...register('format')}>
            <option value="csv">CSV</option>
            <option value="xlsx">Excel (XLSX)</option>
            <option value="json">JSON</option>
          </SelectInput>
        </FieldRow>

        <Controller control={control} name="includeImages"
          render={({ field }) => (
            <ToggleRow label="Include Images in Export" checked={field.value} onChange={field.onChange} />
          )}
        />

        <FieldRow label="Max Records Per Export">
          <NumberInput {...register('maxRecords', { valueAsNumber: true })} />
        </FieldRow>

        <Button variant="primary" type="submit" loading={isPending}>Save Export Settings</Button>
      </form>
    </Card>
  )
}

// ── Data & Processing card ───────────────────────────────────────────────────

function DataProcessingCard() {
  const { mutate, isPending } = useSaveSettings('data')
  const { register, control, handleSubmit } = useForm({
    defaultValues: {
      reanalysis:    'low_confidence',
      deduplication: 'high',
      retention:     '12_months',
      imageQuality:  'high',
      autoCleanup:   false,
    },
  })

  return (
    <Card title="Data & Processing" subtitle="Manage data processing and storage settings.">
      <form onSubmit={handleSubmit(mutate)} className="space-y-4">
        <FieldRow label="Ad Re-analysis">
          <SelectInput {...register('reanalysis')}>
            <option value="low_confidence">Re-analyze low confidence ads only</option>
            <option value="all">Re-analyze all ads</option>
            <option value="never">Never re-analyze</option>
          </SelectInput>
        </FieldRow>

        <FieldRow label="Duplicate Detection">
          <SelectInput {...register('deduplication')}>
            <option value="high">High (Strict)</option>
            <option value="medium">Medium</option>
            <option value="low">Low (Permissive)</option>
          </SelectInput>
        </FieldRow>

        <FieldRow label="Data Retention">
          <SelectInput {...register('retention')}>
            <option value="3_months">3 Months</option>
            <option value="6_months">6 Months</option>
            <option value="12_months">12 Months</option>
            <option value="24_months">24 Months</option>
            <option value="forever">Forever</option>
          </SelectInput>
        </FieldRow>

        <FieldRow label="Image Storage Quality">
          <SelectInput {...register('imageQuality')}>
            <option value="high">High (Original)</option>
            <option value="medium">Medium (Compressed)</option>
            <option value="low">Low (Thumbnail Only)</option>
          </SelectInput>
        </FieldRow>

        <div className="space-y-1">
          <Controller control={control} name="autoCleanup"
            render={({ field }) => (
              <ToggleRow
                label="Auto Cleanup"
                sub="Remove archived data to save storage"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <Button variant="primary" type="submit" loading={isPending}>Save Settings</Button>
      </form>
    </Card>
  )
}

// ── System Information card ──────────────────────────────────────────────────

function SystemInfoCard() {
  const INFO_ROWS = [
    { label: 'AI Credits Used',      value: '7,200 / 10,000' },
    { label: 'Member Since',         value: 'Apr 15, 2026'   },
    { label: 'Last System Update',   value: 'May 7, 2026, 10:30 AM' },
    { label: 'Version',              value: 'v1.4.0'         },
  ]

  return (
    <Card title="System Information">
      <div className="space-y-3">
        {/* Current Plan */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Current Plan</span>
          <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">Pro</span>
        </div>

        {INFO_ROWS.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">{label}</span>
            <span className="font-medium text-text-primary">{value}</span>
          </div>
        ))}

        <div className="pt-1">
          <Button variant="outline" icon={RefreshCw} className="w-full justify-center">
            Check for Updates
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ── Placeholder tab ──────────────────────────────────────────────────────────

function PlaceholderTab({ icon: Icon, name }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-card border border-border-default bg-white p-10 text-center shadow-card">
      {Icon && <Icon size={36} className="text-gray-300" />}
      <p className="text-base font-medium text-text-secondary">{name}</p>
      <p className="text-sm text-text-tertiary">This section is coming soon.</p>
    </div>
  )
}

// ── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'ai',           label: 'AI & Analysis',  icon: Brain        },
  { id: 'integrations', label: 'Integrations',   icon: Link2        },
  { id: 'competitors',  label: 'Competitors',    icon: BarChart2    },
  { id: 'notifications',label: 'Notifications',  icon: Bell         },
  { id: 'system',       label: 'System',         icon: Server       },
  { id: 'api',          label: 'API & Webhooks', icon: Code2        },
  { id: 'billing',      label: 'Billing',        icon: CreditCard   },
]

// ── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('ai')
  const currentTab = TABS.find((t) => t.id === activeTab)

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Breadcrumb />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your AI model, analysis preferences, and system configurations.
        </p>
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max border-b border-border-default">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'ai' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Col 1 */}
          <div className="space-y-6">
            <AIModelCard />
            <AnalysisQueueCard />
          </div>

          {/* Col 2 */}
          <div className="space-y-6">
            <AnalysisPrefsCard />
            <ExportSettingsCard />
          </div>

          {/* Col 3 */}
          <div className="space-y-6">
            <DataProcessingCard />
            <SystemInfoCard />
          </div>
        </div>
      ) : (
        <PlaceholderTab icon={currentTab?.icon} name={currentTab?.label} />
      )}
    </div>
  )
}
