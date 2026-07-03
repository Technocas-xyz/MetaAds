import { useCompetitorInsights } from '../../../hooks/queries/useInsights'
import Badge from '../../../components/ui/Badge'
import Card from '../../../components/ui/Card'
import { Brain, Trophy, AlertCircle } from 'lucide-react'

export default function CompetitorInsightsPanel({ competitorId }) {
  const { data: insights, isLoading } = useCompetitorInsights(competitorId)

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-card border border-border-default bg-white p-5">
        <div className="h-4 w-32 rounded bg-gray-100" />
        <div className="mt-3 h-20 rounded bg-gray-50" />
      </div>
    )
  }

  if (!insights || insights.analyzed_count === 0) {
    return (
      <div className="rounded-card border border-border-default bg-white p-5">
        <div className="flex items-center gap-2 text-text-secondary">
          <AlertCircle size={14} />
          <span className="text-xs">No AI analysis data yet. Click "Analyze All" to generate insights.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain size={16} className="text-primary-600" />
        <h3 className="text-sm font-semibold text-text-primary">AI Insights</h3>
        <span className="text-[10px] text-text-secondary">
          ({insights.analyzed_count} of {insights.total_ads} ads analyzed)
        </span>
        {insights.limited_data && (
          <Badge color="amber" size="xs">Limited data</Badge>
        )}
      </div>

      {/* Readout */}
      {insights.readout && (
        <p className="text-xs text-text-primary leading-relaxed italic">
          "{insights.readout}"
        </p>
      )}

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Hooks */}
        <Card padding="sm" title="Hook Types">
          <div className="space-y-1.5">
            {insights.hooks.slice(0, 5).map((h) => (
              <div key={h.type} className="flex items-center justify-between">
                <Badge color="blue" size="xs">{h.type}</Badge>
                <span className="text-[10px] text-text-secondary">{h.count} ({h.pct}%)</span>
              </div>
            ))}
            {insights.hooks.length === 0 && (
              <p className="text-[10px] text-text-secondary">No data</p>
            )}
          </div>
        </Card>

        {/* Angles */}
        <Card padding="sm" title="Angles">
          <div className="space-y-1.5">
            {insights.angles.slice(0, 5).map((a) => (
              <div key={a.type} className="flex items-center justify-between">
                <Badge color="purple" size="xs">{a.type}</Badge>
                <span className="text-[10px] text-text-secondary">{a.count} ({a.pct}%)</span>
              </div>
            ))}
            {insights.angles.length === 0 && (
              <p className="text-[10px] text-text-secondary">No data</p>
            )}
          </div>
        </Card>

        {/* Offers */}
        <Card padding="sm" title="Offer Types">
          <div className="space-y-1.5">
            {insights.offers.slice(0, 5).map((o) => (
              <div key={o.type} className="flex items-center justify-between">
                <Badge color="amber" size="xs">{o.type}</Badge>
                <span className="text-[10px] text-text-secondary">{o.count} ({o.pct}%)</span>
              </div>
            ))}
            {insights.offers.length === 0 && (
              <p className="text-[10px] text-text-secondary">No data</p>
            )}
          </div>
        </Card>
      </div>

      {/* Winning Ads */}
      {insights.winning_ads.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Trophy size={13} className="text-amber-500" />
            <span className="text-xs font-semibold text-text-primary">Winning Ads (longest-running)</span>
          </div>
          <div className="space-y-1.5">
            {insights.winning_ads.slice(0, 5).map((w, i) => (
              <div key={i} className="flex items-center gap-2 rounded bg-amber-50/50 px-3 py-1.5">
                <span className="text-xs font-bold text-amber-700">{w.days_running}d</span>
                {w.is_long_runner && <Badge color="purple" size="xs">90d+</Badge>}
                {w.hook_type && <Badge color="blue" size="xs">{w.hook_type}</Badge>}
                {w.angle && <Badge color="purple" size="xs">{w.angle}</Badge>}
                {w.offer_type && w.offer_type !== 'None' && <Badge color="amber" size="xs">{w.offer_type}</Badge>}
                <span className="ml-auto truncate text-[9px] text-text-secondary max-w-[120px]">
                  {w.ad_library_id}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
