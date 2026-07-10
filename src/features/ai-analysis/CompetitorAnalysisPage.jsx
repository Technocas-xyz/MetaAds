import { useState, useCallback, useMemo } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Search, ChevronLeft, ChevronRight, Eye, Trophy, X,
} from 'lucide-react'
import Breadcrumb from '../../components/layout/Breadcrumb'
import PageHeader from '../../components/ui/PageHeader'
import Badge from '../../components/ui/Badge'
import HookTypeBadge from '../../components/ui/HookTypeBadge'
import ConfidenceBadge from '../../components/ui/ConfidenceBadge'
import { useCompetitorInsights, useCompetitorAnalyzedAds } from '../../hooks/queries/useInsights'
import { HOOK_TYPES, ANGLES, OFFER_TYPES } from '../../lib/constants'
import { cn } from '../../lib/utils'

const PER_PAGE = 20
const CONFIDENCE_OPTIONS = ['High', 'Medium', 'Low']

function NativeSelect({ value, onChange, children, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-9 rounded-btn border border-border-default bg-white',
        'px-3 pr-7 text-sm shadow-sm appearance-none cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-primary-500',
        'hover:bg-gray-50',
        !value && 'text-text-tertiary',
        value && 'text-text-primary',
        'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748B\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")] bg-[right_0.5rem_center] bg-no-repeat'
      )}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  )
}

