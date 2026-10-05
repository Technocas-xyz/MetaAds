import {
  BarChart2, CheckCircle2, XCircle, Timer, Trophy, Clock, Users2,
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} />)}
      </div>
    )
  }

  const s = summary ?? {}

  const cards = [
    {
      title:     'Competitors',
      value:     s.total_competitors,
      icon:      Users2,
      iconBg:    'bg-blue-50',
      iconColor: 'text-blue-600',
      note:      `${s.active_competitors ?? 0} active`,
    },
    {
      title:     'Total Ads',
      value:     s.total_ads,
      icon:      BarChart2,
      iconBg:    'bg-primary-50',
      iconColor: 'text-primary-500',
      note:      `${(s.total_ads_analyzed ?? 0).toLocaleString()} analyzed by AI`,
    },
    {
      title:     'Existing Ads',
      value:     s.existing_ads,
      icon:      CheckCircle2,
      iconBg:    'bg-success-50',
      iconColor: 'text-success-600',
      note:      `${s.existing_ads_pct ?? 0}% of all ads`,
    },
    {
      title:     'Removed Ads',
      value:     s.removed_ads,
      icon:      XCircle,
      iconBg:    'bg-danger-50',
      iconColor: 'text-danger-600',
      note:      `${s.removed_ads_pct ?? 0}% of all ads`,
    },
    {
      title:     'Ads Running 7+ Days',
      value:     s.running_7_plus,
      icon:      Timer,
      iconBg:    'bg-warning-50',
      iconColor: 'text-warning-600',
      note:      `${s.running_7_plus_pct ?? 0}% of existing`,
    },
    {
      title:     'Winning Ads',
      value:     s.winning_ads,
      icon:      Trophy,
      iconBg:    'bg-amber-50',
      iconColor: 'text-amber-600',
      note:      `Active 30+ days · ${s.winning_ads_pct ?? 0}% of existing`,
    },
    {
      title:     'Avg Ad Duration',
      value:     `${s.avg_duration ?? 0}`,
      icon:      Clock,
      iconBg:    'bg-slate-50',
      iconColor: 'text-slate-500',
      note:      'days per ad',
    },
  ]

  return (
    <div className="stagger grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
      {cards.map((card) => (
        <KPICard key={card.title} {...card} />
      ))}
    </div>
  )
}
