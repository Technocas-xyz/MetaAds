import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/angles'

export const getAnglesSummary  = (params) => USE_MOCKS ? mock(fx.anglesSummary)     : client.get('/angles/summary',     { params }).then((r) => r.data)
export const getAnglesTypeDist = (params) => USE_MOCKS ? mock(fx.anglesTypeDist)    : client.get('/angles/type-dist',   { params }).then((r) => r.data)
export const getAnglesPerf     = (params) => USE_MOCKS ? mock(fx.anglesPerformance) : client.get('/angles/performance', { params }).then((r) => r.data)
export const getAnglesTrend    = (params) => USE_MOCKS ? mock(fx.anglesTrend)       : client.get('/angles/trend',       { params }).then((r) => r.data)
export const getAnglesList     = (params) => USE_MOCKS ? mock(fx.anglesTable)       : client.get('/angles',             { params }).then((r) => r.data)
export const getAnglesFilterOptions = ()  => client.get('/angles/filter-options').then((r) => r.data)

export const listAngles = getAnglesList
