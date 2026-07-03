import {
  BarChart2, CheckCircle2, XCircle, Timer, Trophy, Clock,
} from 'lucide-react'
import KPICard from '../../../components/ui/KPICard'

function Skeleton() {
  return (
    <div className="animate-pulse rounded-card border border-border-default bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-gray-200" />
          <div className="mt-2 h-8 w-20 rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}

export default function CompetitorKPIs({ summary, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
      </div>
    )
  }

  const s = summary ?? {}

  const cards = [
    {
      title:     'Total Ads Analyzed',
      value:     s.total_ads_analyzed ?? 12842,
      icon:      BarChart2,
      iconBg:    'bg-primary-50',
      iconColor: 'text-primary-500',
      trend:     s.total_ads_trend ?? 18.6,
      trendUp:   true,
    },
    {
      title:     'Existing Ads',
      value:     s.existing_ads ?? 8756,
      icon:      CheckCircle2,
      iconBg:    'bg-success-50',
      iconColor: 'text-success-600',
      note:      `${s.existing_ads_pct ?? 68.2}% of analyzed`,
    },
    {
      title:     'Removed Ads',
      value:     s.removed_ads ?? 4086,
      icon:      XCircle,
      iconBg:    'bg-danger-50',
      iconColor: 'text-danger-600',
      note:      `${s.removed_ads_pct ?? 31.8}% of analyzed`,
    },
    {
      title:     'Ads Running 7+ Days',
      value:     s.running_7_plus ?? 6342,
      icon:      Timer,
      iconBg:    'bg-warning-50',
      iconColor: 'text-warning-600',
      note:      `${s.running_7_plus_pct ?? 49.4}% of existing`,
    },
    {
      title:     'Winning Ads',
      value:     s.winning_ads ?? 2153,
      icon:      Trophy,
      iconBg:    'bg-amber-50',
      iconColor: 'text-amber-600',
      note:      `${s.winning_ads_pct ?? 24.6}% of existing`,
    },
    {
      title:     'Avg Ad Duration',
      value:     `${s.avg_duration ?? 14.6}`,
      icon:      Clock,
      iconBg:    'bg-slate-50',
      iconColor: 'text-slate-500',
      note:      'days per ad',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <KPICard key={card.title} {...card} />
      ))}
    </div>
  )
}
