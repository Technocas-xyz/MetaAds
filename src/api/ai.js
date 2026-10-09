import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/ads'

export const analyzeAd = (id) =>
  USE_MOCKS
    ? mock(fx.analysisResult)
    : client.post(`/competitor-ads/${id}/analyze`).then((r) => r.data)

export const bulkAnalyze = (adIds) =>
  USE_MOCKS
    ? mock(fx.bulkAnalysisResult)
    : client.post('/competitor-ads/bulk-analyze', { ad_ids: adIds }).then((r) => r.data)

export const rerunLowConfidence = () =>
  USE_MOCKS
    ? mock({ queued: 0 })
    : client.post('/competitor-ads/rerun-low-confidence').then((r) => r.data)
