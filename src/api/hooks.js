import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/hooks'

export const getHooksSummary  = (params) => USE_MOCKS ? mock(fx.hooksSummary)     : client.get('/hooks/summary',     { params }).then((r) => r.data)
export const getHooksTypeDist = (params) => USE_MOCKS ? mock(fx.hooksTypeDist)    : client.get('/hooks/type-dist',   { params }).then((r) => r.data)
export const getHooksPerf     = (params) => USE_MOCKS ? mock(fx.hooksPerformance) : client.get('/hooks/performance', { params }).then((r) => r.data)
export const getHooksTrend    = (params) => USE_MOCKS ? mock(fx.hooksTrend)       : client.get('/hooks/trend',       { params }).then((r) => r.data)
export const getHooksList     = (params) => USE_MOCKS ? mock(fx.hooksTable)       : client.get('/hooks',             { params }).then((r) => r.data)
export const getHooksFilterOptions = ()  => client.get('/hooks/filter-options').then((r) => r.data)

export const listHooks = getHooksList
