import { useMemo } from 'react'
import { Settings, AlertTriangle, RefreshCw, Filter } from 'lucide-react'
import Breadcrumb from '../../components/layout/Breadcrumb'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { useReviewQueue } from '../../hooks/queries/useReview'
import ReviewQueueTable from '../review/ReviewQueueTable'

// Mirrors settings fixture; swap for useSettings() when the API is ready
const CONFIDENCE_THRESHOLD = 70

function KPIShimmer() {
  return (
    <div className="animate-pulse rounded-card border border-border-default bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-32 rounded bg-gray-200" />
          <div className="h-8 w-14 rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}

function BucketCard({ label, range, count, total, barColor, badgeColor }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="rounded-card border border-border-default bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-text-primary">{count}</p>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-text-tertiary">{pct}% of low-conf queue</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        <span className={`flex-shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold text-white ${badgeColor}`}>
          {range}
        </span>
      </div>
    </div>
  )
}

function AvgConfCard({ avg }) {
  const r    = 20
  const circ = 2 * Math.PI * r
  const off  = circ - (avg / 100) * circ
  return (
    <div className="rounded-card border border-border-default bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <p className="text-sm font-medium text-text-secondary">Avg Confidence</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative inline-flex items-center justify-center">
          <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r={r} fill="none" stroke="#FEE2E2" strokeWidth="4" />
            <circle
              cx="26" cy="26" r={r} fill="none" stroke="#EF4444" strokeWidth="4"
              strokeDasharray={circ} strokeDashoffset={off}
              strokeLinecap="round" transform="rotate(-90 26 26)"
            />
          </svg>
          <span className="absolute text-[11px] font-bold text-text-primary">{avg}%</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-text-primary">{avg}%</p>
          <p className="text-xs font-medium text-danger-600">Below threshold</p>
        </div>
      </div>
    </div>
  )
}

export default function LowConfidencePage() {
  const { data: queueData, isLoading } = useReviewQueue()
  const allItems = queueData?.data ?? []

  // Pre-filter: only ads below the configured threshold
  const lowItems = useMemo(
    () => allItems.filter((r) => r.confidence_score < CONFIDENCE_THRESHOLD),
    [allItems],
  )

  const b0_20  = useMemo(() => lowItems.filter((r) => r.confidence_score <= 20).length, [lowItems])
  const b21_40 = useMemo(() => lowItems.filter((r) => r.confidence_score > 20 && r.confidence_score <= 40).length, [lowItems])
  const b41_th = useMemo(() => lowItems.filter((r) => r.confidence_score > 40 && r.confidence_score < CONFIDENCE_THRESHOLD).length, [lowItems])
  const avgConf = useMemo(() => {
    if (!lowItems.length) return 0
    return Math.round(lowItems.reduce((s, r) => s + r.confidence_score, 0) / lowItems.length)
  }, [lowItems])

  // Confidence-bucket tabs passed to ReviewQueueTable
  const tabs = useMemo(() => [
    {
      value:  'all',
      label:  'All',
      count:  lowItems.length,
      filter: () => true,
    },
    {
      value:  'b_0_20',
      label:  '0–20%',
      count:  b0_20,
      filter: (r) => r.confidence_score <= 20,
    },
    {
      value:  'b_21_40',
      label:  '21–40%',
      count:  b21_40,
      filter: (r) => r.confidence_score > 20 && r.confidence_score <= 40,
    },
    {
      value:  'b_41_th',
      label:  `41–${CONFIDENCE_THRESHOLD - 1}%`,
      count:  b41_th,
      filter: (r) => r.confidence_score > 40 && r.confidence_score < CONFIDENCE_THRESHOLD,
    },
    {
      value:  'assigned',
      label:  'Assigned to Me',
      count:  lowItems.filter((r) => r.assigned_to?.id === '1').length,
      filter: (r) => r.assigned_to?.id === '1',
    },
  ], [lowItems, b0_20, b21_40, b41_th])

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Breadcrumb />

      <PageHeader
        title="Low Confidence Queue"
        subtitle="Ads with AI confidence below the configured threshold"
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" icon={RefreshCw}>Re-run All</Button>
            <Button variant="outline" size="sm" icon={Filter}>Filter</Button>
            <Button variant="outline" size="sm" icon={Settings} to="/settings">
              Adjust Threshold
            </Button>
          </div>
        }
      />

      {/* Threshold notice banner */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle size={15} className="flex-shrink-0 text-amber-500" />
        <p className="text-sm text-amber-800">
          Showing ads scoring below the confidence threshold of{' '}
          <span className="font-semibold">{CONFIDENCE_THRESHOLD}%</span>.
          These ads need manual validation before publishing.
        </p>
        <Badge color="amber" className="ml-auto flex-shrink-0">
          Threshold: {CONFIDENCE_THRESHOLD}%
        </Badge>
      </div>

      {/* KPI cards — confidence buckets */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <KPIShimmer key={i} />)
          : (
            <>
              <BucketCard
                label="Critical (0–20%)"
                range="0–20"
                count={b0_20}
                total={lowItems.length}
                barColor="bg-red-500"
                badgeColor="bg-red-500"
              />
              <BucketCard
                label="Very Low (21–40%)"
                range="21–40"
                count={b21_40}
                total={lowItems.length}
                barColor="bg-orange-400"
                badgeColor="bg-orange-400"
              />
              <BucketCard
                label={`Low (41–${CONFIDENCE_THRESHOLD - 1}%)`}
                range={`41–${CONFIDENCE_THRESHOLD - 1}`}
                count={b41_th}
                total={lowItems.length}
                barColor="bg-amber-400"
                badgeColor="bg-amber-400"
              />
              <AvgConfCard avg={avgConf} />
              {/* Total */}
              <div className="rounded-card border border-border-default bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Total Low Conf</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-text-primary">{lowItems.length}</p>
                    <p className="mt-1 text-xs font-medium text-text-tertiary">Require review</p>
                  </div>
                  <div className="flex-shrink-0 rounded-xl bg-red-50 p-2.5">
                    <AlertTriangle size={22} className="text-red-500" />
                  </div>
                </div>
              </div>
            </>
          )}
      </div>

      {/* Table — pre-filtered items + confidence bucket tabs */}
      <ReviewQueueTable
        items={lowItems}
        loading={isLoading}
        tabs={tabs}
      />
    </div>
  )
}
