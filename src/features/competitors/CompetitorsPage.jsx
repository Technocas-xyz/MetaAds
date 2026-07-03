import { useState, useMemo } from 'react'
import { Plus, Upload } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import CompetitorKPIs from './components/CompetitorKPIs'
import FilterBar from './components/FilterBar'
import CompetitorsTable from './components/CompetitorsTable'
import AddCompetitorModal from './components/AddCompetitorModal'
import { useCompetitors, useCompetitorsSummary } from '../../hooks/queries/useCompetitors'

const EMPTY_FILTERS = { dateRange: null, status: '', priorityTier: '', niche: '' }

export default function CompetitorsPage() {
  const [modalOpen, setModalOpen]   = useState(false)
  const [filters,   setFilters]     = useState(EMPTY_FILTERS)
  const [page,      setPage]        = useState(1)
  const [perPage,   setPerPage]     = useState(7)

  const { data: competitors = [], isLoading }         = useCompetitors()
  const { data: summary,         isLoading: kpiLoading } = useCompetitorsSummary()

  // Client-side filter + paginate (mock mode; real mode pushes params to API)
  const filtered = useMemo(() => {
    let list = competitors
    if (filters.status)      list = list.filter((c) => c.status === filters.status)
    if (filters.priorityTier) list = list.filter((c) => c.priority_tier === filters.priorityTier)
    if (filters.niche)       list = list.filter((c) => c.niches.includes(filters.niche))
    return list
  }, [competitors, filters])

  const total  = filtered.length
  const paged  = filtered.slice((page - 1) * perPage, page * perPage)

  const handleFilterChange = (next) => { setFilters(next); setPage(1) }
  const handleClearFilters = ()     => { setFilters(EMPTY_FILTERS); setPage(1) }
  const handlePerPage      = (n)    => { setPerPage(n); setPage(1) }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Competitors"
          subtitle="Manage and analyze your competitor list and their ad performance"
          rightSlot={
            <div className="flex items-center gap-2">
              <Button variant="outline" icon={Upload} size="md">
                Import Competitors
              </Button>
              <Button variant="primary" icon={Plus} size="md" onClick={() => setModalOpen(true)}>
                Add Competitor
              </Button>
            </div>
          }
        />

        {/* KPI row */}
        <CompetitorKPIs summary={summary} isLoading={kpiLoading} />

        {/* Filter bar */}
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />

        {/* Data table */}
        <CompetitorsTable
          competitors={paged}
          isLoading={isLoading}
          page={page}
          perPage={perPage}
          total={total}
          onPage={setPage}
          onPerPage={handlePerPage}
        />
      </div>

      <AddCompetitorModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
