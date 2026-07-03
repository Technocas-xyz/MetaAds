import { useNavigate } from 'react-router-dom'
import { Plus, Play, TrendingUp } from 'lucide-react'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Button from '../../components/ui/Button'
import { useCampaigns } from '../../hooks/queries/useCampaigns'

const STATUS_CFG = {
  active: { cls: 'bg-green-100 text-green-700', label: 'Active' },
  paused: { cls: 'bg-amber-100 text-amber-700', label: 'Paused' },
  draft:  { cls: 'bg-gray-100 text-gray-600',   label: 'Draft'  },
}

function CampaignCard({ campaign, onClick }) {
  const status = STATUS_CFG[campaign.status] ?? STATUS_CFG.draft
  const roasUp = campaign.roas >= 2

  return (
    <div
      className="cursor-pointer rounded-card border border-border-default bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover"
      onClick={() => onClick(campaign.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
          <Play size={16} className="ml-0.5 text-primary-600" />
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
          {status.label}
        </span>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-text-primary">{campaign.name}</h3>
      <p className="mt-0.5 text-[11px] text-text-tertiary">{campaign.platform}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { label: 'Spend',       value: `$${campaign.spend.toLocaleString()}`                        },
          { label: 'ROAS',        value: `${campaign.roas.toFixed(1)}x`, color: roasUp ? 'text-green-600' : 'text-red-600' },
          { label: 'Impressions', value: `${(campaign.impressions / 1000).toFixed(0)}K`               },
          { label: 'Conversions', value: campaign.conversions                                          },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p className="text-[10px] text-text-tertiary">{label}</p>
            <p className={`text-xs font-semibold ${color ?? 'text-text-primary'}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CampaignsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useCampaigns()
  const campaigns = Array.isArray(data) ? data : (data?.data ?? [])

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Breadcrumb />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Campaigns</h1>
          <p className="mt-1 text-sm text-text-secondary">Manage and launch your Meta Ads campaigns</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => navigate('/campaigns/new')}>
          New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-card bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} onClick={(id) => navigate(`/campaigns/${id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
