import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/offers'

export const getOffersSummary  = ()       => USE_MOCKS ? mock(fx.offersSummary)     : client.get('/offers/summary').then((r) => r.data)
export const getOffersTypeDist = ()       => USE_MOCKS ? mock(fx.offersTypeDist)    : client.get('/offers/type-dist').then((r) => r.data)
export const getOffersPerf     = ()       => USE_MOCKS ? mock(fx.offersPerformance) : client.get('/offers/performance').then((r) => r.data)
export const getOffersTrend    = (params) => USE_MOCKS ? mock(fx.offersTrend)       : client.get('/offers/trend', { params }).then((r) => r.data)
export const getOffersList     = (params) => USE_MOCKS ? mock(fx.offersTable)       : client.get('/offers', { params }).then((r) => r.data)

export const listOffers = getOffersList
