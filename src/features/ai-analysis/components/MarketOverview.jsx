import { useOverallInsights } from '../../../hooks/queries/useInsights'
import Badge from '../../../components/ui/Badge'
import Card from '../../../components/ui/Card'
import { TrendingUp, Lightbulb, Target, Sparkles } from 'lucide-react'

export default function MarketOverview() {
  const { data: insights, isLoading } = useOverallInsights()

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-card bg-gray-50" />
  }

  if (!insights || insights.total_analyzed === 0) {
    return (
      <Card title="Market Overview" subtitle="Run 'Analyze All' to generate market insights">
        <p className="text-xs text-text-secondary">No analyzed ads yet.</p>
      </Card>
    )
  }

  const wp = insights.winning_patterns
  const rec = insights.recommendation

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Target size={18} className="text-primary-600" />
        <h2 className="text-base font-bold text-text-primary">Market Overview & Recommendation</h2>
        <span className="text-[10px] text-text-secondary">
          ({insights.total_analyzed} ads analyzed, {insights.winners_count} winners 30d+, {insights.long_runners_count} long-runners 90d+)
        </span>
      </div>

      {/* Recommendation */}
      {rec && (
        <Card padding="md" className="border-primary-200 bg-primary-50/30">
          <div className="flex gap-3">
            <Lightbulb size={18} className="mt-0.5 flex-shrink-0 text-primary-600" />
            <div>
              <p className="text-xs font-semibold text-primary-700 mb-1">What We Should Do</p>
              <p className="text-xs text-text-primary leading-relaxed">{rec}</p>
              {insights.example_hooks?.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold text-text-secondary mb-1">Example Hook Lines:</p>
                  <ul className="space-y-1">
                    {insights.example_hooks.map((h, i) => (
                      <li key={i} className="text-xs text-text-primary flex gap-1.5">
                        <Sparkles size={10} className="mt-0.5 flex-shrink-0 text-amber-500" />
                        <span className="italic">"{h}"</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Winning patterns */}
      {wp && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Card padding="sm" title="Winning Hooks" subtitle="Weighted by days running">
            <div className="space-y-1">
              {wp.hooks.slice(0, 4).map((h) => (
                <div key={h.type} className="flex items-center justify-between">
                  <Badge color="blue" size="xs">{h.type}</Badge>
                  <span className="text-[9px] text-text-secondary">{h.weighted_score}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card padding="sm" title="Winning Angles" subtitle="Weighted by days running">
            <div className="space-y-1">
              {wp.angles.slice(0, 4).map((a) => (
                <div key={a.type} className="flex items-center justify-between">
                  <Badge color="purple" size="xs">{a.type}</Badge>
                  <span className="text-[9px] text-text-secondary">{a.weighted_score}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card padding="sm" title="Winning Offers" subtitle="Weighted by days running">
            <div className="space-y-1">
              {wp.offers.slice(0, 4).map((o) => (
                <div key={o.type} className="flex items-center justify-between">
                  <Badge color="amber" size="xs">{o.type}</Badge>
                  <span className="text-[9px] text-text-secondary">{o.weighted_score}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card padding="sm" title="Format Split" subtitle="Among winners">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-primary">Video</span>
                <span className="text-[10px] font-medium">{wp.format_split.video}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-primary">Image</span>
                <span className="text-[10px] font-medium">{wp.format_split.image}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Competitor Comparison */}
      {insights.competitor_comparison?.length > 0 && (
        <Card title="Competitor Landscape" subtitle="Sorted by long-running ads (proven winners)">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b text-left text-text-secondary">
                  <th className="pb-2 pr-3 font-medium">Competitor</th>
                  <th className="pb-2 pr-3 font-medium">Analyzed</th>
                  <th className="pb-2 pr-3 font-medium">90d+ Winners</th>
                  <th className="pb-2 pr-3 font-medium">Longest</th>
                  <th className="pb-2 pr-3 font-medium">Primary Angle</th>
                  <th className="pb-2 font-medium">Format</th>
                </tr>
              </thead>
              <tbody>
                {insights.competitor_comparison.slice(0, 15).map((c) => (
                  <tr key={c.name} className="border-b border-border-default/50">
                    <td className="py-1.5 pr-3 font-medium text-text-primary">{c.name}</td>
                    <td className="py-1.5 pr-3">{c.analyzed_ads}</td>
                    <td className="py-1.5 pr-3">
                      {c.long_runners > 0 ? (
                        <Badge color="purple" size="xs">{c.long_runners}</Badge>
                      ) : '—'}
                    </td>
                    <td className="py-1.5 pr-3">{c.longest_day > 0 ? `${c.longest_day}d` : '—'}</td>
                    <td className="py-1.5 pr-3">
                      {c.primary_angle ? <Badge color="purple" size="xs">{c.primary_angle}</Badge> : '—'}
                    </td>
                    <td className="py-1.5">{c.format}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
