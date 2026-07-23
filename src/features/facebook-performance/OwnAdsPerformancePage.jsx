import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCcw, Download, Trophy, TrendingUp, MessageSquare, DollarSign, Loader2, Info, ChevronDown, ChevronRight } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import MetricCard, { formatCurrency, formatPercent, formatCount } from '../facebook-explorer/components/MetricCard'
import AdDetailTabs from '../facebook-explorer/components/AdDetailTabs'
import { getFbPerformanceReport } from '../../api/facebook'
import { cn } from '../../lib/utils'

const WINNER_LABELS = {
  best_overall: { label: 'Best Overall Messaging Ad', icon: Trophy, color: 'text-amber-600 bg-amber-50' },
  most_conversations: { label: 'Most Conversations', icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
  lowest_cost_per_convo: { label: 'Lowest Cost/Conversation', icon: DollarSign, color: 'text-green-600 bg-green-50' },
  best_ctr: { label: 'Best CTR', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
  best_conversation_quality: { label: 'Best Conversation Quality', icon: MessageSquare, color: 'text-teal-600 bg-teal-50' },
  best_low_budget: { label: 'Best Low-Budget Performer', icon: DollarSign, color: 'text-indigo-600 bg-indigo-50' },
}

export default function OwnAdsPerformancePage() {
  const [datePreset, setDatePreset] = useState('maximum')
  const [expandedAd, setExpandedAd] = useState(null)
  const [showMethodology, setShowMethodology] = useState(false)

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['fb-performance', datePreset],
    queryFn: () => getFbPerformanceReport({ date_preset: datePreset }),
    enabled: true,
  })

  const handleExportCSV = () => {
    if (!report?.ads) return
    const headers = ['Rank','Name','Campaign','Status','Spend','Impressions','Reach','Clicks','CTR','CPC','Conversations','Cost/Convo','First Replies','Score','Eligible']
    const rows = report.ads.map(a => [a.rank||'',a.name,a.campaign,a.status,a.spend,a.impressions,a.reach,a.clicks,a.ctr?.toFixed(2),a.cpc?.toFixed(2),a.conversations,a.cost_per_convo?.toFixed(2)||'',a.first_replies,a.score,a.eligible?'Yes':'No'])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'decoinks_performance.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
  if (report && !report.ok) return <div className="p-8 text-center text-red-600">{report.error}</div>
  if (!report) return null

  const { summary, winners, ads, methodology, competitor_patterns } = report

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Own Ads Performance"
        subtitle={`${report.account_id} • API ${report.api_version} • ${report.ads_total} ads • Period: ${report.reporting_period}`}
        rightSlot={
          <div className="flex items-center gap-2">
            <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className="h-9 rounded-btn border border-border-default bg-white px-3 text-sm">
              <option value="maximum">Lifetime</option>
              <option value="last_7d">Last 7 Days</option>
              <option value="last_14d">Last 14 Days</option>
              <option value="last_30d">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </select>
            <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>CSV</Button>
            <Button variant="outline" size="sm" icon={RefreshCcw} onClick={() => refetch()}>Refresh</Button>
            <button onClick={() => setShowMethodology(!showMethodology)} className="rounded p-2 text-text-tertiary hover:bg-gray-100"><Info size={16} /></button>
          </div>
        }
      />

      <p className="text-[10px] text-text-tertiary">Ads retrieved: {report.ads_total} | With insights: {report.ads_with_insights} | Without: {report.ads_without_insights} | Pages: {report.pages_fetched}</p>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Total Spend" value={summary.total_spend} format="currency" />
        <MetricCard label="Impressions" value={summary.total_impressions} format="count" />
        <MetricCard label="Reach" value={summary.total_reach} format="count" />
        <MetricCard label="Conversations" value={summary.total_conversations} format="count" />
        <MetricCard label="Cost/Conversation" value={summary.cost_per_conversation} format="currency" />
        <MetricCard label="Blended CTR" value={summary.blended_ctr} format="percent" />
        <MetricCard label="Blended CPC" value={summary.blended_cpc} format="currency" />
        <MetricCard label="First Replies" value={summary.total_first_replies} format="count" />
        <MetricCard label="Active" value={summary.active_ads} format="count" />
        <MetricCard label="Paused" value={summary.paused_ads} format="count" />
      </div>

      {/* Winner Cards */}
      {winners && Object.keys(winners).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Best Performers (selected period)</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(winners).map(([key, ad]) => {
              if (!ad) return null
              const meta = WINNER_LABELS[key] || { label: key, icon: Trophy, color: 'text-gray-600 bg-gray-50' }
              const Icon = meta.icon
              return (
                <div key={key} className="rounded-card border border-border-default bg-white p-4 shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn('rounded-lg p-1.5', meta.color)}><Icon size={14} /></div>
                    <span className="text-[10px] font-semibold text-text-secondary">{meta.label}</span>
                  </div>
                  <p className="text-sm font-medium text-text-primary truncate">{ad.name}</p>
                  <p className="text-[10px] text-text-tertiary">{ad.campaign}</p>
                  <div className="mt-2 flex gap-3 text-[10px]">
                    {ad.cost_per_convo > 0 && <span>Cost/Conv: {formatCurrency(ad.cost_per_convo)}</span>}
                    {ad.conversations > 0 && <span>Convos: {formatCount(ad.conversations)}</span>}
                    {ad.ctr > 0 && <span>CTR: {formatPercent(ad.ctr)}</span>}
                  </div>
                  <p className="mt-1 text-[9px] text-text-tertiary">Score: {ad.score}/100</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Methodology */}
      {showMethodology && methodology && (
        <div className="rounded-card border border-border-default bg-white p-4 shadow-card text-xs">
          <h3 className="font-semibold text-text-primary mb-2">Scoring Methodology</h3>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {Object.entries(methodology.scoring).map(([k, v]) => (
              <div key={k}><span className="text-text-tertiary">{k}:</span> <span>{v}</span></div>
            ))}
          </div>
          <div className="mt-3 border-t pt-2">
            <p className="font-semibold text-text-secondary">Eligibility:</p>
            <p className="text-[10px] text-text-tertiary">{methodology.eligibility.rule}: ≥{methodology.eligibility.min_impressions} impressions OR ≥${methodology.eligibility.min_spend} spend OR ≥{methodology.eligibility.min_conversations} conversations</p>
          </div>
        </div>
      )}

      {/* All Ads Table */}
      <div className="rounded-card border border-border-default bg-white shadow-card">
        <div className="border-b border-border-default px-5 py-3.5">
          <h3 className="text-sm font-semibold text-text-primary">All Ads Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-[11px]">
            <thead>
              <tr className="border-b bg-gray-50/50">
                {['#','Name','Campaign','Status','Spend','Imp','Reach','Clicks','CTR','CPC','Convos','Cost/Conv','Replies','Depth 3','Blocks','Score',''].map((h,i) => (
                  <th key={i} className="px-3 py-2.5 text-left font-medium text-text-secondary whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {ads?.map((ad) => (
                <tr key={ad.id} className={cn('hover:bg-gray-50/60', !ad.eligible && 'opacity-60')}>
                  <td className="px-3 py-2">{ad.rank || '—'}</td>
                  <td className="px-3 py-2 max-w-[150px] truncate font-medium">{ad.name}</td>
                  <td className="px-3 py-2 truncate max-w-[100px] text-text-secondary">{ad.campaign}</td>
                  <td className="px-3 py-2"><span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold', ad.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600')}>{ad.status}</span></td>
                  <td className="px-3 py-2">{formatCurrency(ad.spend)}</td>
                  <td className="px-3 py-2">{formatCount(ad.impressions)}</td>
                  <td className="px-3 py-2">{formatCount(ad.reach)}</td>
                  <td className="px-3 py-2">{formatCount(ad.clicks)}</td>
                  <td className="px-3 py-2">{formatPercent(ad.ctr)}</td>
                  <td className="px-3 py-2">{ad.cpc ? formatCurrency(ad.cpc) : '—'}</td>
                  <td className="px-3 py-2 font-medium">{formatCount(ad.conversations)}</td>
                  <td className="px-3 py-2">{ad.cost_per_convo ? formatCurrency(ad.cost_per_convo) : '—'}</td>
                  <td className="px-3 py-2">{formatCount(ad.first_replies)}</td>
                  <td className="px-3 py-2">{formatCount(ad.depth3)}</td>
                  <td className="px-3 py-2">{formatCount(ad.blocks)}</td>
                  <td className="px-3 py-2 font-semibold">{ad.score >= 0 ? ad.score : '—'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setExpandedAd(expandedAd === ad.id ? null : ad.id)} className="text-text-tertiary hover:text-text-primary">
                      {expandedAd === ad.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Competitor Comparison */}
      {competitor_patterns?.has_data && (
        <div className="rounded-card border border-border-default bg-white p-5 shadow-card">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Competitor Creative Patterns (for strategy comparison)</h3>
          <p className="text-[10px] text-text-tertiary mb-3">Based on {competitor_patterns.winners_analyzed} competitor ads running 30+ days. Weighted by longevity. No competitor CTR/CPC/spend available.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
            <div>
              <p className="text-text-tertiary font-medium">Top Hooks</p>
              {competitor_patterns.top_hooks?.slice(0, 3).map((h) => <p key={h.type} className="font-medium">{h.type} ({h.score})</p>)}
            </div>
            <div>
              <p className="text-text-tertiary font-medium">Top Angles</p>
              {competitor_patterns.top_angles?.slice(0, 3).map((a) => <p key={a.type} className="font-medium">{a.type} ({a.score})</p>)}
            </div>
            <div>
              <p className="text-text-tertiary font-medium">Top Offers</p>
              {competitor_patterns.top_offers?.slice(0, 3).map((o) => <p key={o.type} className="font-medium">{o.type} ({o.score})</p>)}
            </div>
            <div>
              <p className="text-text-tertiary font-medium">Dominant Format</p>
              <p className="font-medium">{competitor_patterns.dominant_format}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