export default function CompetitorAnalysisPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  // Filters from URL
  const filters = {
    hook_type: searchParams.get('hook_type') || '',
    angle: searchParams.get('angle') || '',
    offer_type: searchParams.get('offer_type') || '',
    confidence: searchParams.get('confidence') || '',
    winners_only: searchParams.get('winners_only') === 'true',
    search: searchParams.get('search') || '',
  }
  const page = Number(searchParams.get('page') || 1)

  const setFilter = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const setPage = useCallback((p) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(p))
      return next
    }, { replace: true })
  }, [setSearchParams])

  // API params for the ads query
  const apiParams = useMemo(() => {
    const p = { page, per_page: PER_PAGE }
    if (filters.hook_type) p.hook_type = filters.hook_type
    if (filters.angle) p.angle = filters.angle
    if (filters.offer_type) p.offer_type = filters.offer_type
    if (filters.confidence) p.confidence = filters.confidence
    if (filters.winners_only) p.winners_only = true
    if (filters.search) p.search = filters.search
    return p
  }, [filters, page])

  // Data
  const { data: insights, isLoading: insightsLoading } = useCompetitorInsights(id)
  const { data: adsData, isLoading: adsLoading } = useCompetitorAnalyzedAds(id, apiParams)

  const ads = adsData?.data || []
  const meta = adsData?.meta || { total: 0, page: 1, per_page: PER_PAGE, total_pages: 0 }
  const hasFilters = !!(filters.hook_type || filters.angle || filters.offer_type || filters.confidence || filters.winners_only || filters.search)

  // Local search state for debounce
  const [localSearch, setLocalSearch] = useState(filters.search)

  // Debounce search
  const handleSearch = (val) => {
    setLocalSearch(val)
    // Simple debounce via setTimeout
    clearTimeout(window.__compAnalysisSearchTimer)
    window.__compAnalysisSearchTimer = setTimeout(() => {
      setFilter('search', val)
    }, 300)
  }

  if (insightsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-40 animate-pulse rounded-card bg-gray-100" />
        <div className="h-96 animate-pulse rounded-card bg-gray-100" />
      </div>
    )
  }

  const compName = insights?.competitor_name || 'Competitor'
  const analyzedCount = insights?.analyzed_count || 0

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'AI Analysis', to: '/ai-analysis' },
          { label: compName },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/ai-analysis"
          className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 transition"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{compName}</h1>
          <p className="text-sm text-text-secondary">
            {analyzedCount} analyzed ads{insights?.total_ads ? ` out of ${insights.total_ads} total` : ''}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      {analyzedCount > 0 && insights && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Hook breakdown */}
          <div className="rounded-card border border-border-default bg-white p-4 shadow-card">
            <h3 className="text-xs font-semibold text-text-secondary mb-2">Top Hooks</h3>
            <div className="space-y-1">
              {insights.hooks?.slice(0, 4).map((h) => (
                <div key={h.type} className="flex items-center justify-between">
                  <Badge color="blue" size="xs">{h.type}</Badge>
                  <span className="text-[10px] text-text-secondary">{h.pct}% ({h.count})</span>
                </div>
              ))}
            </div>
          </div>
          {/* Angle breakdown */}
          <div className="rounded-card border border-border-default bg-white p-4 shadow-card">
            <h3 className="text-xs font-semibold text-text-secondary mb-2">Top Angles</h3>
            <div className="space-y-1">
              {insights.angles?.slice(0, 4).map((a) => (
                <div key={a.type} className="flex items-center justify-between">
                  <Badge color="purple" size="xs">{a.type}</Badge>
                  <span className="text-[10px] text-text-secondary">{a.pct}% ({a.count})</span>
                </div>
              ))}
            </div>
          </div>
          {/* Offer breakdown */}
          <div className="rounded-card border border-border-default bg-white p-4 shadow-card">
            <h3 className="text-xs font-semibold text-text-secondary mb-2">Top Offers</h3>
            <div className="space-y-1">
              {insights.offers?.slice(0, 4).map((o) => (
                <div key={o.type} className="flex items-center justify-between">
                  <Badge color="amber" size="xs">{o.type}</Badge>
                  <span className="text-[10px] text-text-secondary">{o.pct}% ({o.count})</span>
                </div>
              ))}
            </div>
          </div>
          {/* Winning ads */}
          <div className="rounded-card border border-border-default bg-white p-4 shadow-card">
            <h3 className="text-xs font-semibold text-text-secondary mb-2">Long-Running Ads</h3>
            <div className="space-y-1">
              {insights.winning_ads?.slice(0, 3).map((w, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[10px] text-text-primary truncate max-w-[120px]">
                    {w.hook_text || w.hook_type || 'Ad'}
                  </span>
                  <span className="text-[10px] text-text-secondary flex items-center gap-0.5">
                    <Trophy size={9} className="text-amber-500" />
                    {w.days_running}d
                  </span>
                </div>
              ))}
              {(!insights.winning_ads || insights.winning_ads.length === 0) && (
                <p className="text-[10px] text-text-tertiary italic">No long-running ads yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-card border border-border-default bg-white px-4 py-3 shadow-card">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 sm:flex-none sm:w-56">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search ads…"
            className="h-9 w-full rounded-btn border border-border-default bg-white pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-gray-50"
          />
          {localSearch && (
            <button onClick={() => handleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-tertiary hover:text-text-primary">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="h-4 w-px bg-border-default" aria-hidden="true" />

        <NativeSelect value={filters.hook_type} onChange={(v) => setFilter('hook_type', v)} placeholder="Hook Type">
          {HOOK_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
        </NativeSelect>

        <NativeSelect value={filters.angle} onChange={(v) => setFilter('angle', v)} placeholder="Angle">
          {ANGLES.map((a) => <option key={a} value={a}>{a}</option>)}
        </NativeSelect>

        <NativeSelect value={filters.offer_type} onChange={(v) => setFilter('offer_type', v)} placeholder="Offer Type">
          {OFFER_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
        </NativeSelect>

        <NativeSelect value={filters.confidence} onChange={(v) => setFilter('confidence', v)} placeholder="Confidence">
          {CONFIDENCE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </NativeSelect>

        {/* Winners only toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={filters.winners_only}
            onChange={(e) => setFilter('winners_only', e.target.checked ? 'true' : '')}
            className="rounded border-border-default"
          />
          Winners (90d+)
        </label>

        {hasFilters && (
          <button onClick={clearFilters} className="ml-auto text-xs font-medium text-primary-600 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {/* Ads grid/table */}
      <div className="rounded-card border border-border-default bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-border-default px-5 py-3.5">
          <h3 className="text-sm font-semibold text-text-primary">Analyzed Ads</h3>
          <span className="text-xs text-text-tertiary">
            Showing {ads.length > 0 ? ((meta.page - 1) * meta.per_page + 1) : 0}–{Math.min(meta.page * meta.per_page, meta.total)} of {meta.total}
          </span>
        </div>

        {adsLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-gray-50" />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-text-secondary">
              {analyzedCount === 0 ? 'No ads analyzed yet for this competitor.' : 'No ads match the current filters.'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-primary-600 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border-default bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Creative</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Headline / Text</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Hook</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Angle</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Offer</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary">Confidence</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary">Days Running</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {ads.map((ad) => (
                    <tr key={ad.id} className="transition-colors hover:bg-gray-50/60">
                      {/* Creative thumbnail */}
                      <td className="px-4 py-3">
                        {ad.media_url ? (
                          <img
                            src={ad.media_url}
                            alt=""
                            className="h-10 w-10 rounded object-cover border border-border-default"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-[8px] text-text-tertiary">
                            No img
                          </div>
                        )}
                      </td>
                      {/* Text */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs font-medium text-text-primary truncate">
                          {ad.headline || '—'}
                        </p>
                        <p className="text-[10px] text-text-secondary truncate mt-0.5">
                          {ad.primary_text?.slice(0, 80) || '—'}
                        </p>
                      </td>
                      {/* Hook */}
                      <td className="px-4 py-3">
                        {ad.hook_type && <HookTypeBadge type={ad.hook_type} />}
                        {ad.hook_text && (
                          <p className="text-[9px] text-text-tertiary mt-0.5 truncate max-w-[120px]">{ad.hook_text}</p>
                        )}
                      </td>
                      {/* Angle */}
                      <td className="px-4 py-3">
                        {ad.angle && <Badge color="purple" size="xs">{ad.angle}</Badge>}
                      </td>
                      {/* Offer */}
                      <td className="px-4 py-3">
                        {ad.offer_type && ad.offer_type !== 'None' && (
                          <Badge color="amber" size="xs">{ad.offer_type}</Badge>
                        )}
                        {ad.offer_value && ad.offer_value !== 'None' && (
                          <p className="text-[9px] text-text-tertiary mt-0.5">{ad.offer_value}</p>
                        )}
                      </td>
                      {/* Confidence */}
                      <td className="px-4 py-3 text-center">
                        <ConfidenceBadge score={ad.confidence_score} />
                      </td>
                      {/* Days Running */}
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'text-xs font-medium',
                          ad.days_running >= 90 ? 'text-success-700' : ad.days_running >= 30 ? 'text-warning-700' : 'text-text-primary'
                        )}>
                          {ad.days_running}d
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <Link
                          to={`/ads/${ad.id}`}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-primary-600 hover:bg-primary-50 transition"
                        >
                          <Eye size={12} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-border-default px-5 py-3">
                <span className="text-xs text-text-secondary">
                  Page {meta.page} of {meta.total_pages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="rounded p-1.5 text-text-secondary hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(meta.total_pages, page + 1))}
                    disabled={page >= meta.total_pages}
                    className="rounded p-1.5 text-text-secondary hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
