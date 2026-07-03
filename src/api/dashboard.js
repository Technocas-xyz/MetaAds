import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/dashboard'

export const getDashboardSummary = () =>
  USE_MOCKS
    ? mock(fx.summary)
    : client.get('/dashboard/summary').then((r) => r.data)

export const getDashboardHooks = () =>
  USE_MOCKS
    ? mock(fx.topHooks)
    : client.get('/dashboard/hooks').then((r) => r.data)

export const getDashboardAngles = () =>
  USE_MOCKS
    ? mock(fx.topAngles)
    : client.get('/dashboard/angles').then((r) => r.data)

export const getDashboardOffers = () =>
  USE_MOCKS
    ? mock(fx.topOffers)
    : client.get('/dashboard/offers').then((r) => r.data)
