import { Layers, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import DateRangePicker from '../../components/ui/DateRangePicker'
import KPICard from '../../components/ui/KPICard'
import BarChartCard from './components/BarChartCard'
import DonutChartCard from './components/DonutChartCard'
import RecentAdsTable from './components/RecentAdsTable'
import {
  useDashboardSummary,
  useDashboardHooks,
  useDashboardAngles,
} from '../../hooks/queries/useDashboard'
import { useAds } from '../../hooks/queries/useAds'
import { useAnalyzeAd } from '../../hooks/queries/useAI'

// ── KPI card skeleton ──────────────────────────────────────────────────────────
function KPICardSkeleton() {
  return (
    <div className="animate-pulse rounded-card border border-border-default bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-gray-200" />
          <div className="mt-2 h-8 w-16 rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}

// ── KPI definitions ────────────────────────────────────────────────────────────
function buildKPIs(summary) {
  return [
    {
      title:     'Total Ads Captured',
      value:     summary?.total_ads ?? 1248,
      icon:      Layers,
      iconBg:    'bg-primary-50',
      iconColor: 'text-primary-500',
      trend:     Math.abs(summary?.trends?.total_ads ?? 18.6),
      trendUp:   true,
      href:      '/ads',
    },
    {
      title:     'Analyzed Ads',
      value:     summary?.analyzed_ads ?? 856,
      icon:      CheckCircle2,
      iconBg:    'bg-success-50',
      iconColor: 'text-success-600',
      trend:     Math.abs(summary?.trends?.analyzed_ads ?? 22.4),
      trendUp:   true,
      href:      '/ads?status=analyzed',
    },
    {
      title:     'Pending Analysis',
      value:     summary?.pending_analysis ?? 292,
      icon:      Clock,
      iconBg:    'bg-warning-50',
      iconColor: 'text-warning-600',
      trend:     Math.abs(summary?.trends?.pending_analysis ?? 8.1),
      trendUp:   false,
      href:      '/ads?status=pending',
    },
    {
      title:     'Low Confidence',
      value:     summary?.low_confidence ?? 67,
      icon:      AlertCircle,
      iconBg:    'bg-danger-50',
      iconColor: 'text-danger-600',
      trend:     Math.abs(summary?.trends?.low_confidence ?? 5.3),
      trendUp:   false,
      href:      '/low-confidence',
    },
  ]
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: hooksData, isLoading: hooksLoading }   = useDashboardHooks()
  const { data: anglesData, isLoading: anglesLoading }  = useDashboardAngles()
  const { data: adsData, isLoading: adsLoading }        = useAds({ limit: 10, sort: '-captured_at' })
  const { mutate: analyzeAd } = useAnalyzeAd()

  const barData    = hooksData?.map((h) => ({ name: h.type,  value: h.count })) ?? []
  const donutData  = anglesData?.map((a) => ({ name: a.angle, value: a.count, pct: a.pct })) ?? []
  const ads        = adsData?.data ?? []
  const totalLabel = `${summary?.analyzed_ads ?? 856} Total`
  const kpis       = buildKPIs(summary)

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        subtitle="Overview of competitor ads intelligence"
        rightSlot={<DateRangePicker />}
      />

      {/* KPI grid — 4 cols desktop, 2 cols tablet, 1 col mobile */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryLoading
          ? Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)
          : kpis.map((kpi) => <KPICard key={kpi.title} {...kpi} />)}
      </div>

      {/* Charts — side-by-side on lg, stacked below */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Hook Type Distribution"
          data={barData}
          viewAllHref="/hooks"
          isLoading={hooksLoading}
        />
        <DonutChartCard
          title="Angle Distribution"
          data={donutData}
          centerLabel={totalLabel}
          viewAllHref="/angles"
          isLoading={anglesLoading}
        />
      </div>

      {/* Recent ads table */}
      <RecentAdsTable
        ads={ads}
        isLoading={adsLoading}
        onAnalyze={(id) => analyzeAd(id)}
      />
    </div>
  )
}
