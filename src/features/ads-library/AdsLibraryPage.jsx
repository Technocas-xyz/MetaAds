import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useAds, useAdsSummary } from '../../hooks/queries/useAds'
import { useAnalyzeAd, useBulkAnalyze } from '../../hooks/queries/useAI'
import { useDebounce } from '../../hooks/useDebounce'
import { useCompetitors } from '../../hooks/queries/useCompetitors'
import AdsKPIs from './components/AdsKPIs'
import AdsFilterBar from './components/AdsFilterBar'
import BulkActionBar from './components/BulkActionBar'
import AdsTable from './components/AdsTable'
import AdPreviewModal from './components/AdPreviewModal'

const PER_PAGE = 10

// ── URL param ↔ filter object ──────────────────────────────────────────────────
function paramsToFilters(sp) {
  return {
    competitor: sp.get('competitor') ?? '',
    hook_type:  sp.get('hook_type')  ?? '',
    angle:      sp.get('angle')      ?? '',
    offer:      sp.get('offer')      ?? '',
    confidence: sp.get('confidence') ?? '',
    format:     sp.get('format')     ?? '',
    dateRange:  sp.get('dateRange')  ?? '',
    search:     sp.get('search')     ?? '',
  }
}

// ── Client-side filter (mock mode) ────────────────────────────────────────────
function applyFilters(ads, filters) {
  const q = filters.search.toLowerCase()
  return ads.filter((ad) => {
    if (q && !ad.headline.toLowerCase().includes(q) && !ad.primary_text.toLowerCase().includes(q)) return false
    if (filters.competitor && ad.competitor.name !== filters.competitor) return false
    if (filters.hook_type  && ad.hook_type  !== filters.hook_type)  return false
    if (filters.angle      && ad.angle      !== filters.angle)      return false
    if (filters.offer      && ad.offer_type !== filters.offer)      return false
    if (filters.confidence) {
      const level = ad.confidence_score >= 70 ? 'High' : ad.confidence_score >= 40 ? 'Medium' : 'Low'
      if (level !== filters.confidence) return false
    }
    return true
  })
}

export default function AdsLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Filter state — lives in URL ────────────────────────────────────────────
  const filters = paramsToFilters(searchParams)
  const [localSearch, setLocalSearch] = useState(filters.search)
  const debouncedSearch = useDebounce(localSearch, 300)

  // Push debounced search into URL
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (debouncedSearch) next.set('search', debouncedSearch)
      else next.delete('search')
      next.delete('page')
      return next
    }, { replace: true })
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync URL search back to local input when navigating back
  useEffect(() => {
    if (filters.search !== localSearch) setLocalSearch(filters.search)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    setLocalSearch('')
    setSearchParams((prev) => {
      const next = new URLSearchParams()
      // preserve only non-filter params
      for (const [k, v] of prev) {
        if (!['competitor', 'hook_type', 'angle', 'offer', 'confidence', 'format', 'dateRange', 'search', 'page'].includes(k)) {
          next.set(k, v)
        }
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  // ── Pagination state — URL ─────────────────────────────────────────────────
  const page    = Number(searchParams.get('page') ?? 1)
  const perPage = Number(searchParams.get('per_page') ?? PER_PAGE)

  const setPage = useCallback((p) => {
    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('page', p); return n }, { replace: true })
  }, [setSearchParams])

  const setPerPage = useCallback((pp) => {
    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('per_page', pp); n.set('page', 1); return n }, { replace: true })
  }, [setSearchParams])

  // ── Data fetching ──────────────────────────────────────────────────────────
  const queryParams = useMemo(() => ({
    ...filters,
    page,
    per_page: perPage,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  }), [filters, page, perPage, debouncedSearch])

  const { data: adsData, isLoading: adsLoading } = useAds(queryParams)
  const { data: summary, isLoading: summaryLoading } = useAdsSummary()
  const { data: competitorsData } = useCompetitors()

  const analyzeAd   = useAnalyzeAd()
  const bulkAnalyze = useBulkAnalyze()

  // ── Use server-side pagination ─────────────────────────────────────────────
  const paged  = adsData?.data ?? []
  const total  = adsData?.meta?.total ?? 0

  // ── Row selection ──────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set())

  const selectOne = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  // Clear selection when page changes
  useEffect(() => { clearSelection() }, [page, perPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preview modal ──────────────────────────────────────────────────────────
  const [previewAd, setPreviewAd] = useState(null)

  // ── Bulk delete confirm ────────────────────────────────────────────────────
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const handleBulkDelete = () => {
    toast.success(`${selectedIds.size} ad${selectedIds.size !== 1 ? 's' : ''} deleted`)
    clearSelection()
    setBulkDeleteOpen(false)
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const handleBulkAnalyze = () => {
    bulkAnalyze.mutate([...selectedIds])
    clearSelection()
  }

  const handleBulkExport = () => {
    const selected = filtered.filter((a) => selectedIds.has(a.id))
    const json = JSON.stringify(selected, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'ads-export.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const competitors = competitorsData?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ads Library"
        subtitle="Browse, analyze, and manage all captured competitor ads"
        rightSlot={
          <Button variant="primary" icon={Plus} to="/ads/new">
            Add New Ad
          </Button>
        }
      />

      {/* KPIs */}
      <AdsKPIs summary={summary} isLoading={summaryLoading} />

      {/* Filter bar */}
      <AdsFilterBar
        searchInput={localSearch}
        onSearchChange={(v) => { setLocalSearch(v) }}
        filters={filters}
        onFilterChange={setFilter}
        onClearAll={clearFilters}
        competitors={competitors}
      />

      {/* Bulk action bar */}
      <BulkActionBar
        count={selectedIds.size}
        onAnalyze={handleBulkAnalyze}
        onReview={() => {}}
        onExport={handleBulkExport}
        onDelete={() => setBulkDeleteOpen(true)}
        onClear={clearSelection}
      />

      {/* Data table */}
      <AdsTable
        ads={paged}
        isLoading={adsLoading}
        selectedIds={selectedIds}
        onSelectOne={selectOne}
        onSelectAll={selectAll}
        onClearAll={clearSelection}
        page={page}
        perPage={perPage}
        total={total}
        onPage={setPage}
        onPerPage={setPerPage}
        onPreview={setPreviewAd}
      />

      {/* Preview modal */}
      <AdPreviewModal
        ad={previewAd}
        open={!!previewAd}
        onClose={() => setPreviewAd(null)}
        onAnalyze={(id) => analyzeAd.mutate(id)}
        onReview={() => {}}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedIds.size} ad${selectedIds.size !== 1 ? 's' : ''}?`}
        description="The selected ads will be permanently removed from your library. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        onConfirm={handleBulkDelete}
      />
    </div>
  )
}
