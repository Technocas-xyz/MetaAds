import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/hooks'

export const getHooksSummary  = ()       => USE_MOCKS ? mock(fx.hooksSummary)     : client.get('/hooks/summary').then((r) => r.data)
export const getHooksTypeDist = ()       => USE_MOCKS ? mock(fx.hooksTypeDist)    : client.get('/hooks/type-dist').then((r) => r.data)
export const getHooksPerf     = ()       => USE_MOCKS ? mock(fx.hooksPerformance) : client.get('/hooks/performance').then((r) => r.data)
export const getHooksTrend    = (params) => USE_MOCKS ? mock(fx.hooksTrend)       : client.get('/hooks/trend', { params }).then((r) => r.data)
export const getHooksList     = (params) => USE_MOCKS ? mock(fx.hooksTable)       : client.get('/hooks', { params }).then((r) => r.data)

export const listHooks = getHooksList
