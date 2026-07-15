import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  Play,
  Clock,
  TrendingUp,
  Zap,
  Calendar,
  BarChart3,
  Filter,
  Trash2,
  Brain,
  Loader2,
} from 'lucide-react'
import KPICard from '../../components/ui/KPICard'
import Button from '../../components/ui/Button'
import ProgressBar from '../../components/ui/ProgressBar'
import { useScraperCompetitor, useCompetitorAds, useTriggerScrape, useAnalyzeAd, useDeleteCompetitor } from '../../hooks/queries/useScraper'
import { triggerCompetitorAnalyze, getCompetitorAnalyzeStatus } from '../../api/scraper'
import toast from 'react-hot-toast'
import AdCard from './components/AdCard'
import AIPatternsPanel from './components/AIPatternsPanel'
import CompetitorInsightsPanel from './components/CompetitorInsightsPanel'


const FILTERS = [
  { key: 'all', label: 'All Ads' },
  { key: 'active', label: 'Active' },
  { key: 'new_7d', label: 'New (7d)' },
  { key: 'long_running', label: 'Long-Running (3mo+)' },
]

export default function ScraperCompetitorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [showPatterns, setShowPatterns] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const perPage = 20

  // Analysis state
  const [analyzeRunning, setAnalyzeRunning] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(null)

  const { data: competitor, isLoading: compLoading, isError, refetch: refetchComp } = useScraperCompetitor(id)
  const { data: adsResponse, isLoading: adsLoading, refetch: refetchAds } = useCompetitorAds(id, {
    page,
    per_page: perPage,
    filter,
  })
  const triggerMutation = useTriggerScrape()
  const analyzeMutation = useAnalyzeAd()
  const deleteMutation = useDeleteCompetitor()

  const ads = adsResponse?.data || []
  const totalAds = adsResponse?.total || 0
  const totalPages = adsResponse?.total_pages || 0

  // Poll analyze status on mount (resume if job was running)
  const pollAnalyzeStatus = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        const status = await getCompetitorAnalyzeStatus(id)
        if (status.running) {
          setAnalyzeRunning(true)
          setAnalyzeProgress(status.progress)
        } else {
          setAnalyzeRunning(false)
          if (analyzeProgress && analyzeProgress.completed > 0) {
            toast.success(`Analyzed ${status.progress.completed} ads${status.progress.failed > 0 ? ` (${status.progress.failed} failed)` : ''}`)
            refetchAds()
            refetchComp()
          }
          setAnalyzeProgress(status.progress)
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
        setAnalyzeRunning(false)
      }
    }, 3000)
    return interval
  }, [id, analyzeProgress, refetchAds, refetchComp])

  // Check status on mount
  useEffect(() => {
    let interval
    const checkInitial = async () => {
      try {
        const status = await getCompetitorAnalyzeStatus(id)
        if (status.running) {
          setAnalyzeRunning(true)
          setAnalyzeProgress(status.progress)
          interval = pollAnalyzeStatus()
        } else {
          setAnalyzeProgress(status.progress)
        }
      } catch {}
    }
    checkInitial()
    return () => { if (interval) clearInterval(interval) }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyzeCompetitor = async () => {
    try {
      const res = await triggerCompetitorAnalyze(id)
      if (res.status === 'all_analyzed') {
        toast('All ads already analyzed', { icon: '✅' })
        return
      }
      if (res.status === 'already_running') {
        toast('Analysis already running', { icon: '⏳' })
        return
      }
      toast.success(`Analysis started for ${res.pending} pending ads`)
      setAnalyzeRunning(true)
      setAnalyzeProgress({ total: res.pending, completed: 0, failed: 0 })
      // Start polling
      const interval = pollAnalyzeStatus()
      // Store for cleanup
      window.__compAnalyzeInterval = interval
    } catch {
      toast.error('Failed to start analysis')
    }
  }

  const handleRunNow = () => {
    triggerMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Scrape started — checking progress...')
        // Start polling for completion
        const pollInterval = setInterval(async () => {
          try {
            const { getScrapeStatus } = await import('../../api/scraper')
            const status = await getScrapeStatus(id)
            if (status.status === 'completed') {
              clearInterval(pollInterval)
              toast.success(`Scraped ${status.ads_found} ads (${status.new_ads} new)`)
              // Refresh data
              window.location.reload()
            } else if (status.status === 'failed') {
              clearInterval(pollInterval)
              toast.error(`Scrape failed: ${status.error_message || 'check logs'}`)
            }
            // status === 'running' -> keep polling
          } catch {
            clearInterval(pollInterval)
          }
        }, 5000) // Poll every 5s
      },
      onError: () => toast.error('Failed to start scrape'),
    })
  }

  const handleAnalyze = (adId) => {
    analyzeMutation.mutate(adId, {
      onSuccess: () => toast.success('Analysis complete'),
      onError: () => toast.error('Analysis failed'),
    })
  }

  if (compLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-gray-50" />
          ))}
        </div>
      </div>
    )
  }

  if (!competitor && !isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-text-secondary">Competitor not found</p>
        <Link to="/scraper/competitors" className="mt-2 text-sm text-primary-600 hover:underline">
          Back to list
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/scraper/competitors"
          className="rounded-lg p-2 text-text-secondary hover:bg-gray-100"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary">{competitor.name}</h1>
          <p className="text-xs text-text-secondary">
            {competitor.query_type === 'page_id'
              ? `Page ID: ${competitor.page_id}`
              : `Keyword: ${competitor.query}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={competitor.meta_ad_library_url || (
              competitor.page_id
                ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=${competitor.page_id}`
                : `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${competitor.query}`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-2 text-xs font-medium text-text-secondary hover:bg-gray-50"
          >
            <ExternalLink size={14} />
            View in Ad Library
          </a>
          <Button
            variant="primary"
            size="md"
            icon={Play}
            onClick={handleRunNow}
            disabled={triggerMutation.isPending}
          >
            {triggerMutation.isPending ? 'Scraping...' : 'Run Now'}
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={analyzeRunning ? Loader2 : Brain}
            onClick={handleAnalyzeCompetitor}
            disabled={analyzeRunning}
            className={analyzeRunning ? '[&_svg]:animate-spin' : ''}
          >
            {analyzeRunning ? 'Analyzing...' : 'Analyze'}
          </Button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg border border-danger-200 p-2 text-danger-500 hover:bg-danger-50"
            title="Delete competitor"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-text-primary">Delete {competitor.name}?</h3>
            <p className="mt-2 text-xs text-text-secondary">
              This will permanently delete this competitor and all its ads, analyses, and scrape history. This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(id, {
                    onSuccess: () => {
                      toast.success(`${competitor.name} deleted`)
                      navigate('/scraper/competitors')
                    },
                    onError: () => toast.error('Failed to delete'),
                  })
                }}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-danger-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stat bar — 5 KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KPICard
          title="Total Ads"
          value={competitor.total_ads || 0}
          icon={BarChart3}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KPICard
          title="New (7d)"
          value={competitor.new_7d || 0}
          icon={Zap}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <KPICard
          title="Long-Running (3mo+)"
          value={competitor.long_running_3mo || 0}
          icon={Clock}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <KPICard
          title="Oldest Ad"
          value={`${competitor.oldest_ad_days || 0}d`}
          icon={Calendar}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <KPICard
          title="Avg Duration"
          value={`${competitor.avg_duration_days || 0}d`}
          icon={TrendingUp}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
      </div>

      {/* AI Insights Panel */}
      <CompetitorInsightsPanel competitorId={id} />

      {/* Per-competitor analyze progress bar */}
      {analyzeRunning && analyzeProgress && analyzeProgress.total > 0 && (
        <div className="rounded-card border border-primary-200 bg-primary-50/30 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={14} className="animate-spin text-primary-600" />
            <span className="text-xs font-semibold text-primary-700">Analyzing ads...</span>
          </div>
          <ProgressBar
            total={analyzeProgress.total}
            completed={analyzeProgress.completed}
            failed={analyzeProgress.failed}
          />
        </div>
      )}

      {/* Filter tabs + Patterns toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-border-default p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1) }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                filter === f.key
                  ? 'bg-primary-600 text-white'
                  : 'text-text-secondary hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowPatterns(!showPatterns)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            showPatterns
              ? 'bg-primary-50 text-primary-700'
              : 'border border-border-default text-text-secondary hover:bg-gray-50'
          }`}
        >
          <Filter size={13} />
          AI Patterns
        </button>
      </div>

      {/* AI Patterns panel (collapsible) */}
      {showPatterns && <AIPatternsPanel ads={ads} />}

      {/* Ads grid — Meta Ad Library style */}
      {adsLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-60 animate-pulse rounded-lg border border-border-default bg-gray-50" />
          ))}
        </div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-border-default bg-white py-16">
          <BarChart3 className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-text-secondary">No ads found</p>
          <p className="mt-1 text-xs text-text-secondary">Run a scrape to populate this view</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {ads.map((ad) => (
            <AdCard key={ad.id} ad={ad} onAnalyze={handleAnalyze} />
          ))}
        </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-text-secondary">
                Page {page} of {totalPages} ({totalAds} ads)
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
