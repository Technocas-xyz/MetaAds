import { useParams, useNavigate } from 'react-router-dom'
import { Edit3, Download, Send, ArrowLeft } from 'lucide-react'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Button from '../../components/ui/Button'
import { useBrief } from '../../hooks/queries/useBriefs'

function Row({ label, value, children }) {
  return (
    <div className="flex flex-wrap items-start gap-2 border-b border-border-default py-3 last:border-0">
      <dt className="w-36 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</dt>
      <dd className="flex-1 text-sm text-text-primary">{children ?? value ?? '—'}</dd>
    </div>
  )
}

export default function BriefDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { data: brief, isLoading } = useBrief(id)

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-96 animate-pulse rounded-card bg-gray-100" />
      </div>
    )
  }

  if (!brief) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6">
        <p className="text-text-secondary">Brief not found.</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/briefs')}>Back to Briefs</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Breadcrumb items={[
        { label: 'Creative Briefs', to: '/briefs' },
        { label: brief.title },
      ]} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{brief.title}</h1>
          <p className="mt-1 text-sm text-text-secondary">Read-only view · Created {new Date(brief.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={Download}>Export PDF</Button>
          <Button variant="outline" size="sm" icon={Edit3} onClick={() => navigate('/briefs/new')}>Edit in Generator</Button>
          <Button variant="primary" size="sm" icon={Send}>Send to Design Team</Button>
        </div>
      </div>

      <div className="rounded-card border border-border-default bg-white p-6 shadow-card">
        <dl>
          <Row label="Hook Type"       value={brief.hook_type} />
          <Row label="Angle"           value={brief.angle} />
          <Row label="Offer Type"      value={brief.offer_type} />
          <Row label="Platform"        value={brief.platform} />
          <Row label="Target Audience" value={brief.target_audience} />
          <Row label="Key Messages"    value={brief.key_messages?.join(' · ')} />
          <Row label="Suggested Copy"  value={brief.suggested_copy} />
          <Row label="Status">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${brief.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {brief.status}
            </span>
          </Row>
        </dl>
      </div>
    </div>
  )
}
