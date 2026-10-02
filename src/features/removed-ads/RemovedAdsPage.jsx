import { useState, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Trash2, Search, X, ChevronLeft, ChevronRight, Eye, Calendar, TrendingDown, ExternalLink, Image, Play,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '../../components/ui/PageHeader'
import KPICard from '../../components/ui/KPICard'
import Badge from '../../components/ui/Badge'
import HookTypeBadge from '../../components/ui/HookTypeBadge'
import { getRemovedAdsStats, listRemovedAds } from '../../api/removedAds'
import { useCompetitors } from '../../hooks/queries/useCompetitors'
import { HOOK_TYPES, ANGLES, OFFER_TYPES } from '../../lib/constants'
import { cn } from '../../lib/utils'

const SORT_OPTIONS = [
  { value: '-removed_at', label: 'Most Recently Removed' },
  { value: '-days_running', label: 'Longest Running Before Removal' },
  { value: 'days_running', label: 'Shortest Running Before Removal' },
  { value: '-first_seen', label: 'Newest First Seen' },
]

function NativeSelect({ value, onChange, children, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-9 rounded-btn border border-border-default bg-white',
        'px-3 pr-7 text-sm shadow-sm appearance-none cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-gray-50',
        !value && 'text-text-tertiary', value && 'text-text-primary',
        'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748B\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")] bg-[right_0.5rem_center] bg-no-repeat'
      )}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  )
}

