import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ExternalLink, Play, Clock, TrendingUp, Users, Zap, PlayCircle, Plus, Brain, Loader2 } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import KPICard from '../../components/ui/KPICard'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ProgressBar from '../../components/ui/ProgressBar'
import AddCompetitorModal from '../competitors/components/AddCompetitorModal'
import ScheduleStatusBar from './components/ScheduleStatusBar'
import { useScraperCompetitors, useTriggerScrape, useTriggerScrapeAll, useTriggerAnalyzeAll } from '../../hooks/queries/useScraper'
import { getScrapeAllStatus, getAnalyzeAllStatus } from '../../api/scraper'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

export default function ScraperCompetitorsPage() {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()

  // Progress state for batch operations
  const [scrapeAllRunning, setScrapeAllRunning] = useState(false)
  const [scrapeAllProgress, setScrapeAllProgress] = useState(null)
  const [analyzeAllRunning, setAnalyzeAllRunning] = useState(false)
  const [analyzeAllProgress, setAnalyzeAllProgress] = useState(null)

  const { data: competitors = [], isLoading, refetch } = useScraperCompetitors()
  const triggerMutation = useTriggerScrape()
  const scrapeAllMutation = useTriggerScrapeAll()
  const analyzeAllMutation = useTriggerAnalyzeAll()

  // ─── Polling for Scrape All progress ────────────────────────────────────
  const pollScrapeAll = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        const status = await getScrapeAllStatus()
        if (status.running) {
          setScrapeAllRunning(true)
          setScrapeAllProgress(status.progress)
        } else {
          setScrapeAllRunning(false)
          if (scrapeAllProgress && scrapeAllProgress.completed > 0) {
            toast.success(`Scrape complete: ${status.progress.completed} competitors done${status.progress.failed > 0 ? `, ${status.progress.failed} failed` : ''}`)
            refetch()
          }
          setScrapeAllProgress(status.progress)
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
        setScrapeAllRunning(false)
      }
    }, 4000)
    return interval
  }, [scrapeAllProgress, refetch])

  // ─── Polling for Analyze All progress ───────────────────────────────────
  const pollAnalyzeAll = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        const status = await getAnalyzeAllStatus()
        if (status.running) {
          setAnalyzeAllRunning(true)
          setAnalyzeAllProgress(status.progress)
        } else {
          setAnalyzeAllRunning(false)
          if (analyzeAllProgress && analyzeAllProgress.completed > 0) {
            toast.success(`Analysis complete: ${status.progress.completed} ads analyzed${status.progress.failed > 0 ? `, ${status.progress.failed} failed` : ''}`)
            refetch()
          }
          setAnalyzeAllProgress(status.progress)
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
        setAnalyzeAllRunning(false)
      }
    }, 4000)
    return interval
  }, [analyzeAllProgress, refetch])

  // ─── Check status on mount (resume if job was running) ──────────────────
  useEffect(() => {
    let scrapeInterval, analyzeInterval
    const checkInitial = async () => {
      try {
        const scrapeStatus = await getScrapeAllStatus()
        if (scrapeStatus.running) {
          setScrapeAllRunning(true)
          setScrapeAllProgress(scrapeStatus.progress)
          scrapeInterval = pollScrapeAll()
        }
      } catch {}
      try {
        const analyzeStatus = await getAnalyzeAllStatus()
        if (analyzeStatus.running) {
          setAnalyzeAllRunning(true)
          setAnalyzeAllProgress(analyzeStatus.progress)
          analyzeInterval = pollAnalyzeAll()
        }
      } catch {}
    }
    checkInitial()
    return () => {
      if (scrapeInterval) clearInterval(scrapeInterval)
      if (analyzeInterval) clearInterval(analyzeInterval)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Computed KPIs
  const kpis = useMemo(() => {
    const totalActive = competitors.reduce((sum, c) => sum + (c.total_active_ads || 0), 0)
    const totalNew7d = competitors.reduce((sum, c) => sum + (c.new_7d || 0), 0)
    const totalLongRunning = competitors.reduce((sum, c) => sum + (c.long_running_3mo || 0), 0)
    return { totalActive, totalNew7d, totalLongRunning, totalCompetitors: competitors.length }
  }, [competitors])

  // Filter + sort
  const filtered = useMemo(() => {
    let list = competitors
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'ads') return (b.total_active_ads || 0) - (a.total_active_ads || 0)
      if (sortBy === 'new') return (b.new_7d || 0) - (a.new_7d || 0)
      if (sortBy === 'last_run') {
        if (!a.last_run) return 1
        if (!b.last_run) return -1
        return new Date(b.last_run) - new Date(a.last_run)
      }
      return 0
    })
  }, [competitors, search, sortBy])

  const handleScrape = (e, competitorId) => {
    e.stopPropagation()
    triggerMutation.mutate(competitorId, {
      onSuccess: (data) => {
        toast.success(`Scrape complete: ${data.ads_found} ads found, ${data.new_ads} new`)
      },
      onError: () => toast.error('Scrape failed — check logs'),
    })
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Ad Scraper"
        subtitle="Monitor competitor ads from Meta Ad Library — auto-scraped daily"
        rightSlot={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              icon={Plus}
              onClick={() => setModalOpen(true)}
            >
              Add Competitor
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={analyzeAllRunning ? Loader2 : Brain}
              onClick={() => {
                analyzeAllMutation.mutate(undefined, {
                  onSuccess: (data) => {
                    if (data.status === 'already_running') {
                      toast('Analysis already running', { icon: '⏳' })
                    } else {
                      toast.success('Batch analysis started!')
                      setAnalyzeAllRunning(true)
                      setAnalyzeAllProgress({ total: 0, completed: 0, failed: 0 })
                      pollAnalyzeAll()
                    }
                  },
                  onError: () => toast.error('Failed to start analysis'),
                })
              }}
              disabled={analyzeAllMutation.isPending || analyzeAllRunning}
              className={analyzeAllRunning ? '[&_svg]:animate-spin' : ''}
            >
              {analyzeAllRunning ? 'Analyzing...' : 'Analyze All'}
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={scrapeAllRunning ? Loader2 : PlayCircle}
              onClick={() => {
                scrapeAllMutation.mutate(undefined, {
                  onSuccess: (data) => {
                    if (data.status === 'already_running') {
                      toast('Batch already running — check progress', { icon: '⏳' })
                    } else {
                      toast.success('Batch scrape started!')
                      setScrapeAllRunning(true)
                      setScrapeAllProgress({ total: 0, completed: 0, failed: 0 })
                      pollScrapeAll()
                    }
                  },
                  onError: () => toast.error('Failed to start batch scrape'),
                })
              }}
              disabled={scrapeAllMutation.isPending || scrapeAllRunning}
              className={scrapeAllRunning ? '[&_svg]:animate-spin' : ''}
            >
              {scrapeAllRunning ? 'Scraping...' : 'Scrape All'}
            </Button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Competitors"
          value={kpis.totalCompetitors}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KPICard
          title="Total Active Ads"
          value={kpis.totalActive}
          icon={TrendingUp}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <KPICard
          title="New (7d)"
          value={kpis.totalNew7d}
          icon={Zap}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <KPICard
          title="Long-Running (3mo+)"
          value={kpis.totalLongRunning}
          icon={Clock}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Schedule status bar */}
      <ScheduleStatusBar />

      {/* Progress bars for batch operations */}
      {scrapeAllRunning && scrapeAllProgress && (
        <div className="rounded-card border border-blue-200 bg-blue-50/30 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={14} className="animate-spin text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">Scraping all competitors...</span>
          </div>
          <ProgressBar
            total={scrapeAllProgress.total}
            completed={scrapeAllProgress.completed}
            failed={scrapeAllProgress.failed}
            current={scrapeAllProgress.current}
          />
        </div>
      )}
      {analyzeAllRunning && analyzeAllProgress && (
        <div className="rounded-card border border-purple-200 bg-purple-50/30 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={14} className="animate-spin text-purple-600" />
            <span className="text-xs font-semibold text-purple-700">Analyzing all pending ads...</span>
          </div>
          <ProgressBar
            total={analyzeAllProgress.total}
            completed={analyzeAllProgress.completed}
            failed={analyzeAllProgress.failed}
          />
        </div>
      )}

      {/* Search + Sort bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search competitors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-white py-2 pl-10 pr-4 text-sm placeholder:text-text-secondary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Sort by:</span>
          {['name', 'ads', 'new', 'last_run'].map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                sortBy === s
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-text-secondary hover:bg-gray-100'
              }`}
            >
              {s === 'last_run' ? 'Last Scraped' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Competitors grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-card border border-border-default bg-gray-50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-border-default bg-white py-16">
          <Users className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-text-secondary">No competitors found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((comp) => (
            <div
              key={comp.id}
              onClick={() => navigate(`/scraper/competitors/${comp.id}`)}
              className="group cursor-pointer rounded-card border border-border-default bg-white p-5 shadow-card transition-all hover:border-primary-200 hover:shadow-card-hover"
            >
              {/* Top row: name + status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-600">
                    {comp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-primary-600">
                      {comp.name}
                    </h3>
                    <p className="text-xs text-text-secondary">
                      {comp.query_type === 'page_id' ? `Page ID: ${comp.page_id}` : `Query: ${comp.query}`}
                    </p>
                  </div>
                </div>
                <Badge color="green" size="xs">Active</Badge>
              </div>

              {/* Stats row */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-text-primary">{comp.total_active_ads || 0}</p>
                  <p className="text-[10px] text-text-secondary">Active Ads</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{comp.new_7d || 0}</p>
                  <p className="text-[10px] text-text-secondary">New (7d)</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-purple-600">{comp.long_running_3mo || 0}</p>
                  <p className="text-[10px] text-text-secondary">3mo+</p>
                </div>
              </div>

              {/* Footer: last scraped + actions */}
              <div className="mt-4 flex items-center justify-between border-t border-border-default pt-3">
                <p className="text-[10px] text-text-secondary">
                  {comp.last_run
                    ? `Scraped ${formatDistanceToNow(new Date(comp.last_run), { addSuffix: true })}`
                    : 'Never scraped'}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleScrape(e, comp.id)}
                    disabled={triggerMutation.isPending}
                    className="rounded p-1 text-text-secondary hover:bg-green-50 hover:text-green-600"
                    title="Run Now"
                  >
                    <Play size={14} />
                  </button>
                  <a
                    href={comp.meta_ad_library_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded p-1 text-text-secondary hover:bg-blue-50 hover:text-blue-600"
                    title="Open in Meta Ad Library"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    <AddCompetitorModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
