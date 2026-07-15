import client, { USE_MOCKS, mock } from './transport'

// ── Competitor scraping endpoints ──────────────────────────────────────────────

export const listScraperCompetitors = () =>
  USE_MOCKS
    ? mock([])
    : client.get('/scraper/competitors').then((r) => r.data)

export const getScraperCompetitor = (id) =>
  USE_MOCKS
    ? mock(null)
    : client.get(`/scraper/competitors/${id}`).then((r) => r.data)

export const getCompetitorAds = (id, params = {}) =>
  USE_MOCKS
    ? mock({ data: [], total: 0, page: 1, per_page: 20, total_pages: 0 })
    : client.get(`/scraper/competitors/${id}/ads`, { params }).then((r) => r.data)

export const triggerScrape = (id) =>
  USE_MOCKS
    ? mock({ status: 'started' })
    : client.post(`/scraper/competitors/${id}/scrape`).then((r) => r.data)

export const getScrapeStatus = (id) =>
  USE_MOCKS
    ? mock({ status: 'completed', ads_found: 0, new_ads: 0 })
    : client.get(`/scraper/competitors/${id}/scrape-status`).then((r) => r.data)

export const analyzeAd = (adId) =>
  USE_MOCKS
    ? mock({ status: 'analyzed' })
    : client.post(`/scraper/ads/${adId}/analyze`).then((r) => r.data)

export const listRecentRuns = (params = {}) =>
  USE_MOCKS
    ? mock([])
    : client.get('/scraper/runs', { params }).then((r) => r.data)

export const triggerScrapeAll = () =>
  USE_MOCKS
    ? mock({ status: 'started' })
    : client.post('/scraper/scrape-all').then((r) => r.data)

export const getScrapeAllStatus = () =>
  USE_MOCKS
    ? mock({ running: false, progress: {}, job: {} })
    : client.get('/scraper/scrape-all/status').then((r) => r.data)

export const pauseScrapeAll = () => client.post('/scraper/scrape-all/pause').then((r) => r.data)
export const resumeScrapeAll = () => client.post('/scraper/scrape-all/resume').then((r) => r.data)
export const stopScrapeAll = () => client.post('/scraper/scrape-all/stop').then((r) => r.data)

export const triggerAnalyzeAll = () =>
  USE_MOCKS
    ? mock({ status: 'started' })
    : client.post('/scraper/analyze-all').then((r) => r.data)

export const getAnalyzeAllStatus = () =>
  USE_MOCKS
    ? mock({ running: false, progress: {}, job: {} })
    : client.get('/scraper/analyze-all/status').then((r) => r.data)

export const pauseAnalyzeAll = () => client.post('/scraper/analyze-all/pause').then((r) => r.data)
export const resumeAnalyzeAll = () => client.post('/scraper/analyze-all/resume').then((r) => r.data)
export const stopAnalyzeAll = () => client.post('/scraper/analyze-all/stop').then((r) => r.data)

export const triggerCompetitorAnalyze = (id) =>
  USE_MOCKS
    ? mock({ status: 'started' })
    : client.post(`/scraper/competitors/${id}/analyze`).then((r) => r.data)

export const getCompetitorAnalyzeStatus = (id) =>
  USE_MOCKS
    ? mock({ running: false, progress: {}, totals: {} })
    : client.get(`/scraper/competitors/${id}/analyze-status`).then((r) => r.data)

export const deleteCompetitor = (id) =>
  client.delete(`/scraper/competitors/${id}`).then((r) => r.data)

export const getScheduleStatus = () =>
  client.get('/scraper/schedule/status').then((r) => r.data)

export const toggleSchedule = (enabled) =>
  client.post('/scraper/schedule/toggle', { enabled }).then((r) => r.data)
