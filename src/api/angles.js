import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/angles'

export const getAnglesSummary  = ()       => USE_MOCKS ? mock(fx.anglesSummary)     : client.get('/angles/summary').then((r) => r.data)
export const getAnglesTypeDist = ()       => USE_MOCKS ? mock(fx.anglesTypeDist)    : client.get('/angles/type-dist').then((r) => r.data)
export const getAnglesPerf     = ()       => USE_MOCKS ? mock(fx.anglesPerformance) : client.get('/angles/performance').then((r) => r.data)
export const getAnglesTrend    = (params) => USE_MOCKS ? mock(fx.anglesTrend)       : client.get('/angles/trend', { params }).then((r) => r.data)
export const getAnglesList     = (params) => USE_MOCKS ? mock(fx.anglesTable)       : client.get('/angles', { params }).then((r) => r.data)

export const listAngles = getAnglesList
