import { useNavigate } from 'react-router-dom'
import { useAllCompetitorInsights } from '../../../hooks/queries/useInsights'
import Badge from '../../../components/ui/Badge'
import { Users2, Trophy } from 'lucide-react'

export default function CompetitorBreakdown() {
  const { data: competitors, isLoading } = useAllCompetitorInsights()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-50" />
        ))}
      </div>
    )
  }

  if (!competitors || competitors.length === 0) {
    return <p className="text-xs text-text-secondary">No competitor data available.</p>
  }

  // Sort by analyzed count desc
  const sorted = [...competitors].sort((a, b) => b.analyzed - a.analyzed)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users2 size={16} className="text-primary-600" />
        <h2 className="text-base font-bold text-text-primary">Per-Competitor Analysis</h2>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((c) => {
          const isClickable = c.analyzed > 0

          return (
            <div
              key={c.competitor_id}
              onClick={isClickable ? () => navigate(`/ai-analysis/competitors/${c.competitor_id}`) : undefined}
              className={`rounded-lg border border-border-default bg-white p-3 text-[11px] transition hover:shadow-sm ${
                isClickable ? 'cursor-pointer hover:border-primary-300 hover:shadow-md' : ''
              }`}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/ai-analysis/competitors/${c.competitor_id}`) } : undefined}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-primary truncate">{c.name}</span>
                <span className="text-[9px] text-text-secondary">
                  {c.analyzed}/{c.total_ads} analyzed
                </span>
              </div>

              {c.analyzed === 0 ? (
                <p className="text-[10px] text-text-secondary italic">Pending analysis...</p>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {c.top_hook && <Badge color="blue" size="xs">Hook: {c.top_hook}</Badge>}
                    {c.top_angle && <Badge color="purple" size="xs">Angle: {c.top_angle}</Badge>}
                    {c.top_offer && c.top_offer !== 'None' && (
                      <Badge color="amber" size="xs">Offer: {c.top_offer}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                    {c.longest_running_days > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Trophy size={9} className="text-amber-500" />
                        Longest: {c.longest_running_days}d
                      </span>
                    )}
                    {c.long_runners_count > 0 && (
                      <Badge color="purple" size="xs">{c.long_runners_count} winners (90d+)</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
