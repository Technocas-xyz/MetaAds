import client, { USE_MOCKS, mock } from './transport'
import * as fx from './_fixtures/competitors'

export const listCompetitors = () =>
  USE_MOCKS
    ? mock(fx.competitorsList)
    : client.get('/competitors').then((r) => r.data)

export const getCompetitor = (id) =>
  USE_MOCKS
    ? mock(fx.competitor)
    : client.get(`/competitors/${id}`).then((r) => r.data)

export const createCompetitor = (data) =>
  USE_MOCKS
    ? mock(fx.competitor)
    : client.post('/competitors', data).then((r) => r.data)

export const getCompetitorsSummary = () =>
  USE_MOCKS
    ? mock(fx.competitorsSummary)
    : client.get('/competitors/summary').then((r) => r.data)
