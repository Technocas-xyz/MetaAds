import { useMemo } from 'react'
import Badge from '../../../components/ui/Badge'
import Card from '../../../components/ui/Card'

export default function AIPatternsPanel({ ads = [] }) {
  const patterns = useMemo(() => {
    const hookCounts = {}
    const angleCounts = {}
    const offerCounts = {}

    for (const ad of ads) {
      if (ad.hook_type) hookCounts[ad.hook_type] = (hookCounts[ad.hook_type] || 0) + 1
      if (ad.angle) angleCounts[ad.angle] = (angleCounts[ad.angle] || 0) + 1
      if (ad.offer) offerCounts[ad.offer] = (offerCounts[ad.offer] || 0) + 1
    }

    const sortDesc = (obj) =>
      Object.entries(obj)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)

    return {
      hooks: sortDesc(hookCounts),
      angles: sortDesc(angleCounts),
      offers: sortDesc(offerCounts),
      analyzedCount: ads.filter((a) => a.hook || a.angle || a.offer).length,
    }
  }, [ads])

  if (patterns.analyzedCount === 0) {
    return (
      <Card padding="md">
        <p className="text-center text-xs text-text-secondary">
          No AI analysis data yet. Analyze some ads to see patterns.
        </p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Hooks */}
      <Card title="Top Hooks" subtitle={`${patterns.analyzedCount} ads analyzed`}>
        <div className="space-y-2">
          {patterns.hooks.length === 0 && (
            <p className="text-xs text-text-secondary">No data</p>
          )}
          {patterns.hooks.map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <Badge color="blue" size="sm">{type}</Badge>
              <span className="text-xs font-medium text-text-primary">{count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Angles */}
      <Card title="Top Angles" subtitle="Messaging angles">
        <div className="space-y-2">
          {patterns.angles.length === 0 && (
            <p className="text-xs text-text-secondary">No data</p>
          )}
          {patterns.angles.map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <Badge color="purple" size="sm">{type}</Badge>
              <span className="text-xs font-medium text-text-primary">{count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Offers */}
      <Card title="Top Offers" subtitle="Offer types detected">
        <div className="space-y-2">
          {patterns.offers.length === 0 && (
            <p className="text-xs text-text-secondary">No data</p>
          )}
          {patterns.offers.map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <Badge color="amber" size="sm">{type}</Badge>
              <span className="text-xs font-medium text-text-primary">{count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
