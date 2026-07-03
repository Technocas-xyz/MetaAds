import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/ai-analysis'

export const getAISummary            = ()       => USE_MOCKS ? mock(fx.aiSummary)           : client.get('/ai-analysis/summary').then((r) => r.data)
export const getPerformanceTimeline  = (params) => USE_MOCKS ? mock(fx.performanceTimeline)  : client.get('/ai-analysis/timeline', { params }).then((r) => r.data)
export const getTopAnglesDonut       = ()       => USE_MOCKS ? mock(fx.topAnglesDonut)       : client.get('/ai-analysis/angles').then((r) => r.data)
export const getConfidenceDist       = ()       => USE_MOCKS ? mock(fx.confidenceDist)       : client.get('/ai-analysis/confidence-dist').then((r) => r.data)
export const getWinningAds           = (params) => USE_MOCKS ? mock(fx.winningAds)           : client.get('/ai-analysis/winning-ads', { params }).then((r) => r.data)
