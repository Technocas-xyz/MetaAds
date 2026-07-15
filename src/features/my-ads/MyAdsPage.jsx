import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Play, Brain, Loader2, BarChart3, Zap, Clock, Calendar, TrendingUp,
  Search, X, Eye, Sparkles, Settings2, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import PageHeader from '../../components/ui/PageHeader'
import KPICard from '../../components/ui/KPICard'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import HookTypeBadge from '../../components/ui/HookTypeBadge'
import ProgressBar from '../../components/ui/ProgressBar'
import {
  getMyBrand, setMyBrand, triggerMyBrandScrape, getMyBrandScrapeStatus,
  getMyAds, getMyAdsStats, triggerMyBrandAnalyze, getMyBrandAnalyzeStatus,
  getAdSuggestion, getOverallRecommendation,
} from '../../api/myAds'
import { cn } from '../../lib/utils'

const FILTERS = [
  { key: 'all', label: 'All Ads' },
  { key: 'active', label: 'Active' },
  { key: 'new_7d', label: 'New (7d)' },
  { key: 'long_running', label: 'Long-Running (3mo+)' },
]

export default function MyAdsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [showSetup, setShowSetup] = useState(false)
  const [setupForm, setSetupForm] = useState({ name: 'Decoinks', page_id: '', query: '', meta_ad_library_url: '' })

  // Scrape + analyze state
  const [scrapeRunning, setScrapeRunning] = useState(false)
  const [analyzeRunning, setAnalyzeRunning] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(null)
  const [suggestion, setSuggestion] = useState(null)
  const [suggestingAdId, setSuggestingAdId] = useState(null)

  // Data
  const { data: brand, isLoading: brandLoading, refetch: refetchBrand } = useQuery({
    queryKey: ['my-ads', 'brand'],
    queryFn: getMyBrand,
  })
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['my-ads', 'stats'],
    queryFn: getMyAdsStats,
    enabled: !!brand?.configured,
  })
  const { data: adsData, isLoading: adsLoading, refetch: refetchAds } = useQuery({
    queryKey: ['my-ads', 'ads', filter, page],
    queryFn: () => getMyAds({ page, per_page: 20, filter }),
    enabled: !!brand?.configured,
  })
  const { data: recommendation } = useQuery({
    queryKey: ['my-ads', 'recommendation'],
    queryFn: getOverallRecommendation,
    enabled: !!brand?.configured,
  })

  const ads = adsData?.data || []
  const totalPages = adsData?.total_pages || 0

  // Poll analyze status on mount
  useEffect(() => {
    if (!brand?.configured) return
    let interval
    const check = async () => {
      try {
        const s = await getMyBrandAnalyzeStatus()
        if (s.running) {
          setAnalyzeRunning(true)
          setAnalyzeProgress(s.progress)
          interval = setInterval(async () => {
            const st = await getMyBrandAnalyzeStatus()
            setAnalyzeProgress(st.progress)
            if (!st.running) {
              setAnalyzeRunning(false)
              clearInterval(interval)
              refetchAds()
              refetchStats()
              toast.success(`Analyzed ${st.progress.completed} ads`)
            }
          }, 3000)
        }
      } catch {}
    }
    check()
    return () => { if (interval) clearInterval(interval) }
  }, [brand?.configured]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScrape = async () => {
    try {
      await triggerMyBrandScrape()
      setScrapeRunning(true)
      toast.success('Scrape started')
      const interval = setInterval(async () => {
        const s = await getMyBrandScrapeStatus()
        if (s.status === 'completed') {
          clearInterval(interval)
          setScrapeRunning(false)
          toast.success(`Scraped ${s.ads_found} ads (${s.new_ads} new)`)
          refetchAds()
          refetchStats()
          refetchBrand()
        } else if (s.status === 'failed') {
          clearInterval(interval)
          setScrapeRunning(false)
          toast.error('Scrape failed')
        }
      }, 5000)
    } catch { toast.error('Failed to start scrape') }
  }

  const handleAnalyze = async () => {
    try {
      const res = await triggerMyBrandAnalyze()
      if (res.status === 'already_running') { toast('Already running', { icon: '⏳' }); return }
      setAnalyzeRunning(true)
      setAnalyzeProgress({ total: 0, completed: 0, failed: 0 })
      toast.success('Analysis started')
      const interval = setInterval(async () => {
        const st = await getMyBrandAnalyzeStatus()
        setAnalyzeProgress(st.progress)
        if (!st.running) {
          setAnalyzeRunning(false)
          clearInterval(interval)
          refetchAds()
          refetchStats()
          toast.success(`Analyzed ${st.progress.completed} ads`)
        }
      }, 3000)
    } catch { toast.error('Failed to start analysis') }
  }

  const handleSetup = async () => {
    try {
      // Parse page_id from URL if provided
      let pageId = setupForm.page_id
      let metaUrl = setupForm.meta_ad_library_url
      if (metaUrl && !pageId) {
        const m = metaUrl.match(/view_all_page_id=(\d+)/)
        if (m) pageId = m[1]
      }
      await setMyBrand({
        name: setupForm.name,
        page_id: pageId || null,
        query: setupForm.query || null,
        query_type: pageId ? 'page_id' : 'keyword',
        meta_ad_library_url: metaUrl,
      })
      toast.success('Brand configured')
      setShowSetup(false)
      refetchBrand()
    } catch { toast.error('Failed to save') }
  }

  const handleSuggest = async (adId) => {
    setSuggestingAdId(adId)
    setSuggestion(null)
    try {
      const res = await getAdSuggestion(adId)
      setSuggestion(res)
    } catch { toast.error('Failed to get suggestions') }
    setSuggestingAdId(null)
  }

  if (brandLoading) {
    return <div className="space-y-6"><div className="h-8 w-48 animate-pulse rounded bg-gray-200" /></div>
  }

  // Not configured — show setup
  if (!brand?.configured || showSetup) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Ads" subtitle="Set up your brand to start tracking your own ads" />
        <div className="mx-auto max-w-lg rounded-card border border-border-default bg-white p-6 shadow-card">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Set Your Brand</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-text-secondary">Brand Name</label>
              <input value={setupForm.name} onChange={(e) => setSetupForm(f => ({ ...f, name: e.target.value }))} className="mt-1 w-full rounded-btn border border-border-default px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Meta Ad Library URL</label>
              <input value={setupForm.meta_ad_library_url} onChange={(e) => setSetupForm(f => ({ ...f, meta_ad_library_url: e.target.value }))} placeholder="https://www.facebook.com/ads/library/?...view_all_page_id=..." className="mt-1 w-full rounded-btn border border-border-default px-3 py-2 text-sm" />
              <p className="mt-1 text-[10px] text-text-tertiary">Paste your brand's Meta Ad Library URL — the page_id will be extracted automatically.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Page ID (optional, auto-extracted from URL)</label>
              <input value={setupForm.page_id} onChange={(e) => setSetupForm(f => ({ ...f, page_id: e.target.value }))} placeholder="e.g. 123456789" className="mt-1 w-full rounded-btn border border-border-default px-3 py-2 text-sm" />
            </div>
            <Button variant="primary" size="md" onClick={handleSetup} className="w-full">Save Brand</Button>
            {brand?.configured && <button onClick={() => setShowSetup(false)} className="w-full text-center text-xs text-text-secondary hover:underline">Cancel</button>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="My Ads"
        subtitle={`${brand.name} — tracking your brand's ad performance`}
        rightSlot={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSetup(true)} className="rounded-lg p-2 text-text-secondary hover:bg-gray-100" title="Edit brand settings">
              <Settings2 size={16} />
            </button>
            <Button variant="outline" size="md" icon={analyzeRunning ? Loader2 : Brain} onClick={handleAnalyze} disabled={analyzeRunning} className={analyzeRunning ? '[&_svg]:animate-spin' : ''}>
              {analyzeRunning ? 'Analyzing...' : 'Analyze'}
            </Button>
            <Button variant="primary" size="md" icon={scrapeRunning ? Loader2 : Play} onClick={handleScrape} disabled={scrapeRunning} className={scrapeRunning ? '[&_svg]:animate-spin' : ''}>
              {scrapeRunning ? 'Scraping...' : 'Run Now'}
            </Button>
          </div>
        }
      />

      {/* Analysis progress */}
      {analyzeRunning && analyzeProgress && analyzeProgress.total > 0 && (
        <div className="rounded-card border border-primary-200 bg-primary-50/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={14} className="animate-spin text-primary-600" />
            <span className="text-xs font-semibold text-primary-700">Analyzing your ads...</span>
          </div>
          <ProgressBar total={analyzeProgress.total} completed={analyzeProgress.completed} failed={analyzeProgress.failed} />
        </div>
      )}

      {/* Overall recommendation */}
      {recommendation?.has_data && (
        <div className="rounded-card border border-primary-200 bg-primary-50/20 p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-primary-600" />
            <h3 className="text-sm font-semibold text-primary-700">What Ad Should We Make?</h3>
          </div>
          <p className="text-xs text-text-primary leading-relaxed mb-3">{recommendation.summary}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-[10px]">
            <div className="rounded-lg bg-white p-2 border border-border-default">
              <p className="text-text-tertiary">Hook</p>
              <p className="font-semibold text-text-primary">{recommendation.recommended_hook_type}</p>
            </div>
            <div className="rounded-lg bg-white p-2 border border-border-default">
              <p className="text-text-tertiary">Angle</p>
              <p className="font-semibold text-text-primary">{recommendation.recommended_angle}</p>
            </div>
            <div className="rounded-lg bg-white p-2 border border-border-default">
              <p className="text-text-tertiary">Offer</p>
              <p className="font-semibold text-text-primary">{recommendation.recommended_offer}</p>
            </div>
            <div className="rounded-lg bg-white p-2 border border-border-default">
              <p className="text-text-tertiary">Format</p>
              <p className="font-semibold text-text-primary">{recommendation.recommended_format}</p>
            </div>
          </div>
          {recommendation.example_hooks?.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-text-secondary mb-1">Example Hooks:</p>
              <ul className="space-y-1">
                {recommendation.example_hooks.map((h, i) => (
                  <li key={i} className="text-xs text-text-primary italic">"{h}"</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KPICard title="Total Ads" value={stats?.total_ads || 0} icon={BarChart3} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <KPICard title="New (7d)" value={stats?.new_7d || 0} icon={Zap} iconBg="bg-green-50" iconColor="text-green-600" />
        <KPICard title="Long-Running (3mo+)" value={stats?.long_running || 0} icon={Clock} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <KPICard title="Oldest Ad" value={`${stats?.oldest_days || 0}d`} icon={Calendar} iconBg="bg-amber-50" iconColor="text-amber-600" />
        <KPICard title="Avg Duration" value={`${stats?.avg_duration || 0}d`} icon={TrendingUp} iconBg="bg-teal-50" iconColor="text-teal-600" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border-default p-1 w-fit">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => { setFilter(f.key); setPage(1) }} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${filter === f.key ? 'bg-primary-600 text-white' : 'text-text-secondary hover:bg-gray-100'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Ads grid */}
      {adsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-card bg-gray-50 border border-border-default" />)}
        </div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-border-default bg-white py-16">
          <BarChart3 className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-text-secondary">No ads yet</p>
          <p className="mt-1 text-xs text-text-tertiary">Click "Run Now" to scrape your brand's ads</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ads.map((ad) => (
              <div key={ad.id} className="rounded-card border border-border-default bg-white p-4 shadow-card space-y-3">
                {/* Image + headline */}
                <div className="flex gap-3">
                  {(ad.screenshot_url || ad.media_url) ? (
                    <img src={ad.screenshot_url || ad.media_url} alt="" className="h-16 w-16 rounded object-cover border border-border-default flex-shrink-0" onError={(e) => { e.target.style.display = 'none' }} />
                  ) : (
                    <div className="h-16 w-16 rounded bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-text-primary truncate">{ad.headline || ad.hook || '—'}</p>
                    <p className="text-[10px] text-text-secondary line-clamp-2 mt-0.5">{ad.primary_text?.slice(0, 100) || '—'}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {ad.hook_type && <HookTypeBadge type={ad.hook_type} />}
                      {ad.angle && <Badge color="purple" size="xs">{ad.angle}</Badge>}
                      {ad.offer_type && ad.offer_type !== 'None' && <Badge color="amber" size="xs">{ad.offer_type}</Badge>}
                    </div>
                  </div>
                </div>
                {/* Meta row */}
                <div className="flex items-center justify-between text-[10px] text-text-secondary">
                  <span>{ad.days_running}d running</span>
                  {ad.confidence_score && <span className={cn('font-medium', ad.confidence_score >= 70 ? 'text-green-600' : ad.confidence_score >= 40 ? 'text-amber-600' : 'text-red-600')}>{Math.round(ad.confidence_score)}% conf</span>}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 border-t border-border-default pt-2">
                  <button onClick={() => handleSuggest(ad.id)} disabled={suggestingAdId === ad.id} className="inline-flex items-center gap-1 text-[10px] font-medium text-primary-600 hover:underline disabled:opacity-50">
                    {suggestingAdId === ad.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    Improve
                  </button>
                  <Link to={`/ads/${ad.id}`} className="inline-flex items-center gap-1 text-[10px] font-medium text-text-secondary hover:text-text-primary">
                    <Eye size={10} /> View
                  </Link>
                  {ad.ad_url && (
                    <a href={ad.ad_url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-primary">
                      <ExternalLink size={10} /> Meta
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium disabled:opacity-40">Previous</button>
              <span className="text-xs text-text-secondary">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}

      {/* Suggestion panel (modal-like) */}
      {suggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSuggestion(null)}>
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-xl overflow-y-auto max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Sparkles size={14} className="text-primary-600" /> Improvement Suggestions
              </h3>
              <button onClick={() => setSuggestion(null)} className="rounded p-1 text-text-tertiary hover:text-text-primary"><X size={16} /></button>
            </div>

            {suggestion.suggestion?.summary && (
              <p className="text-xs text-text-primary leading-relaxed mb-4">{suggestion.suggestion.summary}</p>
            )}

            {suggestion.suggestion?.gaps?.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-text-secondary uppercase mb-1">Gaps vs Competitors</p>
                <ul className="space-y-1">
                  {suggestion.suggestion.gaps.map((g, i) => (
                    <li key={i} className="text-xs text-text-primary flex gap-1.5">
                      <span className="text-danger-500 mt-0.5">•</span> {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {suggestion.suggestion?.weaknesses?.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-text-secondary uppercase mb-1">Weaknesses</p>
                <ul className="space-y-1">
                  {suggestion.suggestion.weaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-text-primary flex gap-1.5">
                      <span className="text-warning-500 mt-0.5">•</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {suggestion.suggestion?.suggested_hooks?.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-text-secondary uppercase mb-1">Try These Hooks</p>
                <ul className="space-y-1">
                  {suggestion.suggestion.suggested_hooks.map((h, i) => (
                    <li key={i} className="text-xs text-text-primary italic">"{h}"</li>
                  ))}
                </ul>
              </div>
            )}

            {(suggestion.suggestion?.recommended_angle || suggestion.suggestion?.recommended_offer) && (
              <div className="flex gap-2 flex-wrap mt-3">
                {suggestion.suggestion.recommended_angle && <Badge color="purple" size="xs">Angle: {suggestion.suggestion.recommended_angle}</Badge>}
                {suggestion.suggestion.recommended_offer && <Badge color="amber" size="xs">Offer: {suggestion.suggestion.recommended_offer}</Badge>}
                {suggestion.suggestion.format_note && <span className="text-[10px] text-text-secondary">{suggestion.suggestion.format_note}</span>}
              </div>
            )}

            <button onClick={() => handleSuggest(suggestion.ad_id)} className="mt-4 w-full rounded-btn border border-border-default px-3 py-2 text-xs font-medium hover:bg-gray-50">
              🔄 Re-generate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
