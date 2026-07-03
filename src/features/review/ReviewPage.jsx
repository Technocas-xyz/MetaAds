import { useState, useMemo } from 'react'
import {
  Filter, Layers, Users,
  AlertTriangle, AlertCircle, ShieldAlert,
} from 'lucide-react'
import Breadcrumb from '../../components/layout/Breadcrumb'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import KPICard from '../../components/ui/KPICard'
import {
  useReviewQueue,
  useReviewQueueSummary,
} from '../../hooks/queries/useReview'
import ReviewQueueTable from './ReviewQueueTable'

const STATUS_OPTIONS = ['All Statuses', 'Pending', 'In Review', 'Approved', 'Rejected']
const REASON_OPTIONS = ['All Reasons', 'Low Confidence', 'Missing Information', 'Flagged by Rule']

function KPIShimmer() {
  return (
    <div className="animate-pulse rounded-card border border-border-default bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-gray-200" />
          <div className="h-8 w-16 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}

function StatCard({ title, value, pct, icon: Icon, iconBg, iconColor, noteColor }) {
  return (
    <div className="rounded-card border border-border-default bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-text-primary">{value}</p>
          <p className={`mt-1 text-xs font-medium ${noteColor}`}>{pct}% of queue</p>
        </div>
        <div className={`flex-shrink-0 rounded-xl p-2.5 ${iconBg}`}>
          <Icon size={22} className={iconColor} />
        </div>
      </div>
    </div>
  )
}

export default function ReviewQueuePage() {
  const [statusFilter, setStatus] = useState('All Statuses')
  const [reasonFilter, setReason] = useState('All Reasons')

  const { data: summary, isLoading: sumLoading } = useReviewQueueSummary()
  const { data: queueData, isLoading: queueLoading } = useReviewQueue()

  const allItems = queueData?.data ?? []

  const filtered = useMemo(() => {
    return allItems.filter((r) => {
      if (statusFilter !== 'All Statuses' && r.status !== statusFilter.toLowerCase().replace(' ', '_')) return false
      if (reasonFilter === 'Low Confidence'    && r.reason !== 'low_confidence')  return false
      if (reasonFilter === 'Missing Information' && r.reason !== 'missing_info')  return false
      if (reasonFilter === 'Flagged by Rule'   && r.reason !== 'flagged_by_rule') return false
      return true
    })
  }, [allItems, statusFilter, reasonFilter])

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Breadcrumb />

      <PageHeader
        title="Review Queue"
        subtitle="Ads that need human review and validation"
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-btn border border-border-default bg-white px-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <select
              value={reasonFilter}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 rounded-btn border border-border-default bg-white px-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {REASON_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <Button variant="outline" size="sm" icon={Filter}>Filters</Button>
            <Button variant="primary" size="sm" icon={Layers}>Bulk Actions</Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {sumLoading
          ? Array.from({ length: 5 }).map((_, i) => <KPIShimmer key={i} />)
          : (
            <>
              <KPICard
                title="Total In Queue"
                value={summary?.total}
                icon={Layers}
                iconBg="bg-primary-50"
                iconColor="text-primary-600"
                note="Awaiting human review"
              />
              <StatCard
                title="Low Confidence"
                value={summary?.low_confidence?.count}
                pct={summary?.low_confidence?.pct}
                icon={AlertTriangle}
                iconBg="bg-amber-50"
                iconColor="text-amber-500"
                noteColor="text-warning-600"
              />
              <StatCard
                title="Missing Information"
                value={summary?.missing_info?.count}
                pct={summary?.missing_info?.pct}
                icon={AlertCircle}
                iconBg="bg-blue-50"
                iconColor="text-blue-500"
                noteColor="text-blue-600"
              />
              <StatCard
                title="Flagged by Rules"
                value={summary?.flagged?.count}
                pct={summary?.flagged?.pct}
                icon={ShieldAlert}
                iconBg="bg-danger-50"
                iconColor="text-danger-500"
                noteColor="text-danger-600"
              />
              <KPICard
                title="Assigned to Me"
                value={summary?.assigned_to_me}
                icon={Users}
                iconBg="bg-success-50"
                iconColor="text-success-600"
                note="In my review list"
              />
            </>
          )}
      </div>

      {/* Table — reset internal state when page-level filter changes */}
      <ReviewQueueTable
        key={`${statusFilter}|${reasonFilter}`}
        items={filtered}
        loading={queueLoading}
        summary={summary}
      />
    </div>
  )
}
