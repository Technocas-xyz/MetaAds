import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/ads'

export const analyzeAd = (id) =>
  USE_MOCKS
    ? mock(fx.analysisResult)
    : client.post(`/ads/${id}/analyze`).then((r) => r.data)

export const bulkAnalyze = (body) =>
  USE_MOCKS
    ? mock(fx.bulkAnalysisResult)
    : client.post('/ads/bulk-analyze', body).then((r) => r.data)
