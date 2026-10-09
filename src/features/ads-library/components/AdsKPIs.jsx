import { Layers, CheckCircle2, Clock, AlertCircle, Calendar } from 'lucide-react'
import KPICard from '../../../components/ui/KPICard'

function Skeleton() {
  return (
    <div className="animate-pulse rounded-card border border-border-default bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-gray-200" />
          <div className="mt-2 h-8 w-20 rounded bg-gray-200" />
          <div className="h-3 w-32 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}

export default function AdsKPIs({ summary, isLoading, activeStatus, onStatusClick }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)}
      </div>
    )
  }

  const s = summary ?? {}

  const cards = [
    {
      title:     'Total Ads',
      value:     s.total,
      icon:      Layers,
      iconBg:    'bg-primary-50',
      iconColor: 'text-primary-500',
      note:      'All time',
    },
    {
      title:     'Analyzed',
      value:     s.analyzed,
      icon:      CheckCircle2,
      iconBg:    'bg-success-50',
      iconColor: 'text-success-600',
      note:      `(${s.analyzed_pct ?? 0}%) With AI analysis`,
      onClick:   onStatusClick ? () => onStatusClick('analyzed') : undefined,
      active:    activeStatus === 'analyzed',
    },
    {
      title:     'Pending Analysis',
      value:     s.pending,
      icon:      Clock,
      iconBg:    'bg-warning-50',
      iconColor: 'text-warning-600',
      note:      `(${s.pending_pct ?? 0}%) Awaiting analysis`,
      onClick:   onStatusClick ? () => onStatusClick('pending') : undefined,
      active:    activeStatus === 'pending',
    },
    {
      title:     'Low Confidence',
      value:     s.low_confidence,
      icon:      AlertCircle,
      iconBg:    'bg-danger-50',
      iconColor: 'text-danger-600',
      note:      `(${s.low_conf_pct ?? 0}%) Needs review`,
    },
    {
      title:     'This Week',
      value:     s.this_week,
      icon:      Calendar,
      iconBg:    'bg-blue-50',
      iconColor: 'text-blue-600',
      note:      'New ads captured',
    },
  ]

  return (
    <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => <KPICard key={c.title} {...c} />)}
    </div>
  )
}
