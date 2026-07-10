import client, { USE_MOCKS, mock } from './transport'

export const getCompetitorInsights = (id) =>
  USE_MOCKS
    ? mock(null)
    : client.get(`/insights/competitors/${id}`).then((r) => r.data)

export const getAllCompetitorInsights = () =>
  USE_MOCKS
    ? mock([])
    : client.get('/insights/competitors').then((r) => r.data)

export const getOverallInsights = () =>
  USE_MOCKS
    ? mock(null)
    : client.get('/insights/overall').then((r) => r.data)

export const getCompetitorAnalyzedAds = (id, params) =>
  USE_MOCKS
    ? mock({ data: [], meta: { total: 0, page: 1, per_page: 20, total_pages: 0 } })
    : client.get(`/insights/competitors/${id}/ads`, { params }).then((r) => r.data)
