import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/offers'

export const getOffersSummary  = (params) => USE_MOCKS ? mock(fx.offersSummary)     : client.get('/offers/summary',     { params }).then((r) => r.data)
export const getOffersTypeDist = (params) => USE_MOCKS ? mock(fx.offersTypeDist)    : client.get('/offers/type-dist',   { params }).then((r) => r.data)
export const getOffersPerf     = (params) => USE_MOCKS ? mock(fx.offersPerformance) : client.get('/offers/performance', { params }).then((r) => r.data)
export const getOffersTrend    = (params) => USE_MOCKS ? mock(fx.offersTrend)       : client.get('/offers/trend',       { params }).then((r) => r.data)
export const getOffersList     = (params) => USE_MOCKS ? mock(fx.offersTable)       : client.get('/offers',             { params }).then((r) => r.data)
export const getOffersFilterOptions = ()  => client.get('/offers/filter-options').then((r) => r.data)

export const listOffers = getOffersList