function RemovedAdCard({ ad }) {
  // Stored copy first (doesn't expire), then the Meta CDN link.
  const sources = [ad.screenshot_url, ad.media_url].filter(Boolean)
  const [srcIndex, setSrcIndex] = useState(0)
  const src = sources[srcIndex]

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-danger-200 bg-white text-[11px] shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-danger-100 bg-danger-50 px-3 py-1.5">
        <span className="rounded bg-danger-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Removed</span>
        <span className="text-[10px] text-danger-700">
          {ad.removed_at ? new Date(ad.removed_at).toLocaleDateString() : '—'}
        </span>
        <span className="ml-auto text-[10px] font-medium text-text-secondary">Ran {ad.days_running}d</span>
      </div>

      <div className="relative bg-gray-50">
        {src ? (
          <>
            <img
              src={src}
              alt=""
              loading="lazy"
              className="h-56 w-full object-contain grayscale-[30%]"
              onError={() => setSrcIndex((i) => i + 1)}
            />
            {ad.is_video && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50">
                  <Play size={18} className="text-white" fill="white" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-56 flex-col items-center justify-center gap-1 text-gray-400">
            <Image size={22} />
            <span className="text-[10px]">Image not saved — open on Meta</span>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-1 px-3 py-2">
        <p className="text-[10px] font-semibold text-text-secondary">{ad.competitor_name}</p>
        <p className="line-clamp-2 text-xs font-medium text-text-primary">{ad.headline || '—'}</p>
        {ad.primary_text && <p className="line-clamp-2 text-[10px] text-text-secondary">{ad.primary_text}</p>}
        <div className="flex flex-wrap gap-1 pt-1">
          {ad.hook_type && <HookTypeBadge type={ad.hook_type} />}
          {ad.angle && <Badge color="purple" size="xs">{ad.angle}</Badge>}
          {ad.offer_type && ad.offer_type !== 'None' && <Badge color="amber" size="xs">{ad.offer_type}</Badge>}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border-default px-3 py-1.5">
        <span className="truncate text-[9px] text-text-secondary">{ad.ad_library_id ? `ID: ${ad.ad_library_id}` : ''}</span>
        <div className="flex items-center gap-1">
          {ad.ad_url && (
            <a href={ad.ad_url} target="_blank" rel="noopener noreferrer" className="rounded p-1 text-text-secondary hover:text-blue-600" title="View on Meta">
              <ExternalLink size={12} />
            </a>
          )}
          <Link to={`/ads/${ad.id}`} className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-primary-600 hover:bg-primary-50">
            <Eye size={12} /> View
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function RemovedAdsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = {
    competitor: searchParams.get('competitor') || '',
    hook_type: searchParams.get('hook_type') || '',
    angle: searchParams.get('angle') || '',
    offer_type: searchParams.get('offer_type') || '',
    confidence: searchParams.get('confidence') || '',
    search: searchParams.get('search') || '',
    sort: searchParams.get('sort') || '-removed_at',
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
    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n }, { replace: true })
  }, [setSearchParams])

  const apiParams = useMemo(() => {
    const p = { page, per_page: 20, sort: filters.sort }
    if (filters.competitor) p.competitor = filters.competitor
    if (filters.hook_type) p.hook_type = filters.hook_type
    if (filters.angle) p.angle = filters.angle
    if (filters.offer_type) p.offer_type = filters.offer_type
    if (filters.confidence) p.confidence = filters.confidence
    if (filters.search) p.search = filters.search
    return p
  }, [filters, page])

  const { data: stats } = useQuery({ queryKey: ['removed-ads', 'stats'], queryFn: getRemovedAdsStats })
  const { data: adsData, isLoading } = useQuery({ queryKey: ['removed-ads', 'list', apiParams], queryFn: () => listRemovedAds(apiParams) })
  const { data: competitorsData } = useCompetitors()

  const ads = adsData?.data || []
  const meta = adsData?.meta || { total: 0, page: 1, per_page: 20, total_pages: 0 }
  const competitors = competitorsData || []
  const hasFilters = !!(filters.competitor || filters.hook_type || filters.angle || filters.offer_type || filters.confidence || filters.search)

  const [localSearch, setLocalSearch] = useState(filters.search)
  const handleSearch = (val) => {
    setLocalSearch(val)
    clearTimeout(window.__removedSearchTimer)
    window.__removedSearchTimer = setTimeout(() => setFilter('search', val), 300)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Removed Ads"
        subtitle="Ads competitors took down — intelligence about what didn't work"
        rightSlot={
          <span className="text-xs text-text-secondary">
            {meta.total} removed ads total
          </span>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard title="Total Removed" value={stats?.total_removed || 0} icon={Trash2} iconBg="bg-red-50" iconColor="text-red-600" />
        <KPICard title="Removed (7d)" value={stats?.removed_7d || 0} icon={Calendar} iconBg="bg-orange-50" iconColor="text-orange-600" />
        <KPICard title="Removed (30d)" value={stats?.removed_30d || 0} icon={Calendar} iconBg="bg-amber-50" iconColor="text-amber-600" />
        <KPICard title="Avg Days Before Removal" value={`${stats?.avg_days_before_removal || 0}d`} icon={TrendingDown} iconBg="bg-purple-50" iconColor="text-purple-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-card border border-border-default bg-white px-4 py-3 shadow-card">
        <div className="relative min-w-[200px] flex-1 sm:flex-none sm:w-56">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input type="text" value={localSearch} onChange={(e) => handleSearch(e.target.value)} placeholder="Search removed ads…" className="h-9 w-full rounded-btn border border-border-default bg-white pl-8 pr-3 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500" />
          {localSearch && <button onClick={() => handleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"><X size={12} /></button>}
        </div>

        <div className="h-4 w-px bg-border-default" />

        <NativeSelect value={filters.competitor} onChange={(v) => setFilter('competitor', v)} placeholder="Competitor">
          {competitors.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </NativeSelect>

        <NativeSelect value={filters.hook_type} onChange={(v) => setFilter('hook_type', v)} placeholder="Hook Type">
          {HOOK_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
        </NativeSelect>

        <NativeSelect value={filters.angle} onChange={(v) => setFilter('angle', v)} placeholder="Angle">
          {ANGLES.map((a) => <option key={a} value={a}>{a}</option>)}
        </NativeSelect>

        <NativeSelect value={filters.offer_type} onChange={(v) => setFilter('offer_type', v)} placeholder="Offer Type">
          {OFFER_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
        </NativeSelect>

        <NativeSelect value={filters.sort} onChange={(v) => setFilter('sort', v)} placeholder="Sort">
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </NativeSelect>

        {hasFilters && (
          <button onClick={clearFilters} className="ml-auto text-xs font-medium text-primary-600 hover:underline">Clear filters</button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-card border border-border-default bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-border-default px-5 py-3.5">
          <h3 className="text-sm font-semibold text-text-primary">Removed Ads</h3>
          <span className="text-xs text-text-tertiary">
            {ads.length > 0 ? `${(meta.page - 1) * meta.per_page + 1}–${Math.min(meta.page * meta.per_page, meta.total)} of ${meta.total}` : '0 results'}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded bg-gray-50" />)}</div>
        ) : ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Trash2 className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-text-secondary">{hasFilters ? 'No removed ads match filters' : 'No removed ads yet'}</p>
            {hasFilters && <button onClick={clearFilters} className="mt-2 text-xs text-primary-600 hover:underline">Clear filters</button>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ads.map((ad) => <RemovedAdCard key={ad.id} ad={ad} />)}
            </div>

            {/* Pagination */}
            {meta.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-border-default px-5 py-3">
                <span className="text-xs text-text-secondary">Page {meta.page} of {meta.total_pages}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded p-1.5 text-text-secondary hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={14} /></button>
                  <button onClick={() => setPage(Math.min(meta.total_pages, page + 1))} disabled={page >= meta.total_pages} className="rounded p-1.5 text-text-secondary hover:bg-gray-100 disabled:opacity-40"><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
