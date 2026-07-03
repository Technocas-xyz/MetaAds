import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Eye, Clock } from 'lucide-react'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Button from '../../components/ui/Button'
import { useBriefs } from '../../hooks/queries/useBriefs'

const FORMAT_LABELS = {
  Video:    { cls: 'bg-blue-100 text-blue-700',   label: 'Video' },
  Image:    { cls: 'bg-purple-100 text-purple-700',label: 'Image' },
  Carousel: { cls: 'bg-pink-100 text-pink-700',   label: 'Carousel' },
}

const STATUS_CFG = {
  active: { cls: 'bg-green-100 text-green-700', label: 'Active' },
  draft:  { cls: 'bg-gray-100 text-gray-600',   label: 'Draft'  },
}

function BriefCard({ brief, onClick }) {
  const status = STATUS_CFG[brief.status] ?? STATUS_CFG.draft
  const date   = new Date(brief.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex flex-col rounded-card border border-border-default bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
          <FileText size={18} className="text-primary-600" />
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
          {status.label}
        </span>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-text-primary">{brief.title}</h3>

      <div className="mt-2 space-y-1">
        <p className="flex items-center gap-1.5 text-[11px] text-text-secondary">
          <span className="font-medium text-text-tertiary">Hook:</span> {brief.hook_type}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-text-secondary">
          <span className="font-medium text-text-tertiary">Angle:</span> {brief.angle}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-text-secondary">
          <span className="font-medium text-text-tertiary">Offer:</span> {brief.offer_type}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-text-tertiary">
        <Clock size={11} /> {date}
      </div>

      <div className="mt-4 pt-3 border-t border-border-default">
        <button
          onClick={() => onClick(brief.id)}
          className="flex w-full items-center justify-center gap-1.5 rounded-btn border border-border-default bg-white px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-gray-50"
        >
          <Eye size={13} /> View Brief
        </button>
      </div>
    </div>
  )
}

export default function BriefsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useBriefs()
  const briefs = Array.isArray(data) ? data : (data?.data ?? [])

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Breadcrumb />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Creative Briefs</h1>
          <p className="mt-1 text-sm text-text-secondary">AI-generated briefs for your design team</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => navigate('/briefs/new')}>
          New Brief
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-card bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {briefs.map((b) => (
            <BriefCard key={b.id} brief={b} onClick={(id) => navigate(`/briefs/${id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
